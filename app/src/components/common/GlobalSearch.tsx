import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, Target, FolderKanban, Calendar, ArrowRight, Newspaper, ListTodo } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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
};

export function GlobalSearch() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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
    navigate(result.route);
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
      case 'task': return isDark ? 'text-blue-400' : 'text-blue-500';
      case 'goal': return isDark ? 'text-violet-400' : 'text-violet-500';
      case 'habit': return isDark ? 'text-orange-400' : 'text-orange-500';
      case 'project': return isDark ? 'text-emerald-400' : 'text-emerald-500';
      case 'project_task': return isDark ? 'text-teal-400' : 'text-teal-500';
      case 'feed': return isDark ? 'text-amber-400' : 'text-amber-500';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-slate-900/20'} backdrop-blur-sm`} onClick={() => setOpen(false)} />
      <div className="relative flex justify-center pt-[15vh]">
        <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-down ${
          isDark ? 'bg-[#12121a] border border-white/10' : 'bg-white border border-slate-200'
        }`}>
          {/* Search input */}
          <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <Search size={18} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, goals, habits, projects, feed..."
              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-slate-800 placeholder-slate-400'}`}
            />
            <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-400'}`}>ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query && results.length === 0 && (
              <div className={`px-4 py-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                No results for "{query}"
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIndex
                    ? isDark ? 'bg-violet-500/10' : 'bg-violet-50'
                    : isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                }`}
              >
                <span className={typeColor(result.type)}>{typeIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{result.title}</p>
                  {result.subtitle && (
                    <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{result.subtitle}</p>
                  )}
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                  {result.type === 'project_task' ? 'Task' : result.type === 'feed' ? 'Article' : result.type}
                </span>
                {idx === selectedIndex && <ArrowRight size={12} className={isDark ? 'text-violet-400' : 'text-violet-500'} />}
              </button>
            ))}
          </div>

          {/* Footer hint */}
          {!query && (
            <div className={`px-4 py-3 border-t flex items-center gap-4 text-[10px] ${isDark ? 'border-white/10 text-gray-600' : 'border-slate-100 text-slate-400'}`}>
              <span><kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>↑↓</kbd> navigate</span>
              <span><kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>↵</kbd> select</span>
              <span><kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>esc</kbd> close</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
