import { useMemo, useState, type DragEvent, type PointerEvent } from 'react';
import { Check, Clock3, GripHorizontal, Plus } from 'lucide-react';
import type { Task } from '../../types';
import {
  getLocalDateString,
  getScheduledDate,
  getScheduledStartMinute,
  isRecurrenceDate,
  normalizeDurationMinutes,
} from '../../lib/dateUtils';

interface CalendarTimeGridProps {
  days: Date[];
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenTask: (task: Task, date: string) => void;
  onSchedule: (taskId: string, input: { date: string; time?: string; durationMinutes?: number }) => void;
  onInlineCreate: (date: string, time?: string) => void;
}

const START_MINUTE = 6 * 60;
const END_MINUTE = 22 * 60;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 32;
const PIXELS_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES;
const SLOTS = Array.from(
  { length: (END_MINUTE - START_MINUTE) / SLOT_MINUTES },
  (_, index) => START_MINUTE + index * SLOT_MINUTES,
);

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
    <section aria-label="Weekly time schedule">
      <p className="mb-3 text-xs text-slate-400 dark:text-gray-500 lg:hidden">
        Swipe horizontally to see the full week.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[64px_repeat(7,minmax(108px,1fr))] border-b border-slate-200 dark:border-white/10">
            <div className="border-r border-slate-200 dark:border-white/10" />
            {days.map((day) => {
              const date = getLocalDateString(day);
              const isToday = sameDay(day, new Date());
              const isSelected = sameDay(day, selectedDate);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`min-h-14 border-r border-slate-200 px-2 py-2 text-center last:border-r-0 dark:border-white/10 ${
                    isSelected ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="block text-[11px] font-semibold uppercase text-slate-400 dark:text-gray-500">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <span className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? 'bg-violet-600 text-white' : 'text-slate-700 dark:text-gray-200'
                  }`}>
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,minmax(108px,1fr))] border-b border-slate-200 dark:border-white/10">
            <div className="border-r border-slate-200 px-2 py-3 text-[10px] font-semibold uppercase text-slate-400 dark:border-white/10 dark:text-gray-500">
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
                  className={`min-h-16 border-r border-slate-200 p-1.5 last:border-r-0 dark:border-white/10 ${
                    dragTarget === `${date}:all-day` ? 'bg-violet-100 dark:bg-violet-500/15' : ''
                  }`}
                >
                  <div className="space-y-1">
                    {flexible.slice(0, 3).map(({ task, recurring, completed }) => (
                      recurring ? (
                        <div
                          key={`${task.id}:${date}:recurring`}
                          title="Recurring flexible task"
                          className={`flex min-h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 ${
                            completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {completed && <Check className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{task.title}</span>
                        </div>
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
                          className="flex min-h-7 w-full items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 text-left text-[10px] font-medium text-violet-700 hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
                          aria-label={`Edit schedule for ${task.title}`}
                        >
                          <span className="truncate">{task.title}</span>
                        </button>
                      )
                    ))}
                    {flexible.length > 3 && (
                      <p className="px-1 text-[10px] text-slate-400">+{flexible.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,minmax(108px,1fr))]">
            <div className="relative border-r border-slate-200 dark:border-white/10" style={{ height: SLOTS.length * SLOT_HEIGHT }}>
              {SLOTS.map((minute, index) => (
                <div
                  key={minute}
                  className="absolute right-2 text-[10px] text-slate-400 dark:text-gray-500"
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
                  className="relative border-r border-slate-200 last:border-r-0 dark:border-white/10"
                  style={{ height: SLOTS.length * SLOT_HEIGHT }}
                >
                  {SLOTS.map((minute, index) => (
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
                          ? 'border-slate-100 dark:border-white/[0.035]'
                          : 'border-slate-200 dark:border-white/[0.07]'
                      } ${dragTarget === `${date}:${minute}` ? 'bg-violet-100 dark:bg-violet-500/20' : ''}`}
                      style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      title={`Drop at ${formatTime(minute)}; double-click to create`}
                    >
                      <button
                        type="button"
                        onClick={() => onInlineCreate(date, minutesToTime(minute))}
                        aria-label={`Create task on ${day.toLocaleDateString()} at ${formatTime(minute)}`}
                        className="absolute inset-0 z-[1] opacity-0 focus:opacity-100"
                      >
                        <Plus className="mx-auto h-4 w-4 text-violet-500" />
                      </button>
                    </div>
                  ))}

                  {timed.map((task) => {
                    const startMinute = getScheduledStartMinute(task);
                    if (startMinute === null || startMinute >= END_MINUTE || startMinute < START_MINUTE) return null;
                    const duration = normalizeDurationMinutes(task.durationMinutes, 30);
                    const top = (startMinute - START_MINUTE) * PIXELS_PER_MINUTE;
                    const height = Math.max(22, duration * PIXELS_PER_MINUTE);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', task.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        className="absolute inset-x-1 z-10 overflow-hidden rounded-lg border border-violet-300 bg-violet-100 px-2 py-1 text-left text-violet-800 shadow-sm hover:bg-violet-200 dark:border-violet-500/30 dark:bg-violet-500/25 dark:text-violet-100"
                        style={{ top, height }}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenTask(task, date)}
                          className="block w-full text-left"
                          aria-label={`Edit schedule for ${task.title}, ${formatTime(startMinute)}, ${duration} minutes`}
                        >
                          <span className="block truncate text-[11px] font-semibold">{task.title}</span>
                          {height >= 38 && (
                            <span className="mt-0.5 flex items-center gap-1 text-[10px] opacity-75">
                              <Clock3 className="h-3 w-3" />
                              {formatTime(startMinute)}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => startResize(event, task, startMinute)}
                          className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize touch-none items-center justify-center opacity-50 hover:opacity-100"
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
