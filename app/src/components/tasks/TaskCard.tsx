import { useState, useRef, useEffect } from 'react';
import type { Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { TiptapViewer } from '../common/TiptapViewer';
import { Check, Flame, RotateCcw, CalendarDays, CalendarPlus, CalendarMinus, FolderInput, Pencil, Trash2, MoreHorizontal, Clock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onAddToToday?: (taskId: string) => void;
  onRemoveFromToday?: (taskId: string) => void;
  onMoveToProject?: (task: Task) => void;
  showTodayActions?: boolean;
  isInTodayView?: boolean;
}

function isFromPreviousDay(createdAt: Date): boolean {
  const today = new Date();
  const taskDate = new Date(createdAt);
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

function getDaysAgoText(createdAt: Date): string {
  const today = new Date();
  const taskDate = new Date(createdAt);
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - taskDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function formatDueDate(dueDate: Date): { text: string; isOverdue: boolean; isToday: boolean } {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
  if (diffDays === 0) return { text: 'Today', isOverdue: false, isToday: true };
  if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false, isToday: false };
  if (diffDays <= 7) return { text: `${diffDays}d`, isOverdue: false, isToday: false };
  return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false, isToday: false };
}

export function TaskCard({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  onAddToToday,
  onRemoveFromToday,
  onMoveToProject,
  showTodayActions = false,
  isInTodayView = false,
}: TaskCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCompleted = task.status === 'Completed';
  const isCarriedForward = task.status === 'Carried Forward' || (!task.isRecurring && isFromPreviousDay(task.createdAt) && !isCompleted);
  const daysAgoText = isCarriedForward && !task.isRecurring ? getDaysAgoText(task.createdAt) : '';

  const todayStr = new Date().toISOString().split('T')[0];
  const isFocusedToday = task.isFocusedToday && task.focusedDate === todayStr;

  const isDueToday = task.dueDate && (() => {
    const due = new Date(task.dueDate as Date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  })();

  const isOverdue = task.dueDate && (() => {
    const due = new Date(task.dueDate as Date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();

  const canRemoveFromToday = isFocusedToday && !isDueToday && !isOverdue && !task.isRecurring && task.status !== 'Carried Forward';

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const hasSecondaryActions = (showTodayActions && !isInTodayView && onAddToToday && !isCompleted)
    || (isInTodayView && canRemoveFromToday && onRemoveFromToday)
    || (onMoveToProject && !isCompleted);

  return (
    <div className={`group rounded-xl px-4 py-3 transition-all duration-200 ease-spring active:scale-[0.99] ${
      isDark
        ? `bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] ${isCompleted ? 'opacity-60' : ''}`
        : `bg-white border border-neutral-200 hover:shadow-medium hover:border-neutral-300 ${isCompleted ? 'opacity-60 bg-neutral-50' : ''}`
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : isDark
                  ? 'border-gray-600 hover:border-violet-500 hover:bg-violet-500/20'
                  : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50'
            }`}
          >
            {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>

          {/* Title + inline indicators */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h3
              onClick={() => onEdit(task)}
              className={`font-medium cursor-pointer hover:opacity-80 truncate ${
                isCompleted
                  ? isDark ? 'line-through text-gray-500' : 'line-through text-slate-400'
                  : isDark ? 'text-white' : 'text-slate-800'
              }`}
            >
              {task.title}
            </h3>

            {/* Only show high-signal inline indicators */}
            {task.priority === 'High' && !isCompleted && (
              <Flame size={14} className="flex-shrink-0 text-red-500" />
            )}
            {isCarriedForward && !isCompleted && (
              <span className={`flex-shrink-0 text-xs ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
                <RotateCcw size={13} className="inline -mt-0.5" /> {daysAgoText}
              </span>
            )}
            {task.isRecurring && !isCompleted && (
              <Clock size={13} className={`flex-shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            )}
            {task.dueDate && !isCompleted && (() => {
              const { text, isOverdue: overdue } = formatDueDate(task.dueDate);
              return (
                <span className={`flex-shrink-0 text-xs whitespace-nowrap ${
                  overdue
                    ? 'text-red-500 font-medium'
                    : isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  <CalendarDays size={12} className="inline -mt-0.5 mr-0.5" />{text}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Actions — edit always visible, rest in menu */}
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          {/* Add to Today — visible, not buried */}
          {showTodayActions && !isInTodayView && onAddToToday && !isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); }}
              className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                isDark
                  ? 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/20'
                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              title="Add to Today"
            >
              <CalendarPlus size={15} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
              isDark
                ? 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/20'
                : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
            }`}
            title="Edit"
          >
            <Pencil size={15} />
          </button>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                menuOpen ? 'opacity-100' : ''
              } ${
                isDark
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="More actions"
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && (
              <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg border z-30 py-1 animate-fade-in ${
                isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-slate-200'
              }`}>
                {/* Remove from Today */}
                {isInTodayView && canRemoveFromToday && onRemoveFromToday && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarMinus size={14} /> Remove from Today
                  </button>
                )}
                {/* Move to Project */}
                {onMoveToProject && !isCompleted && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveToProject(task); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FolderInput size={14} /> Move to Project
                  </button>
                )}
                {/* Divider before destructive action */}
                {hasSecondaryActions && (
                  <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
                )}
                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Delete this task?')) { onDelete(task.id); } setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Description preview */}
      {task.description && task.description.trim() && (
        <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
          <TiptapViewer content={task.description} collapsible maxHeight={60} />
        </div>
      )}
    </div>
  );
}
