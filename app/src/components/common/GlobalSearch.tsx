import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, Target, FolderKanban, Calendar, ArrowRight, Newspaper, ListTodo } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useTaskContext } from '../../context/TaskContext';
import { useGoalContext } from '../../context/GoalContext';
import { useHabitContext } from '../../context/HabitContext';
import { useProjectContext } from '../../context/ProjectContext';
import { useFeed } from '../../context/FeedContext';

type SearchResult = {
  id: string;
  type: 'task' | 'goal' | 'habit' | 'project' | 'project_task' | 'feed';
  title: string;
  subtitle?: string;
  status?: string;
  route: string;
  /** Entity id the destination page should scroll to. Distinct from `id`,
   *  which is namespaced to stay unique across result types. */
  focusId: string;
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(open);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { tasks } = useTaskContext();
  const { goals } = useGoalContext();
  const { habits } = useHabitContext();
  const { projects, projectTasks, getProject, getSubProject } = useProjectContext();
  const { articles } = useFeed();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const items: SearchResult[] = [];

    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        items.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `${t.category} · ${t.status}`,
          status: t.status,
          route: '/tasks',
          focusId: t.id,
        });
      }
    });

    goals.forEach(g => {
      if (g.title.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)) {
        items.push({
          id: g.id,
          type: 'goal',
          title: g.title,
          subtitle: `${g.category} · ${g.status}`,
          status: g.status,
          route: '/goals',
          focusId: g.id,
        });
      }
    });

    habits.forEach(h => {
      if (h.name.toLowerCase().includes(q)) {
        items.push({
          id: h.id,
          type: 'habit',
          title: h.name,
          subtitle: `${h.category} · ${h.streakCount}d streak`,
          route: '/habits',
          focusId: h.id,
        });
      }
    });

    projects.forEach(p => {
      if (p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
        items.push({
          id: p.id,
          type: 'project',
          title: p.title,
          subtitle: p.status,
          status: p.status,
          route: '/projects',
          focusId: p.id,
        });
      }
    });

    projectTasks.forEach(pt => {
      if (pt.title.toLowerCase().includes(q) || pt.description?.toLowerCase().includes(q)) {
        const project = getProject(pt.projectId);
        const sub = getSubProject(pt.subProjectId);
        const subtitle = [project?.title, sub?.title].filter(Boolean).join(' → ');
        items.push({
          id: `pt-${pt.id}`,
          type: 'project_task',
          title: pt.title,
          subtitle: subtitle || 'Project task',
          status: pt.status,
          route: '/projects',
          focusId: pt.id,
        });
      }
    });

    articles.forEach(a => {
      const title = a.title ?? '';
      const summary = a.summary ?? '';
      if (title.toLowerCase().includes(q) || summary.toLowerCase().includes(q)) {
        items.push({
          id: a.id,
          type: 'feed',
          title: title || 'Untitled article',
          subtitle: a.author ?? undefined,
          route: '/feed',
          focusId: a.id,
        });
      }
    });

    return items.slice(0, 14);
  }, [query, tasks, goals, habits, projects, projectTasks, getProject, getSubProject, articles]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    // The destination page reads `focus` and scrolls the item into view.
    navigate(`${result.route}?focus=${encodeURIComponent(result.focusId)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const typeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return <CheckSquare size={14} />;
      case 'goal': return <Target size={14} />;
      case 'habit': return <Calendar size={14} />;
      case 'project': return <FolderKanban size={14} />;
      case 'project_task': return <ListTodo size={14} />;
      case 'feed': return <Newspaper size={14} />;
    }
  };

  const typeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return 'text-blue-500 dark:text-blue-400';
      case 'goal': return 'text-violet-500 dark:text-violet-400';
      case 'habit': return 'text-orange-500 dark:text-orange-400';
      case 'project': return 'text-emerald-500 dark:text-emerald-400';
      case 'project_task': return 'text-teal-500 dark:text-teal-400';
      case 'feed': return 'text-amber-500 dark:text-amber-400';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className={`absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm`} onClick={() => setOpen(false)} />
      <div className="relative flex justify-center pt-[15vh]">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Search everything"
          tabIndex={-1}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-down outline-none ${
            'bg-white border border-slate-200 dark:bg-[#12121a] dark:border-white/10'
          }`}
        >
          {/* Search input */}
          <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-white/10`}>
            <Search size={18} className={'text-slate-400 dark:text-gray-500'} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, goals, habits, projects, feed..."
              aria-label="Search everything"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="global-search-results"
              aria-activedescendant={results[selectedIndex] ? `global-search-option-${selectedIndex}` : undefined}
              autoComplete="off"
              className={`flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 dark:text-white dark:placeholder-gray-500`}
            />
            <kbd className={`text-xs px-2 py-1 rounded bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500`}>ESC</kbd>
          </div>

          {/* Screen readers get no signal from a list that silently repopulates. */}
          <p aria-live="polite" className="sr-only">
            {query
              ? results.length === 0
                ? `No results for ${query}`
                : `${results.length} result${results.length === 1 ? '' : 's'} for ${query}`
              : ''}
          </p>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto" id="global-search-results" role="listbox" aria-label="Search results">
            {query && results.length === 0 && (
              <div className={`px-4 py-8 text-center text-sm text-slate-500 dark:text-gray-500`}>
                No results for "{query}"
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                id={`global-search-option-${idx}`}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-violet-50 dark:bg-violet-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <span className={typeColor(result.type)}>{typeIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate text-slate-800 dark:text-white`}>{result.title}</p>
                  {result.subtitle && (
                    <p className={`text-xs truncate text-slate-500 dark:text-gray-500`}>{result.subtitle}</p>
                  )}
                </div>
                <span className={`text-xs uppercase tracking-wider text-slate-400 dark:text-gray-400`}>
                  {result.type === 'project_task' ? 'Task' : result.type === 'feed' ? 'Article' : result.type}
                </span>
                {idx === selectedIndex && <ArrowRight size={12} className={'text-violet-500 dark:text-violet-400'} />}
              </button>
            ))}
          </div>

          {/* Footer hint */}
          {!query && (
            <div className={`px-4 py-3 border-t flex items-center gap-4 text-xs border-slate-100 text-slate-400 dark:border-white/10 dark:text-gray-400`}>
              <span><kbd className={`px-1 py-1 rounded bg-slate-100 dark:bg-white/5`}>↑↓</kbd> navigate</span>
              <span><kbd className={`px-1 py-1 rounded bg-slate-100 dark:bg-white/5`}>↵</kbd> select</span>
              <span><kbd className={`px-1 py-1 rounded bg-slate-100 dark:bg-white/5`}>esc</kbd> close</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
