import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const LABEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16',
];

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

async function checkListMembership(listId: string, userId: string) {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: { members: { select: { id: true } } },
  });
  if (!list) return { list: null, isMember: false };
  return { list, isMember: list.members.some((m) => m.id === userId) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const { list, isMember } = await checkListMembership(listId, userId);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const labels = await prisma.label.findMany({ where: { listId } });
  return applyNewToken(NextResponse.json(labels), newAccessToken);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const { list, isMember } = await checkListMembership(listId, userId);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  if (!LABEL_COLORS.includes(parsed.data.color)) {
    return NextResponse.json(
      { error: 'Color must be one of the predefined palette colors' },
      { status: 400 },
    );
  }

  const label = await prisma.label.create({
    data: { name: parsed.data.name, color: parsed.data.color, listId },
  });

  getIO()?.to(`list:${listId}`).emit('label:created', { label, actorId: userId });
  return applyNewToken(NextResponse.json(label, { status: 201 }), newAccessToken);
}
