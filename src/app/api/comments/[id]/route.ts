import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: commentId } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: { select: { listId: true } },
      author: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  if (comment.authorId !== userId) {
    return NextResponse.json({ error: 'Only the author can edit this comment' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: parsed.data.content },
    include: { author: { select: { id: true, name: true, avatarUrl: true, color: true } } },
  });

  getIO()?.to(`list:${comment.task.listId}`).emit('comment:updated', {
    comment: updated,
    taskId: comment.taskId,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: commentId } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: { select: { listId: true, createdById: true } },
    },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  if (comment.authorId !== userId && comment.task.createdById !== userId) {
    return NextResponse.json({ error: 'Only the author or task creator can delete this comment' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });

  getIO()?.to(`list:${comment.task.listId}`).emit('comment:deleted', {
    commentId,
    taskId: comment.taskId,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
