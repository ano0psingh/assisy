import { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { TiptapViewer } from '../common/TiptapViewer';
import { SelectionCheckbox } from '../common/SelectionControls';
import { Check, Flame, RotateCcw, CalendarDays, CalendarPlus, CalendarCheck, CalendarMinus, FolderInput, Pencil, Trash2, MoreHorizontal, Clock, SkipForward, Pause, Play, Calendar } from 'lucide-react';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { getRecurringCompletionRate } from '../../context/TaskContext';
import { getLocalDateString } from '../../lib/dateUtils';
import { IconButton } from '../ui';

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
  goalName?: string;
  onSkipOccurrence?: (taskId: string) => void;
  onPauseRecurring?: (taskId: string, days: number) => void;
  onResumeRecurring?: (taskId: string) => void;
  /** When true the card selects instead of completing/editing. */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (taskId: string) => void;
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRecurrence(task: { recurrencePattern?: string; specificDays?: number[]; monthDay?: number }): string {
  if (!task.recurrencePattern) return 'Repeats';
  switch (task.recurrencePattern) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'specific_days':
      if (task.specificDays && task.specificDays.length > 0) {
        return task.specificDays.map(d => DAY_NAMES[d]).join(', ');
      }
      return 'Weekly';
    case 'monthly':
      return `Monthly (${task.monthDay ?? 1}${ordinalSuffix(task.monthDay ?? 1)})`;
    default: return 'Repeats';
  }
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/** "17:30" -> "5:30 PM", following the reader's locale rather than a fixed format. */
function formatTimeOfDay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * @param dueTime optional HH:MM. When present, a task due today counts as overdue
 * once that hour has passed instead of waiting for the whole day to end — which is
 * the entire point of setting a time. Without one the day-level behaviour is kept.
 */
function formatDueDate(dueDate: Date, dueTime?: string): { text: string; isOverdue: boolean; isToday: boolean } {
  const now = new Date();
  const today = new Date(now);
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const at = dueTime ? ` ${formatTimeOfDay(dueTime)}` : '';

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
  if (diffDays === 0) {
    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number);
      const deadline = new Date(now);
      deadline.setHours(h, m, 0, 0);
      if (now.getTime() > deadline.getTime()) {
        return { text: `Overdue${at}`, isOverdue: true, isToday: true };
      }
    }
    return { text: `Today${at}`, isOverdue: false, isToday: true };
  }
  if (diffDays === 1) return { text: `Tomorrow${at}`, isOverdue: false, isToday: false };
  if (diffDays <= 7) return { text: `${diffDays}d${at}`, isOverdue: false, isToday: false };
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + at,
    isOverdue: false,
    isToday: false,
  };
}

