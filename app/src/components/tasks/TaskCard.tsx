import { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../../types';
import { TiptapViewer } from '../common/TiptapViewer';
import { SelectionCheckbox } from '../common/SelectionControls';
import { Check, Flame, RotateCcw, CalendarDays, CalendarPlus, CalendarCheck, CalendarMinus, FolderInput, Pencil, Trash2, MoreHorizontal, Clock, SkipForward, Pause, Play, Calendar, Download } from 'lucide-react';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { getRecurringCompletionRate } from '../../context/TaskContext';
import { getLocalDateString, getScheduledDate } from '../../lib/dateUtils';
import { IconButton } from '../ui';
import { downloadIcs } from '../../lib/ics';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onAddToToday?: (taskId: string) => void;
  onScheduleTomorrow?: (taskId: string) => void;
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
  onScheduleTomorrow,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const didSwipe = useRef(false);

  const isCompleted = task.status === 'Completed';
  const isCarriedForward = task.status === 'Carried Forward' || (!task.isRecurring && isFromPreviousDay(task.createdAt) && !isCompleted);
  const daysAgoText = isCarriedForward && !task.isRecurring ? getDaysAgoText(task.createdAt) : '';

  /** Resting colour for the metadata row; individual items override it to signal urgency. */
  const metaCls = 'text-[var(--ink-muted)]';

  const todayStr = getLocalDateString();
  const scheduledDate = getScheduledDate(task);
  const isScheduledToday = scheduledDate === todayStr;

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

  const canRemoveFromToday = isScheduledToday && !isDueToday && !isOverdue && !task.isRecurring;

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
      hapticLight();
      onDelete(task.id);
    }
    setSwipeOffset(0);
  };

  // The translated row creates a stacking context, so lift the whole assignment
  // while its menu is open. z-30 stays below the header and modal layers.
  return (
    <div
      className={`relative ${menuOpen ? 'z-30' : ''}`}
      data-focus-id={task.id}
    >
      {swipeOffset !== 0 && (
        <div className="absolute inset-0 flex overflow-hidden">
          <div className={`flex-1 flex items-center justify-end pr-4 ${swipeOffset < -20 ? 'opacity-100' : 'opacity-0'} transition-opacity bg-[var(--danger-soft)]`}>
            <Trash2 size={24} className="text-[var(--danger)]" />
          </div>
          <div className={`flex-1 flex items-center justify-start pl-4 ${swipeOffset > 20 ? 'opacity-100' : 'opacity-0'} transition-opacity bg-[var(--success-soft)]`}>
            <Check size={24} className="text-[var(--success)]" />
          </div>
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => setSwipeOffset(0)}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`group border-b border-[var(--rule)] bg-[var(--surface-raised)] px-3 py-3 transition-shadow duration-200 ease-spring last:border-b-0 ${
          swipeOffset !== 0 ? 'shadow-[var(--shadow-medium)]' : ''
        } ${
      isSelected
        ? 'bg-[var(--state-selected)]'
        : `hover:bg-[var(--state-hover)] ${isCompleted ? 'opacity-60' : ''}`
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
                    ? 'border-[var(--success)] bg-[var(--success)]'
                    : 'border-[var(--rule-strong)] hover:border-[var(--action)] hover:bg-[var(--action-soft)]'
                }`}
              >
                {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
              </span>
            </button>
          )}

          {/* Title + inline indicators */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectionMode ? onSelectToggle?.(task.id) : onEdit(task)}
                className={`line-clamp-2 text-left font-semibold hover:text-[var(--action)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                  isCompleted
                    ? 'line-through text-[var(--ink-muted)]'
                    : 'text-[var(--ink)]'
                }`}
                aria-label={selectionMode ? `Select "${task.title}"` : `Edit "${task.title}"`}
              >
                {task.title}
              </button>
              {task.priority === 'High' && !isCompleted && (
                <Flame size={14} className="flex-shrink-0 text-[var(--danger)]" />
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
                      ? 'text-[var(--warning)]'
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
                      const todayStart = new Date(`${getLocalDateString()}T00:00:00`).getTime();
                      const completionDay = new Date(task.completedAt);
                      completionDay.setHours(0, 0, 0, 0);
                      const days = Math.floor((todayStart - completionDay.getTime()) / 86400000);
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
                    <Flame size={10} className="inline -mt-1 text-[var(--warning)]" /> {task.streakCount}d streak
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
                {scheduledDate && (
                  <span className="text-xs whitespace-nowrap text-[var(--info)]">
                    <CalendarCheck size={10} className="inline -mt-1 mr-1" />
                    Planned
                    {task.scheduledTime ? ` ${formatTimeOfDay(task.scheduledTime)}` : ''}
                    {task.durationMinutes ? ` · ${task.durationMinutes}m` : ''}
                  </span>
                )}
                {task.dueDate && (() => {
                  const { text, isOverdue: overdue } = formatDueDate(task.dueDate, task.dueTime);
                  return (
                    <span className={`text-xs whitespace-nowrap ${
                      overdue ? 'text-[var(--danger)] font-medium' : ''
                    }`}>
                      <CalendarDays size={10} className="inline -mt-1 mr-1" />{text}
                    </span>
                  );
                })()}
                {goalName && (
                  <span className="whitespace-nowrap rounded bg-[var(--action-soft)] px-2 py-1 text-xs text-[var(--action)]">
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
          {isScheduledToday && !isCompleted && onRemoveFromToday && (
            <IconButton
              icon={CalendarCheck}
              onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); }}
              className="ring-1 bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)] hover:bg-[var(--success-soft)] hover:text-[var(--success)]"
              title="Added to Today (click to remove)"
              label={`Remove "${task.title}" from Today`}
            />
          )}
          {/* Add to Today — hover only, when not already focused */}
          {showTodayActions && !isScheduledToday && !isInTodayView && onAddToToday && !isCompleted && (
            <IconButton
              icon={CalendarPlus}
              onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); }}
              className="opacity-100 hover:bg-[var(--action-soft)] hover:text-[var(--action)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              title="Add to Today"
              label={`Add "${task.title}" to Today`}
            />
          )}

          {/* Hidden on phones, where three 40px buttons left the title barely
              any room. Tapping the title edits, and Edit is in the menu too. */}
          <IconButton
            icon={Pencil}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="hidden hover:bg-[var(--action-soft)] hover:text-[var(--action)] md:inline-flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            title="Edit"
            label={`Edit "${task.title}"`}
          />

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <IconButton
              type="button"
              icon={MoreHorizontal}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(!menuOpen); }}
              className="opacity-100"
              title="More actions"
              label={`More actions for "${task.title}"`}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            />

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-elevated)]">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(task); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                >
                  <Pencil size={14} /> Edit
                </button>
                {showTodayActions && !isScheduledToday && !isInTodayView && onAddToToday && !isCompleted && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--action)] transition-colors hover:bg-[var(--action-soft)]"
                  >
                    <CalendarPlus size={14} /> Add to Today
                  </button>
                )}
                {/* Remove from Today */}
                {isInTodayView && canRemoveFromToday && onRemoveFromToday && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                  >
                    <CalendarMinus size={14} /> Remove from Today
                  </button>
                )}
                {/* Move to Project */}
                {onMoveToProject && !isCompleted && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveToProject(task); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
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
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                      >
                        <SkipForward size={14} /> Skip Today
                      </button>
                    )}
                    {onPauseRecurring && !task.pausedUntil && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPauseRecurring(task.id, 7); setMenuOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                        >
                          <Pause size={14} /> Pause 1 Week
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPauseRecurring(task.id, 30); setMenuOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                        >
                          <Pause size={14} /> Pause 1 Month
                        </button>
                      </>
                    )}
                    {onResumeRecurring && task.pausedUntil && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResumeRecurring(task.id); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--success)] transition-colors hover:bg-[var(--success-soft)]"
                      >
                        <Play size={14} /> Resume Recurring
                      </button>
                    )}
                  </>
                )}
                {scheduledDate && task.scheduledTime && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadIcs([task], `assisy-${task.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                  >
                    <Download size={14} /> Export calendar event
                  </button>
                )}
                {/* Divider before destructive action */}
                {(hasSecondaryActions || scheduledDate || (task.isRecurring && !isCompleted)) && (
                  <div className="my-1 border-t border-[var(--rule)]" />
                )}
                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
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
        <div className="mt-2 border-t border-[var(--rule)] pt-2">
          <TiptapViewer content={task.description} collapsible maxHeight={60} />
        </div>
      )}
      </div>

      {/* Long-press quick action popup */}
      {quickAction && (
        <div
          ref={quickActionRef}
          className="fixed z-[100] min-w-[160px] rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-elevated)]"
          style={{
            left: Math.min(quickAction.x, window.innerWidth - 180),
            top: Math.max(8, quickAction.y - 120),
          }}
        >
          {!isCompleted && (
            <button
              onClick={() => { onToggleComplete(task.id); setQuickAction(null); }}
              className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[var(--success)] transition-colors hover:bg-[var(--success-soft)]"
            >
              <Check size={15} /> Complete
            </button>
          )}
          {onScheduleTomorrow && !isCompleted && (
            <button
              onClick={() => { onScheduleTomorrow(task.id); setQuickAction(null); }}
              className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[var(--info)] transition-colors hover:bg-[var(--info-soft)]"
            >
              <Calendar size={15} /> Tomorrow
            </button>
          )}
          <button
            onClick={() => { onEdit(task); setQuickAction(null); }}
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
          >
            <Pencil size={15} /> Edit
          </button>
          <div className="my-1 border-t border-[var(--rule)]" />
          <button
            onClick={() => { onDelete(task.id); setQuickAction(null); }}
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
