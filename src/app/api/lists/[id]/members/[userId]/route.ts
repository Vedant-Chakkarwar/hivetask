import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId: currentUserId, newAccessToken } = auth;
  const { id: listId, userId: targetUserId } = await params;

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: { members: { select: { id: true } } },
  });

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!list.members.some((m) => m.id === currentUserId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // User can remove themselves; creator can remove anyone
  const isCreator = list.createdById === currentUserId;
  const isSelf = targetUserId === currentUserId;

  if (!isSelf && !isCreator) {
    return NextResponse.json({ error: 'Only the creator can remove other members' }, { status: 403 });
  }

  // Prevent removing the creator entirely
  if (targetUserId === list.createdById && !isSelf) {
    return NextResponse.json({ error: 'Cannot remove the list creator' }, { status: 400 });
  }

  await prisma.taskList.update({
    where: { id: listId },
    data: { members: { disconnect: { id: targetUserId } } },
  });

  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
