import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ListTodo, CheckSquare, AlertCircle, Calendar, Plus } from 'lucide-react';

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalAssigned,
    completedToday,
    overdueCount,
    dueSoonCount,
    overdueTasks,
    dueTodayTasks,
    dueThisWeekTasks,
    myLists,
    recentNotifications,
  ] = await Promise.all([
    prisma.task.count({ where: { assignees: { some: { userId } }, status: { not: 'DONE' } } }),
    prisma.task.count({ where: { assignees: { some: { userId } }, status: 'DONE', updatedAt: { gte: startOfToday } } }),
    prisma.task.count({ where: { assignees: { some: { userId } }, status: { not: 'DONE' }, dueDate: { lt: startOfToday, not: null } } }),
    prisma.task.count({ where: { assignees: { some: { userId } }, status: { not: 'DONE' }, dueDate: { gte: startOfToday, lt: endOfWeek, not: null } } }),
    prisma.task.findMany({
      where: { assignees: { some: { userId } }, status: { not: 'DONE' }, dueDate: { lt: startOfToday, not: null } },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: { list: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    prisma.task.findMany({
      where: { assignees: { some: { userId } }, status: { not: 'DONE' }, dueDate: { gte: startOfToday, lt: endOfToday } },
      orderBy: { dueDate: 'asc' },
      include: { list: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    prisma.task.findMany({
      where: { assignees: { some: { userId } }, status: { not: 'DONE' }, dueDate: { gte: endOfToday, lt: endOfWeek } },
      orderBy: { dueDate: 'asc' },
      include: { list: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    prisma.taskList.findMany({
      where: { members: { some: { id: userId } } },
      select: {
        id: true, name: true, color: true, icon: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: { select: { id: true, name: true, avatarUrl: true, color: true } } },
    }),
  ]);

  return {
    summary: { totalAssigned, completedToday, overdueCount, dueSoonCount },
    overdueTasks,
    dueTodayTasks,
    dueThisWeekTasks,
    myLists: myLists.map((l) => ({ ...l, taskCount: l._count.tasks })),
    activityFeed: recentNotifications,
  };
}

function SummaryCard({
  value, label, Icon, bg, textColor, iconBg,
}: {
  value: number; label: string; Icon: React.ElementType;
  bg: string; textColor: string; iconBg: string;
}) {
  return (
    <div className={`${bg} rounded-card p-4 flex items-center gap-3`} style={{ borderRadius: '12px' }}>
      <div className={`${iconBg} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={textColor} />
      </div>
      <div>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

type TaskWithList = {
  id: string;
  title: string;
  dueDate: Date | null;
  list: { id: string; name: string; color: string; icon: string | null };
};

function TaskRow({ task }: { task: TaskWithList }) {
  return (
    <Link
      href={`/lists/${task.list.id}?task=${task.id}`}
      className="flex items-center gap-2.5 py-2 px-2 hover:bg-gray-50 rounded-button transition-colors group"
      style={{ borderRadius: '8px' }}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.list.color }} />
      <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-honey-600 transition-colors">
        {task.title}
      </span>
      <span className="text-xs text-gray-400 flex-shrink-0 ml-1 hidden sm:inline">
        {task.list.icon ?? '📋'} {task.list.name}
      </span>
      {task.dueDate && (
        <span className="text-xs text-gray-400 flex-shrink-0">
          {format(task.dueDate, 'MMM d')}
        </span>
      )}
    </Link>
  );
}

export default async function DashboardPage() {
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const data = await getDashboardData(userId);
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Welcome back, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              value={data.summary.totalAssigned}
              label="Assigned"
              Icon={ListTodo}
              bg="bg-blue-50" textColor="text-blue-600" iconBg="bg-blue-100"
            />
            <SummaryCard
              value={data.summary.completedToday}
              label="Completed Today"
              Icon={CheckSquare}
              bg="bg-emerald-50" textColor="text-emerald-600" iconBg="bg-emerald-100"
            />
            <SummaryCard
              value={data.summary.overdueCount}
              label="Overdue"
              Icon={AlertCircle}
              bg={data.summary.overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}
              textColor={data.summary.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}
              iconBg={data.summary.overdueCount > 0 ? 'bg-red-100' : 'bg-gray-100'}
            />
            <SummaryCard
              value={data.summary.dueSoonCount}
              label="Due This Week"
              Icon={Calendar}
              bg="bg-amber-50" textColor="text-amber-600" iconBg="bg-amber-100"
            />
          </div>

          {/* Overdue */}
          {data.overdueTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                <AlertCircle size={13} /> Overdue ({data.overdueTasks.length})
              </h2>
              <div className="space-y-0.5">
                {data.overdueTasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {data.dueTodayTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-600 mb-2">📅 Due Today ({data.dueTodayTasks.length})</h2>
              <div className="space-y-0.5">
                {data.dueTodayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {/* Due This Week */}
          {data.dueThisWeekTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 mb-2">📆 Due This Week ({data.dueThisWeekTasks.length})</h2>
              <div className="space-y-0.5">
                {data.dueThisWeekTasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {data.overdueTasks.length === 0 && data.dueTodayTasks.length === 0 && data.dueThisWeekTasks.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <CheckSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">All caught up! 🎉</p>
              <p className="text-xs mt-0.5">No tasks due this week</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* My Lists */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">My Lists</h2>
              <Link
                href="/lists"
                className="text-xs text-honey-600 hover:text-honey-700 font-medium flex items-center gap-1"
              >
                <Plus size={11} /> New List
              </Link>
            </div>
            <div className="space-y-2">
              {data.myLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-card hover:border-gray-200 transition-all"
                  style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  <span className="text-base mr-0.5">{list.icon ?? '📋'}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">{list.name}</span>
                  <span className="text-xs text-gray-400">{list.taskCount}</span>
                </Link>
              ))}
              {data.myLists.length === 0 && (
                <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-card" style={{ borderRadius: '12px' }}>
                  <p className="text-sm">No lists yet</p>
                  <Link href="/lists" className="text-xs text-honey-600 font-medium mt-1 inline-block">
                    Create your first list →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          {data.activityFeed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.activityFeed.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 py-1.5">
                    {item.actor ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: item.actor.color }}
                      >
                        {item.actor.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 leading-relaxed">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
