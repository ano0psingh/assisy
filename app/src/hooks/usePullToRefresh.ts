import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

const MAX_PULL = 120;

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (!containerRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 5) return;

      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || disabled || isRefreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      const dampened = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(dampened);
    },
    [disabled, isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, containerRef };
}
