import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const updateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

async function checkColumnAccess(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: {
      list: { include: { members: { select: { id: true } } } },
    },
  });
  if (!column) return { column: null, allowed: false };
  const allowed = column.list.members.some((m) => m.id === userId);
  return { column, allowed };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { column, allowed } = await checkColumnAccess(id, userId);
  if (!column) return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.column.update({ where: { id }, data: parsed.data });
  getIO()?.to(`list:${column.listId}`).emit('column:updated', { column: updated, actorId: userId });
  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { column, allowed } = await checkColumnAccess(id, userId);
  if (!column) return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Cannot delete the last column
  const columnCount = await prisma.column.count({ where: { listId: column.listId } });
  if (columnCount <= 1) {
    return NextResponse.json({ error: 'Cannot delete the last column' }, { status: 400 });
  }

  // Move tasks to first remaining column
  const firstColumn = await prisma.column.findFirst({
    where: { listId: column.listId, id: { not: id } },
    orderBy: { position: 'asc' },
  });

  if (firstColumn) {
    await prisma.task.updateMany({
      where: { columnId: id },
      data: { columnId: firstColumn.id },
    });
  }

  const listId = column.listId;
  await prisma.column.delete({ where: { id } });
  getIO()?.to(`list:${listId}`).emit('column:deleted', { columnId: id, actorId: userId });
  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
