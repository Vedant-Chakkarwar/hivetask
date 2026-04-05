import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BoardView } from '@/components/board/BoardView';
import { TaskList } from '@/types';

export default async function BoardPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;

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

  if (!list) notFound();

  const isMember = list.members.some((m) => m.id === userId);
  if (!isMember) redirect('/lists');

  // Serialize dates for client components
  const serializedList: TaskList = {
    id: list.id,
    name: list.name,
    description: list.description,
    color: list.color,
    icon: list.icon,
    createdById: list.createdById,
    members: list.members,
    labels: list.labels,
    columns: list.columns.map((col) => ({
      id: col.id,
      name: col.name,
      position: col.position,
      color: col.color,
      listId: col.listId,
      tasks: col.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate?.toISOString() ?? null,
        position: task.position,
        listId: task.listId,
        columnId: task.columnId,
        assignees: task.assignees.map((a) => ({
          id: a.id,
          taskId: a.taskId,
          userId: a.userId,
          user: a.user,
          completed: a.completed,
          assignedAt: a.assignedAt.toISOString(),
        })),
        createdById: task.createdById,
        createdBy: task.createdBy,
        labels: task.labels,
        subtasks: task.subtasks,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    })),
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };

  return (
    <div className="h-full">
      <BoardView initialList={serializedList} currentUserId={userId} />
    </div>
  );
}
