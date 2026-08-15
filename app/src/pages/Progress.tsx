import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Trophy, ClipboardList } from 'lucide-react';
import { PageTabs, type PageTab } from '../components/ui/PageTabs';
import { WeeklyChallenges } from '../components/gamification/WeeklyChallenges';
import { Stats } from './Stats';
import { Achievements } from './Achievements';
import { WeeklyReview } from './WeeklyReview';

/**
 * Stats, Achievements and the weekly review as one destination.
 *
 * All three answer the same question — how am I doing — and were three separate
 * entries in the nav. The underlying `/stats`, `/achievements` and `/review`
 * routes still work.
 */
const TABS: PageTab[] = [
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'review', label: 'Review', icon: ClipboardList },
];

const VALID = new Set(TABS.map(tab => tab.id));

export function Progress() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('view') ?? '';
  const active = VALID.has(requested) ? requested : 'stats';

  const handleChange = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('view', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="space-y-4">
      <PageTabs tabs={TABS} active={active} onChange={handleChange} label="Progress views" />
      {active === 'achievements' && <Achievements />}
      {active === 'review' && <WeeklyReview />}
      {active === 'stats' && (
        <>
          <WeeklyChallenges />
          <Stats />
        </>
      )}
    </div>
  );
}
