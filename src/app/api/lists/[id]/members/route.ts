import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  // Optional E2E key share for the new member (encrypted LEK)
  keyShare: z
    .object({
      encryptedLEK: z.string(),
      iv: z.string(),
      senderUserId: z.string().uuid(),
    })
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: { members: { select: { id: true } } },
  });

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (list.members.some((m) => m.id === parsed.data.userId)) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  const updated = await prisma.taskList.update({
    where: { id: listId },
    data: { members: { connect: { id: parsed.data.userId } } },
    include: { members: { select: { id: true, name: true, email: true, avatarUrl: true, color: true } } },
  });

  // Store encrypted LEK for the new member if provided
  if (parsed.data.keyShare) {
    const { encryptedLEK, iv, senderUserId } = parsed.data.keyShare;
    await prisma.listKeyShare.upsert({
      where: { listId_userId: { listId, userId: parsed.data.userId } },
      update: { encryptedLEK, iv, senderUserId },
      create: { listId, userId: parsed.data.userId, encryptedLEK, iv, senderUserId },
    });
  }

  return applyNewToken(NextResponse.json(updated.members, { status: 201 }), newAccessToken);
}
