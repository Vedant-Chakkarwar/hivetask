import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { createNotification } from '@/lib/notifications';

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      list: { include: { members: { select: { id: true } } } },
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { content: parsed.data.content, taskId, authorId: userId },
    include: { author: { select: { id: true, name: true, avatarUrl: true, color: true } } },
  });

  // Notifications: COMMENTED for assignee + creator (if different from commenter)
  const notifyIds = new Set<string>();
  for (const a of task.assignees) {
    if (a.userId !== userId) notifyIds.add(a.userId);
  }
  if (task.createdById !== userId) notifyIds.add(task.createdById);
  for (const notifyUserId of notifyIds) {
    await createNotification({
      type: 'COMMENTED',
      message: `${comment.author.name} commented on "${task.title}"`,
      userId: notifyUserId,
      taskId,
      actorId: userId,
    });
  }

  // Parse @mentions: @Username patterns
  const mentionRegex = /@(\S+)/g;
  let match;
  while ((match = mentionRegex.exec(parsed.data.content)) !== null) {
    const mentionName = match[1].toLowerCase();
    const mentionedUser = task.list.members.find((m) => {
      // Find by matching user from full member list
      return false; // resolved below
    });
    void mentionedUser; // silence unused warning
  }
  // Re-fetch members with names to parse @mentions
  const membersWithNames = await prisma.taskList.findUnique({
    where: { id: task.listId },
    select: { members: { select: { id: true, name: true } } },
  });
  if (membersWithNames) {
    const mentionedNames = new Set<string>();
    let m2;
    const re2 = /@(\S+)/g;
    while ((m2 = re2.exec(parsed.data.content)) !== null) {
      mentionedNames.add(m2[1].toLowerCase());
    }
    for (const member of membersWithNames.members) {
      const firstName = member.name.split(' ')[0].toLowerCase();
      if (mentionedNames.has(firstName) && member.id !== userId) {
        await createNotification({
          type: 'MENTIONED',
          message: `${comment.author.name} mentioned you in "${task.title}"`,
          userId: member.id,
          taskId,
          actorId: userId,
        });
      }
    }
  }

  getIO()?.to(`list:${task.listId}`).emit('comment:added', {
    comment,
    taskId,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json(comment, { status: 201 }), newAccessToken);
}
