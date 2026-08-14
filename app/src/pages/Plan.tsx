import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, FolderKanban } from 'lucide-react';
import { PageTabs, type PageTab } from '../components/ui/PageTabs';
import { Goals } from './Goals';
import { Projects } from './Projects';

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
];

export function Plan() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('view') === 'projects' ? 'projects' : 'goals';

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

  return (
    <div className="space-y-4">
      <PageTabs tabs={TABS} active={active} onChange={handleChange} label="Plan views" />
      {active === 'projects' ? <Projects /> : <Goals />}
    </div>
  );
}
