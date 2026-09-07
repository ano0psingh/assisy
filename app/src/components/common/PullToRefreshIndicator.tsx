import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 60,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const pastThreshold = pullDistance >= threshold;
  const rotation = pastThreshold ? 180 : (pullDistance / threshold) * 180;
  const opacity = Math.min(pullDistance / (threshold * 0.5), 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: pullDistance }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--action)] bg-[var(--action-soft)] shadow-[var(--shadow-soft)]"
        style={{ opacity }}
      >
        {isRefreshing ? (
          <Loader2 size={18} className="animate-spin text-[var(--action)]" />
        ) : (
          <ArrowDown
            size={18}
            className={`transition-transform duration-200 ${pastThreshold ? 'text-[var(--action)]' : 'text-[var(--ink-muted)]'}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
