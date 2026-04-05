import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).nullable().optional(),
});

async function getListAndCheckMembership(listId: string, userId: string) {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: {
      members: { select: { id: true, name: true, email: true, avatarUrl: true, color: true } },
      labels: true,
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              assignees: {
                include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
                orderBy: { assignedAt: 'asc' },
              },
              createdBy: { select: { id: true, name: true, avatarUrl: true, color: true } },
              labels: true,
              subtasks: { orderBy: { position: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!list) return { list: null, isMember: false, isCreator: false };

  const isMember = list.members.some((m) => m.id === userId);
  const isCreator = list.createdById === userId;

  return { list, isMember, isCreator };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { list, isMember } = await getListAndCheckMembership(id, userId);

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return applyNewToken(NextResponse.json(list), newAccessToken);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { list, isMember } = await getListAndCheckMembership(id, userId);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.taskList.update({
    where: { id },
    data: parsed.data,
  });

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { list, isCreator } = await getListAndCheckMembership(id, userId);
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!isCreator) return NextResponse.json({ error: 'Only the creator can delete this list' }, { status: 403 });

  await prisma.taskList.delete({ where: { id } });

  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
