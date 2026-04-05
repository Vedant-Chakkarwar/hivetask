import { Skeleton } from './Skeleton';

function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-card p-3 border border-gray-100" style={{ borderRadius: '12px' }}>
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

function ColumnSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="ml-auto h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-2 min-h-[120px]">
        {Array.from({ length: cardCount }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      <ColumnSkeleton cardCount={3} />
      <ColumnSkeleton cardCount={2} />
      <ColumnSkeleton cardCount={4} />
    </div>
  );
}

export function ListViewSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-card p-3 border border-gray-100 flex items-center gap-3" style={{ borderRadius: '12px' }}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card p-4 border border-gray-100" style={{ borderRadius: '12px' }}>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      {/* Task list */}
      <div className="bg-white rounded-card border border-gray-100" style={{ borderRadius: '12px' }}>
        <div className="p-4 border-b border-gray-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
