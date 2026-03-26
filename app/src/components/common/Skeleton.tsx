interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-bone ${className}`} />;
}

export function TaskCardSkeleton() {
  return (
    <div className="card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="flex items-center gap-2 pl-8">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card rounded-2xl p-4 space-y-2">
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-7 w-12 rounded" />
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="card rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function HabitRowSkeleton() {
  return (
    <div className="card rounded-2xl p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
    </div>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-5 w-full rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      {/* Task list */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded" />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

export function FeedPageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter bar */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
      {/* Article cards */}
      <FeedCardSkeleton />
      <FeedCardSkeleton />
      <FeedCardSkeleton />
      <FeedCardSkeleton />
      <FeedCardSkeleton />
    </div>
  );
}
