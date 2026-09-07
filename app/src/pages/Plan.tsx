import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, FolderKanban, Repeat2 } from 'lucide-react';
import { PageTabs, type PageTab } from '../components/ui/PageTabs';
import { Goals } from './Goals';
import { Projects } from './Projects';
import { Habits } from './Habits';

/**
 * Goals and Projects as one destination.
 *
 * They were separate top-level entries in a nav of ten, which is more choices
 * than the app has distinct activities. The underlying `/goals` and `/projects`
 * routes still work, so existing links and search results are unaffected.
 */
const TABS: PageTab[] = [
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'habits', label: 'Habits', icon: Repeat2 },
];

export function Plan() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const active = requestedView === 'projects' || requestedView === 'habits'
    ? requestedView
    : 'goals';

  // Kept in the URL so the browser's back button steps between tabs and a
  // specific tab can be linked to.
  const handleChange = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('view', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const activePanel = active === 'projects'
    ? <Projects />
    : active === 'habits'
      ? <Habits />
      : <Goals />;

  return (
    <main className="space-y-0">
      <header className="border-y border-[var(--rule-strong)] py-4">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">Plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--ink-secondary)]">
          Set the direction, organize the work, and build the routines that keep it moving.
        </p>
      </header>
      <div className="border-b border-[var(--rule)] bg-[var(--surface-subtle)]">
        <PageTabs tabs={TABS} active={active} onChange={handleChange} label="Plan views" />
      </div>
      <section
        role="tabpanel"
        aria-label={`${TABS.find(tab => tab.id === active)?.label} plan`}
        className="bg-[var(--surface-raised)] px-3 py-5 sm:px-5"
      >
        {activePanel}
      </section>
    </main>
  );
}
