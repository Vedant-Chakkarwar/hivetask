import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ListsClient } from './ListsClient';

export default async function ListsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  let userId: string | null = null;
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) userId = payload.userId;
  }
  if (!userId && refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) userId = payload.userId;
  }
  if (!userId) redirect('/login');

  const lists = await prisma.taskList.findMany({
    where: { members: { some: { id: userId } } },
    include: {
      members: { select: { id: true, name: true, avatarUrl: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatarUrl: true, color: true },
  });

  const serializedLists = lists.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    color: l.color,
    icon: l.icon,
    createdById: l.createdById,
    members: l.members,
    taskCount: l._count.tasks,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return <ListsClient initialLists={serializedLists} allUsers={allUsers} currentUserId={userId} />;
}
