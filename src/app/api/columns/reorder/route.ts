import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const reorderSchema = z.object({
  columns: z.array(z.object({ id: z.string(), position: z.number().int().min(0) })).min(1),
});

export const PUT = withAuth(async (req: NextRequest, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { columns } = parsed.data;
  const firstId = columns[0]?.id;
  if (!firstId) return NextResponse.json({ error: 'No columns provided' }, { status: 400 });

  // Check membership on the list of the first column
  const column = await prisma.column.findUnique({
    where: { id: firstId },
    include: { list: { include: { members: { select: { id: true } } } } },
  });

  if (!column) return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  if (!column.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction(
    columns.map(({ id, position }) => prisma.column.update({ where: { id }, data: { position } })),
  );

  getIO()?.to(`list:${column.listId}`).emit('columns:reordered', {
    columnIds: columns.map((c) => c.id),
    actorId: userId,
  });

  return NextResponse.json({ success: true });
});
