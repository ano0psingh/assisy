import { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, BarChart3, Trophy, ClipboardList } from 'lucide-react';
import { PageTabs, type PageTab } from '../components/ui/PageTabs';

const WeeklyReview = lazy(() => import('./WeeklyReview').then(module => ({ default: module.WeeklyReview })));
const Stats = lazy(() => import('./Stats').then(module => ({ default: module.Stats })));
const Achievements = lazy(() => import('./Achievements').then(module => ({ default: module.Achievements })));

/**
 * Stats, Achievements and the weekly review as one destination.
 *
 * All three answer the same question — how am I doing — and were three separate
 * entries in the nav. The underlying `/stats`, `/achievements` and `/review`
 * routes still work.
 */
const TABS: PageTab[] = [
  { id: 'review', label: 'Review', icon: ClipboardList },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];

const VALID = new Set(TABS.map(tab => tab.id));

export function Progress() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('view') ?? '';
  const active = VALID.has(requested) ? requested : 'review';

  const handleChange = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('view', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="space-y-5">
      <header className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)] px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <Archive className="mt-0.5 h-5 w-5 text-[var(--action)]" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">Progress desk</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">
              Review the week, read the record, and mark the milestones worth keeping.
            </p>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--rule)] pb-2">
        <PageTabs tabs={TABS} active={active} onChange={handleChange} label="Progress records" />
      </div>

      <Suspense fallback={<ProgressFallback label={TABS.find(tab => tab.id === active)?.label ?? 'Progress'} />}>
        {active === 'achievements' && <Achievements />}
        {active === 'review' && <WeeklyReview />}
        {active === 'stats' && <Stats />}
      </Suspense>
    </div>
  );
}

function ProgressFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={`Loading ${label}`} className="space-y-4">
      <span className="sr-only">Loading {label}…</span>
      <div className="animate-pulse border-y border-[var(--rule)] bg-[var(--surface-raised)] px-4 py-5 motion-reduce:animate-none">
        <div className="h-3 w-28 rounded bg-[var(--surface-inset)]" />
        <div className="mt-3 h-7 w-48 rounded bg-[var(--surface-subtle)]" />
      </div>
      <div className="animate-pulse space-y-3 border-b border-[var(--rule)] px-4 pb-5 motion-reduce:animate-none">
        <div className="h-3 w-full rounded bg-[var(--surface-subtle)]" />
        <div className="h-3 w-4/5 rounded bg-[var(--surface-subtle)]" />
        <div className="h-24 w-full rounded bg-[var(--surface-raised)]" />
      </div>
    </div>
  );
}
