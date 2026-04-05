import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

async function getLabelWithAccess(labelId: string, userId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: { list: { include: { members: { select: { id: true } } } } },
  });
  if (!label) return { label: null, allowed: false };
  const allowed = label.list.members.some((m) => m.id === userId);
  return { label, allowed };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { label, allowed } = await getLabelWithAccess(id, userId);
  if (!label) return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.label.update({ where: { id }, data: parsed.data });
  getIO()?.to(`list:${label.listId}`).emit('label:updated', { label: updated, actorId: userId });
  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { label, allowed } = await getLabelWithAccess(id, userId);
  if (!label) return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const listId = label.listId;
  await prisma.label.delete({ where: { id } });
  getIO()?.to(`list:${listId}`).emit('label:deleted', { labelId: id, actorId: userId });
  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