const SWIPE_THRESHOLD = 72;
const SWIPE_MAX = 100;

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
  goalName,
  onSkipOccurrence,
  onPauseRecurring,
  onResumeRecurring,
  selectionMode = false,
  isSelected = false,
  onSelectToggle,
}: TaskCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const didSwipe = useRef(false);

  const isCompleted = task.status === 'Completed';
  const isCarriedForward = task.status === 'Carried Forward' || (!task.isRecurring && isFromPreviousDay(task.createdAt) && !isCompleted);
  const daysAgoText = isCarriedForward && !task.isRecurring ? getDaysAgoText(task.createdAt) : '';

  /** Resting colour for the metadata row; individual items override it to signal urgency. */
  const metaCls = 'text-slate-400 dark:text-gray-500';

  const todayStr = getLocalDateString();
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

  const canRemoveFromToday = isFocusedToday && !isDueToday && !isOverdue && !task.isRecurring;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClose = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    };
    // Use setTimeout so the same tap that opened the menu doesn't immediately close it (e.g. on touch)
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleClose);
      document.addEventListener('touchstart', handleClose, { passive: true });
    }, 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('touchstart', handleClose);
    };
  }, [menuOpen]);

  const hasSecondaryActions = (showTodayActions && !isInTodayView && onAddToToday && !isCompleted)
    || (isInTodayView && canRemoveFromToday && onRemoveFromToday)
    || (onMoveToProject && !isCompleted);

  // Long-press quick actions
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTouchStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [quickAction, setQuickAction] = useState<{ x: number; y: number } | null>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!quickAction) return;
    const dismiss = (e: MouseEvent | TouchEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target as Node)) {
        setQuickAction(null);
      }
    };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', dismiss);
      document.addEventListener('touchstart', dismiss, { passive: true });
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('touchstart', dismiss);
    };
  }, [quickAction]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    longPressTouchStart.current = { x: touch.clientX, y: touch.clientY };
    didSwipe.current = false;

    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      hapticMedium();
      setQuickAction({ x: touch.clientX, y: touch.clientY });
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (selectionMode) return;
    const touch = e.touches[0];
    const dx = touch.clientX - longPressTouchStart.current.x;
    const dy = touch.clientY - longPressTouchStart.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPress();
    }

    const swipeDx = touch.clientX - touchStartX.current;
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, swipeDx));
    setSwipeOffset(clamped);
  };

  const handleTouchEnd = () => {
    if (selectionMode) return;
    clearLongPress();
    if (quickAction) return;

    if (swipeOffset >= SWIPE_THRESHOLD) {
      didSwipe.current = true;
      hapticLight();
      onToggleComplete(task.id);
    } else if (swipeOffset <= -SWIPE_THRESHOLD) {
      didSwipe.current = true;
      if (typeof window !== 'undefined' && window.confirm?.('Delete this task?')) {
        onDelete(task.id);
      }
    }
    setSwipeOffset(0);
  };

  // The inner card sets both `backdrop-blur-xl` and a transform, and each of those
  // creates a stacking context — so the dropdown's own z-50 could only ever compete
  // inside this one card, and the next card in the list painted over it. Lifting the
  // whole card while its menu is open escapes that. z-30 stays below the header
  // (z-40) and modals (z-50), so an open menu cannot cover either.
  return (
    <div
      className={`relative rounded-2xl ${menuOpen ? 'z-30' : ''}`}
      data-focus-id={task.id}
    >
      {swipeOffset !== 0 && (
        <div className="absolute inset-0 flex rounded-2xl overflow-hidden">
          <div className={`flex-1 flex items-center justify-end pr-4 ${swipeOffset < -20 ? 'opacity-100' : 'opacity-0'} transition-opacity bg-red-50 dark:bg-red-500/20`}>
            <Trash2 size={24} className={'text-red-500 dark:text-red-400'} />
          </div>
          <div className={`flex-1 flex items-center justify-start pl-4 ${swipeOffset > 20 ? 'opacity-100' : 'opacity-0'} transition-opacity bg-emerald-50 dark:bg-emerald-500/20`}>
            <Check size={24} className={'text-emerald-500 dark:text-emerald-400'} />
          </div>
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => setSwipeOffset(0)}
        style={{ transform: `translateX(${swipeOffset}px)`, boxShadow: isDark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.05)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.7)' }}
        className={`group rounded-2xl px-4 py-4 transition-shadow duration-200 ease-spring backdrop-blur-xl ${
          swipeOffset !== 0 ? 'shadow-lg' : ''
        } ${
      isSelected
        ? 'bg-violet-50/60 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30'
        : isDark
          ? `bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.16] ${isCompleted ? 'opacity-60' : ''}`
          : `bg-white/65 border border-white/70 hover:bg-white/80 ${isCompleted ? 'opacity-60' : ''}`
    }`}
      >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Checkbox — selects rows while in selection mode, completes otherwise */}
          {selectionMode ? (
            <SelectionCheckbox
              selected={isSelected}
              onToggle={() => onSelectToggle?.(task.id)}
              label={`Select "${task.title}"`}
              className="w-5 h-5 flex items-center justify-center"
            />
          ) : (
            /* The box stays 20px, but padding lifts the tap target to 44px —
               this is the most-tapped control in the app. The negative margin
               keeps the row layout identical. */
            <button
              onClick={() => { hapticLight(); onToggleComplete(task.id); }}
              aria-label={isCompleted ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
              className="p-3 -m-3 flex items-center justify-center flex-shrink-0"
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50 dark:border-gray-600 dark:hover:bg-violet-500/20'
                }`}
              >
                {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
              </span>
            </button>
          )}

          {/* Title + inline indicators */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                onClick={() => selectionMode ? onSelectToggle?.(task.id) : onEdit(task)}
                className={`font-medium cursor-pointer hover:opacity-80 line-clamp-2 ${
                  isCompleted
                    ? 'line-through text-slate-400 dark:text-gray-500'
                    : 'text-slate-800 dark:text-white'
                }`}
              >
                {task.title}
              </h3>
              {task.priority === 'High' && !isCompleted && (
                <Flame size={14} className="flex-shrink-0 text-red-500" />
              )}
            </div>
            {/* Meta indicators — wrap below title.
                A recurring task with a goal can show seven of these at once. They
                used to be seven different colours, which read as noise and left
                colour meaning nothing in particular. They are muted by default now,
                and colour is spent only where it reports something the reader has to
                act on: overdue, and paused. */}
            {!isCompleted && (
              <div className={`flex items-center gap-2 flex-wrap mt-1 ${metaCls}`}>
                {isCarriedForward && (
                  <span className="text-xs">
                    <RotateCcw size={11} className="inline -mt-1" /> {daysAgoText}
                  </span>
                )}
                {task.isRecurring && (
                  <span className={`text-xs whitespace-nowrap ${
                    task.pausedUntil && getLocalDateString() <= task.pausedUntil
                      ? 'text-amber-500 dark:text-amber-400'
                      : ''
                  }`}>
                    <Clock size={10} className="inline -mt-1 mr-1" />
                    {task.pausedUntil && getLocalDateString() <= task.pausedUntil
                      ? `Paused until ${new Date(task.pausedUntil + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : formatRecurrence(task)
                    }
                  </span>
                )}
                {task.isRecurring && task.completedAt && (
                  <span className="text-xs whitespace-nowrap">
                    Last: {(() => {
                      const days = Math.floor((Date.now() - new Date(task.completedAt).getTime()) / 86400000);
                      if (days === 0) return 'today';
                      if (days === 1) return 'yesterday';
                      return `${days}d ago`;
                    })()}
                  </span>
                )}
                {task.isRecurring && (task.streakCount ?? 0) > 0 && (
                  <span className="text-xs whitespace-nowrap">
                    {/* The flame keeps the streak recognisable without the text
                        having to compete with the overdue colour. */}
                    <Flame size={10} className="inline -mt-1 text-orange-500" /> {task.streakCount}d streak
                  </span>
                )}
                {task.isRecurring && task.completionLog && (() => {
                  const rate = getRecurringCompletionRate(task, 30);
                  if (rate.expected <= 0) return null;
                  const pct = Math.round(rate.rate * 100);
                  return (
                    <span className="text-xs whitespace-nowrap">
                      {rate.completed}/{rate.expected} ({pct}%)
                    </span>
                  );
                })()}
                {task.dueDate && (() => {
                  const { text, isOverdue: overdue } = formatDueDate(task.dueDate, task.dueTime);
                  return (
                    <span className={`text-xs whitespace-nowrap ${
                      overdue ? 'text-red-500 font-medium' : ''
                    }`}>
                      <CalendarDays size={10} className="inline -mt-1 mr-1" />{text}
                    </span>
                  );
                })()}
                {goalName && (
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400`}>
                    {goalName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions — edit always visible, rest in menu. Hidden while selecting. */}
        <div className={`flex items-center space-x-1 flex-shrink-0 ${selectionMode ? 'hidden' : ''}`}>
          {/* Focused today — always visible green indicator, click to remove */}
          {isFocusedToday && !isCompleted && onRemoveFromToday && (
            <IconButton
              icon={CalendarCheck}
              onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); }}
              className="ring-1 bg-emerald-100 text-emerald-600 ring-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400"
              title="Added to Today (click to remove)"
              label={`Remove "${task.title}" from Today`}
            />
          )}
          {/* Add to Today — hover only, when not already focused */}
          {showTodayActions && !isFocusedToday && !isInTodayView && onAddToToday && !isCompleted && (
            <IconButton
              icon={CalendarPlus}
              onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); }}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/20"
              title="Add to Today"
              label={`Add "${task.title}" to Today`}
            />
          )}

          {/* Hidden on phones, where three 40px buttons left the title barely
              any room. Tapping the title edits, and Edit is in the menu too. */}
          <IconButton
            icon={Pencil}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-500/20"
            title="Edit"
            label={`Edit "${task.title}"`}
          />

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <IconButton
              type="button"
              icon={MoreHorizontal}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(!menuOpen); }}
              className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
                menuOpen ? 'opacity-100' : ''
              }`}
              title="More actions"
              label={`More actions for "${task.title}"`}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            />

            {menuOpen && (
              <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg border z-50 py-1 animate-fade-in ${
                'bg-white border-slate-200 dark:bg-[#1a1a2e] dark:border-white/10'
              }`}>
                {/* Remove from Today */}
                {isInTodayView && canRemoveFromToday && onRemoveFromToday && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
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
                      'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <FolderInput size={14} /> Move to Project
                  </button>
                )}
                {/* Recurring task actions */}
                {task.isRecurring && !isCompleted && (
                  <>
                    {onSkipOccurrence && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSkipOccurrence(task.id); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                        }`}
                      >
                        <SkipForward size={14} /> Skip Today
                      </button>
                    )}
                    {onPauseRecurring && !task.pausedUntil && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPauseRecurring(task.id, 7); setMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                          }`}
                        >
                          <Pause size={14} /> Pause 1 Week
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPauseRecurring(task.id, 30); setMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                          }`}
                        >
                          <Pause size={14} /> Pause 1 Month
                        </button>
                      </>
                    )}
                    {onResumeRecurring && task.pausedUntil && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResumeRecurring(task.id); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                        }`}
                      >
                        <Play size={14} /> Resume Recurring
                      </button>
                    )}
                  </>
                )}
                {/* Divider before destructive action */}
                {(hasSecondaryActions || (task.isRecurring && !isCompleted)) && (
                  <div className={`my-1 border-t border-slate-100 dark:border-white/10`} />
                )}
                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Delete this task?')) { onDelete(task.id); } setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
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
        <div className={`mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]`}>
          <TiptapViewer content={task.description} collapsible maxHeight={60} />
        </div>
      )}
      </div>

      {/* Long-press quick action popup */}
      {quickAction && (
        <div
          ref={quickActionRef}
          className={`fixed z-[100] rounded-xl shadow-lg border py-1 animate-fade-in min-w-[160px] ${
            'bg-white border-slate-200 dark:bg-[#1a1a2e] dark:border-white/10'
          }`}
          style={{
            left: Math.min(quickAction.x, window.innerWidth - 180),
            top: Math.max(8, quickAction.y - 120),
          }}
        >
          {!isCompleted && (
            <button
              onClick={() => { onToggleComplete(task.id); setQuickAction(null); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
                'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
              }`}
            >
              <Check size={15} /> Complete
            </button>
          )}
          {onAddToToday && !isCompleted && !isFocusedToday && (
            <button
              onClick={() => { onAddToToday(task.id); setQuickAction(null); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
                'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10'
              }`}
            >
              <Calendar size={15} /> Tomorrow
            </button>
          )}
          <button
            onClick={() => { onEdit(task); setQuickAction(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
              'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
            }`}
          >
            <Pencil size={15} /> Edit
          </button>
          <div className={`my-1 border-t border-slate-100 dark:border-white/10`} />
          <button
            onClick={() => { if (confirm('Delete this task?')) onDelete(task.id); setQuickAction(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
              'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
            }`}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
