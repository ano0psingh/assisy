import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { Task } from '../../types';
import { getScheduledDate, normalizeDurationMinutes } from '../../lib/dateUtils';
import { ExpandableModal } from '../common/ExpandableModal';

interface ScheduleTaskSheetProps {
  task: Task | null;
  defaultDate: string;
  onClose: () => void;
  onSchedule: (taskId: string, input: { date: string; time?: string; durationMinutes?: number }) => void;
  onUnschedule: (taskId: string) => void;
}

export function ScheduleTaskSheet({
  task,
  defaultDate,
  onClose,
  onSchedule,
  onUnschedule,
}: ScheduleTaskSheetProps) {
  const [date, setDate] = useState(() => task ? getScheduledDate(task) ?? defaultDate : defaultDate);
  const [time, setTime] = useState(() => task?.scheduledTime ?? '');
  const [duration, setDuration] = useState(() => normalizeDurationMinutes(task?.durationMinutes, 30));

  if (!task) return null;

  const isScheduled = Boolean(getScheduledDate(task));

  return (
    <ExpandableModal
      isOpen={Boolean(task)}
      onClose={onClose}
      title="Schedule task"
      icon={<CalendarClock className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
      maxWidth="max-w-md"
    >
      {() => (
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSchedule(task.id, {
              date,
              time: time || undefined,
              durationMinutes: time ? normalizeDurationMinutes(duration, 30) : undefined,
            });
            onClose();
          }}
        >
          <p className="truncate text-sm font-medium text-slate-700 dark:text-gray-200">
            {task.title}
          </p>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-200">
            Date
            <input
              autoFocus
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-200">
              Start time
              <input
                type="time"
                step={900}
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-200">
              Duration
              <input
                type="number"
                min={15}
                max={1440}
                step={15}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                disabled={!time}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-700 outline-none focus:border-violet-400 disabled:opacity-50 dark:border-white/10 dark:bg-slate-800 dark:text-gray-100"
              />
            </label>
          </div>
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Leave start time blank to place this task in the flexible all-day row.
          </p>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            {isScheduled && (
              <button
                type="button"
                onClick={() => {
                  onUnschedule(task.id);
                  onClose();
                }}
                className="min-h-11 rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Move to unscheduled
              </button>
            )}
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Save schedule
            </button>
          </div>
        </form>
      )}
    </ExpandableModal>
  );
}
