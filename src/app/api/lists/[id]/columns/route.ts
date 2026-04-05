import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const createColumnSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: {
      members: { select: { id: true } },
      columns: { orderBy: { position: 'desc' }, take: 1 },
    },
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

  const parsed = createColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const maxPosition = list.columns[0]?.position ?? -1;

  const column = await prisma.column.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
      position: maxPosition + 1,
      listId,
    },
  });

  getIO()?.to(`list:${listId}`).emit('column:created', { column: { ...column, tasks: [] }, actorId: userId });
  return applyNewToken(NextResponse.json(column, { status: 201 }), newAccessToken);
}
