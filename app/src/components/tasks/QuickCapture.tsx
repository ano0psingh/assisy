import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Archive, CalendarPlus, Inbox, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../../context/TaskContext';
import { hapticLight } from '../../lib/haptics';
import { getLocalDateString } from '../../lib/dateUtils';
import type { Effort, Priority, TaskCategory } from '../../types';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface QuickCaptureProps {
  open: boolean;
  onClose: () => void;
  anchorClassName?: string;
  children?: ReactNode;
}

export function QuickCapture({ open, onClose, anchorClassName = '', children }: QuickCaptureProps) {
  const { createTask, scheduleTask } = useTaskContext();
  const navigate = useNavigate();
  const panelRef = useDialogFocus<HTMLDivElement>(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');

  const resetAndClose = useCallback(() => {
    setTitle('');
    setCategory('Personal');
    setPriority('High');
    setEffort('Low');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) resetAndClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resetAndClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, resetAndClose]);

  const capture = (destination: 'inbox' | 'today') => {
    const trimmed = title.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    const task = createTask(
      trimmed,
      '',
      category,
      priority,
      effort,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { inbox: true },
    );
    if (destination === 'today') {
      scheduleTask(task.id, { date: getLocalDateString() });
    }
    hapticLight();
    resetAndClose();
  };

  const openFullForm = () => {
    resetAndClose();
    sessionStorage.setItem('assisy_open_task_form', '1');
    navigate('/tasks');
    window.setTimeout(() => window.dispatchEvent(new Event('assisy:open-task-form')), 0);
  };

  return (
    <div className={anchorClassName}>
      {children}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Quick capture task"
          tabIndex={-1}
          className="card absolute z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-4 shadow-elevated"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              capture('inbox');
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Quick capture</h2>
                <p className="text-xs text-slate-400 dark:text-gray-500">Enter saves to Inbox</p>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="Close quick capture"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <label className="sr-only" htmlFor="quick-capture-title">Task title</label>
            <input
              ref={inputRef}
              id="quick-capture-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs your attention?"
              className="input w-full rounded-xl px-3 py-3 text-sm"
            />

            <div className="grid grid-cols-3 gap-2">
              <label className="sr-only" htmlFor="quick-capture-category">Category</label>
              <select id="quick-capture-category" value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)} className="input rounded-lg px-2 py-2 text-xs">
                <option value="Personal">Personal</option>
                <option value="Financial">Financial</option>
                <option value="Professional">Professional</option>
              </select>
              <label className="sr-only" htmlFor="quick-capture-priority">Priority</label>
              <select id="quick-capture-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="input rounded-lg px-2 py-2 text-xs">
                <option value="High">High priority</option>
                <option value="Low">Low priority</option>
              </select>
              <label className="sr-only" htmlFor="quick-capture-effort">Effort</label>
              <select id="quick-capture-effort" value={effort} onChange={(event) => setEffort(event.target.value as Effort)} className="input rounded-lg px-2 py-2 text-xs">
                <option value="Low">Low effort</option>
                <option value="High">High effort</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700">
                <Inbox size={15} />
                Inbox
              </button>
              <button type="button" onClick={() => capture('today')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-50 px-3 text-sm font-medium text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300">
                <CalendarPlus size={15} />
                Today
              </button>
            </div>

            <button type="button" onClick={openFullForm} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10">
              <Archive size={15} />
              Open full task form
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
