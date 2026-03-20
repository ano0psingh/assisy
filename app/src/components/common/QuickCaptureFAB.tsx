import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight } from '../../lib/haptics';
import type { TaskCategory } from '../../types';

const CATEGORIES: { value: TaskCategory; color: string; activeRing: string }[] = [
  { value: 'Personal', color: 'bg-violet-500', activeRing: 'ring-violet-300' },
  { value: 'Financial', color: 'bg-emerald-500', activeRing: 'ring-emerald-300' },
  { value: 'Professional', color: 'bg-blue-500', activeRing: 'ring-blue-300' },
];

const COLLAPSE_DELAY = 2000;

export function QuickCaptureFAB() {
  const { createTask, addToToday } = useTaskContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [hidden, setHidden] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      setTitle('');
      setCategory('Personal');
    }, COLLAPSE_DELAY);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHidden(document.documentElement.hasAttribute('data-modal-open'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modal-open'] });
    setHidden(document.documentElement.hasAttribute('data-modal-open'));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setTitle('');
        setCategory('Personal');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  useEffect(() => () => clearCollapseTimer(), []);

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask = createTask(trimmed, '', category, 'Low', 'Low');
    addToToday(newTask.id);
    hapticLight();

    setTitle('');
    clearCollapseTimer();
    requestAnimationFrame(() => inputRef.current?.focus());
    scheduleCollapse();
  }, [title, category, createTask, addToToday, scheduleCollapse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setExpanded(false);
      setTitle('');
      setCategory('Personal');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    clearCollapseTimer();
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {expanded ? (
        <div
          ref={cardRef}
          className={`rounded-2xl shadow-xl p-3 w-64 max-w-[calc(100vw-2rem)] animate-slide-up ${
            isDark
              ? 'bg-gray-800 border border-white/10'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="New task…"
              className={`flex-1 text-sm rounded-lg px-3 py-2 outline-none ${
                isDark
                  ? 'bg-gray-700 text-white placeholder-gray-400'
                  : 'bg-slate-100 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              onClick={handleSubmit}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-500 text-white shrink-0 active:scale-95 transition-transform"
            >
              <Check size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-label={cat.value}
                className={`w-5 h-5 rounded-full transition-all ${cat.color} ${
                  category === cat.value ? `ring-2 ${cat.activeRing} scale-110` : 'opacity-60'
                }`}
              />
            ))}
            <span className={`text-xs ml-auto ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {category}
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="w-12 h-12 rounded-full bg-violet-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
