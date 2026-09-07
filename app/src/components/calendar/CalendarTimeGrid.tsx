import { useMemo, useState, type DragEvent, type PointerEvent } from 'react';
import { AlertTriangle, Check, Clock3, GripHorizontal, MoveHorizontal, Plus } from 'lucide-react';
import type { Task } from '../../types';
import {
  getLocalDateString,
  getScheduledDate,
  getScheduledStartMinute,
  isRecurrenceDate,
  normalizeDurationMinutes,
} from '../../lib/dateUtils';
import { layoutOverlapLanes } from '../../lib/calendarScheduling';

interface CalendarTimeGridProps {
  days: Date[];
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenTask: (task: Task, date: string) => void;
  onSchedule: (taskId: string, input: { date: string; time?: string; durationMinutes?: number }) => void;
  onInlineCreate: (date: string, time?: string) => void;
}

const DEFAULT_START_MINUTE = 6 * 60;
const DEFAULT_END_MINUTE = 22 * 60;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 44;
const PIXELS_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES;
function minutesToTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 45, minutes));
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, '0')}:${String(safeMinutes % 60).padStart(2, '0')}`;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function sameDay(a: Date, b: Date): boolean {
  return getLocalDateString(a) === getLocalDateString(b);
}

export function CalendarTimeGrid({
  days,
  tasks,
  selectedDate,
  onSelectDate,
  onOpenTask,
  onSchedule,
  onInlineCreate,
}: CalendarTimeGridProps) {
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const gridTemplateColumns = `64px repeat(${days.length}, minmax(${days.length === 1 ? '220px' : '108px'}, 1fr))`;
  const minimumWidth = days.length === 1 ? '100%' : '840px';

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const timedByDate = useMemo(() => {
    const result = new Map<string, Task[]>();
    for (const task of tasks) {
      const date = getScheduledDate(task);
      if (!date || getScheduledStartMinute(task) === null || task.status === 'Completed') continue;
      const existing = result.get(date) ?? [];
      existing.push(task);
      result.set(date, existing);
    }
    return result;
  }, [tasks]);
  const { startMinute: displayStart, endMinute: displayEnd } = useMemo(() => {
    const visibleDates = new Set(days.map(getLocalDateString));
    const timed = tasks.filter(task => visibleDates.has(getScheduledDate(task) ?? '') && getScheduledStartMinute(task) !== null);
    const starts = timed.map(task => getScheduledStartMinute(task)!).filter(Number.isFinite);
    const ends = timed.map(task => getScheduledStartMinute(task)! + normalizeDurationMinutes(task.durationMinutes, 30));
    return {
      startMinute: Math.max(0, Math.min(DEFAULT_START_MINUTE, ...starts.map(value => Math.floor(value / 60) * 60))),
      endMinute: Math.min(1440, Math.max(DEFAULT_END_MINUTE, ...ends.map(value => Math.ceil(value / 60) * 60))),
    };
  }, [days, tasks]);
  const slots = useMemo(() => Array.from(
    { length: (displayEnd - displayStart) / SLOT_MINUTES },
    (_, index) => displayStart + index * SLOT_MINUTES,
  ), [displayEnd, displayStart]);
  const laneLayouts = useMemo(() => {
    const layouts = new Map<string, ReturnType<typeof layoutOverlapLanes>[number]>();
    for (const [date, blocks] of timedByDate) {
      for (const layout of layoutOverlapLanes(blocks)) layouts.set(`${date}:${layout.id}`, layout);
    }
    return layouts;
  }, [timedByDate]);

  const flexibleByDate = useMemo(() => {
    const result = new Map<string, Array<{ task: Task; recurring: boolean; completed: boolean }>>();
    for (const day of days) {
      const date = getLocalDateString(day);
      const rows: Array<{ task: Task; recurring: boolean; completed: boolean }> = [];
      const seen = new Set<string>();

      for (const task of tasks) {
        if (getScheduledDate(task) === date && getScheduledStartMinute(task) === null && task.status !== 'Completed') {
          rows.push({ task, recurring: false, completed: false });
          seen.add(task.id);
        }
        const createdDate = getLocalDateString(new Date(task.createdAt));
        if (
          !task.id.startsWith('pt-')
          && task.isRecurring
          && createdDate <= date
          && isRecurrenceDate(date, task)
          && !seen.has(task.id)
        ) {
          rows.push({
            task,
            recurring: true,
            completed: task.completionLog?.includes(date) ?? false,
          });
          seen.add(task.id);
        }
      }
      result.set(date, rows);
    }
    return result;
  }, [days, tasks]);

  const dropTask = (event: DragEvent, date: string, startMinute?: number) => {
    event.preventDefault();
    setDragTarget(null);
    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const task = tasksById.get(taskId);
    onSchedule(taskId, {
      date,
      time: startMinute == null ? undefined : minutesToTime(startMinute),
      durationMinutes: startMinute == null ? undefined : normalizeDurationMinutes(task?.durationMinutes, 30),
    });
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>, task: Task, startMinute: number) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const initialDuration = normalizeDurationMinutes(task.durationMinutes, 30);

    const handlePointerUp = (pointerEvent: globalThis.PointerEvent) => {
      const deltaMinutes = (pointerEvent.clientY - startY) / PIXELS_PER_MINUTE;
      const snappedDuration = Math.round((initialDuration + deltaMinutes) / 15) * 15;
      const durationMinutes = Math.min(1440 - startMinute, Math.max(15, snappedDuration));
      const date = getScheduledDate(task);
      if (date) {
        onSchedule(task.id, {
          date,
          time: task.scheduledTime,
          durationMinutes,
        });
      }
      document.removeEventListener('pointerup', handlePointerUp);
    };
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <section aria-label={days.length === 1 ? 'Daily time schedule' : 'Weekly time schedule'}>
      {days.length === 1 && (
        <p className="mb-3 text-xs text-[var(--ink-muted)] sm:hidden">
          Tap a time row to add a Calendar block. Tap a task to change its schedule.
        </p>
      )}
      {days.length > 1 && (
        <p className="mb-3 flex items-center gap-2 text-xs text-[var(--ink-muted)] lg:hidden">
          <MoveHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          Scroll to see the full week; tap a task to edit.
        </p>
      )}
      <div
        className="overflow-x-auto border border-[var(--rule)] bg-[var(--surface-raised)]"
        style={{ overscrollBehaviorX: 'contain' }}
      >
        <div style={{ minWidth: minimumWidth }}>
          <div className="grid border-b border-[var(--rule)]" style={{ gridTemplateColumns }}>
            <div className="border-r border-[var(--rule)]" />
            {days.map((day) => {
              const date = getLocalDateString(day);
              const isToday = sameDay(day, new Date());
              const isSelected = sameDay(day, selectedDate);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`min-h-14 border-r border-[var(--rule)] px-2 py-2 text-center last:border-r-0 ${
                    isSelected ? 'bg-[var(--action-soft)]' : 'hover:bg-[var(--state-hover)]'
                  }`}
                >
                  <span className="block text-xs font-semibold uppercase text-[var(--ink-muted)]">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <span className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? 'bg-[var(--action)] text-[var(--ink-inverse)]' : 'text-[var(--ink)]'
                  }`}>
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid border-b border-[var(--rule)]" style={{ gridTemplateColumns }}>
            <div className="border-r border-[var(--rule)] px-2 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Flexible
            </div>
            {days.map((day) => {
              const date = getLocalDateString(day);
              const flexible = flexibleByDate.get(date) ?? [];
              return (
                <div
                  key={date}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragTarget(`${date}:all-day`);
                  }}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={(event) => dropTask(event, date)}
                  className={`min-h-16 border-r border-[var(--rule)] p-1.5 last:border-r-0 ${
                    dragTarget === `${date}:all-day` ? 'bg-[var(--action-soft)]' : ''
                  }`}
                >
                  <div className="space-y-1">
                    {flexible.slice(0, 3).map(({ task, recurring, completed }) => (
                      recurring ? (
                        <button
                          type="button"
                          key={`${task.id}:${date}:recurring`}
                          title="Recurring flexible task"
                          onClick={() => onOpenTask(task, date)}
                          className={`flex min-h-11 items-center gap-1 border border-[var(--success)] bg-[var(--success-soft)] px-1.5 text-xs font-medium text-[var(--success)] ${
                            completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {completed && <Check className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{task.title}</span>
                        </button>
                      ) : (
                        <button
                          key={task.id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', task.id);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => onOpenTask(task, date)}
                          className="flex min-h-11 w-full items-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface)] px-1.5 text-left text-xs font-medium text-[var(--action)] hover:bg-[var(--state-hover)]"
                          aria-label={`Edit schedule for ${task.title}`}
                        >
                          <span className="truncate">{task.title}</span>
                        </button>
                      )
                    ))}
                    {flexible.length > 3 && (
                      <p className="px-1 text-xs text-[var(--ink-muted)]">+{flexible.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="relative border-r border-[var(--rule)]" style={{ height: slots.length * SLOT_HEIGHT }}>
              {slots.map((minute, index) => (
                <div
                  key={minute}
                  className="absolute right-2 text-xs text-[var(--ink-muted)]"
                  style={{ top: index * SLOT_HEIGHT - 7 }}
                >
                  {minute % 60 === 0 ? formatTime(minute).replace(':00', '') : ''}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const date = getLocalDateString(day);
              const timed = timedByDate.get(date) ?? [];
              return (
                <div
                  key={date}
                  className="relative border-r border-[var(--rule)] last:border-r-0"
                  style={{ height: slots.length * SLOT_HEIGHT }}
                >
                  {slots.map((minute, index) => (
                    <div
                      key={minute}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragTarget(`${date}:${minute}`);
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(event) => dropTask(event, date, minute)}
                      onDoubleClick={() => onInlineCreate(date, minutesToTime(minute))}
                      className={`absolute inset-x-0 border-b ${
                        minute % 60 === 30
                          ? 'border-[var(--rule)] opacity-70'
                          : 'border-[var(--rule-strong)]'
                      } ${dragTarget === `${date}:${minute}` ? 'bg-[var(--action-soft)]' : ''}`}
                      style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      title={`Drop at ${formatTime(minute)}; double-click to create`}
                    >
                      <button
                        type="button"
                        onClick={() => onInlineCreate(date, minutesToTime(minute))}
                        aria-label={`Create task on ${day.toLocaleDateString()} at ${formatTime(minute)}`}
                        className="absolute inset-0 z-[1] opacity-0 focus:opacity-100 max-sm:opacity-100"
                      >
                        <Plus className="mx-auto h-4 w-4 text-[var(--action)] opacity-40" />
                      </button>
                    </div>
                  ))}

                  {timed.map((task) => {
                    const startMinute = getScheduledStartMinute(task);
                    if (startMinute === null || startMinute >= displayEnd || startMinute < displayStart) return null;
                    const duration = normalizeDurationMinutes(task.durationMinutes, 30);
                    const top = (startMinute - displayStart) * PIXELS_PER_MINUTE;
                    const height = Math.max(22, duration * PIXELS_PER_MINUTE);
                    const layout = laneLayouts.get(`${date}:${task.id}`) ?? { lane: 0, laneCount: 1, conflicted: false };
                    const width = 100 / layout.laneCount;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', task.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        className={`absolute z-10 overflow-hidden border px-2 py-1 text-left ${
                          layout.conflicted
                            ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]'
                            : 'border-[var(--rule-strong)] bg-[var(--action-soft)] text-[var(--ink)] hover:border-[var(--action)]'
                        }`}
                        style={{ top, height, left: `calc(${layout.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                        aria-describedby={layout.conflicted ? `${task.id}-conflict` : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenTask(task, date)}
                          className="block w-full text-left"
                          aria-label={`Edit schedule for ${task.title}, ${formatTime(startMinute)}, ${duration} minutes`}
                        >
                          <span className="block truncate text-xs font-semibold">{task.title}</span>
                          {layout.conflicted && (
                            <span id={`${task.id}-conflict`} className="flex items-center gap-1 text-[11px] font-semibold">
                              <AlertTriangle className="h-2.5 w-2.5" /> Conflict
                            </span>
                          )}
                          {height >= 38 && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs opacity-75">
                              <Clock3 className="h-3 w-3" />
                              {formatTime(startMinute)}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => startResize(event, task, startMinute)}
                          className="absolute inset-x-0 bottom-0 hidden h-4 cursor-ns-resize touch-none items-center justify-center opacity-50 hover:opacity-100 sm:flex"
                          aria-label={`Resize ${task.title}`}
                          title="Drag to resize"
                        >
                          <GripHorizontal className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
