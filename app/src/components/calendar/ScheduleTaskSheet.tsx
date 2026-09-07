import { useState } from 'react';
import { CalendarClock, Download, SkipForward } from 'lucide-react';
import type { ReminderOffsetMinutes, Task } from '../../types';
import { getScheduledDate, normalizeDurationMinutes } from '../../lib/dateUtils';
import { ExpandableModal } from '../common/ExpandableModal';
import { findNextFreeSlot } from '../../lib/calendarScheduling';
import { ReminderOffsetPicker } from '../tasks/ReminderOffsetPicker';
import { downloadIcs } from '../../lib/ics';

interface ScheduleTaskSheetProps {
  task: Task | null;
  defaultDate: string;
  onClose: () => void;
  onSchedule: (taskId: string, input: { date: string; time?: string; durationMinutes?: number; reminderOffsets?: ReminderOffsetMinutes[] }) => void;
  onUnschedule: (taskId: string) => void;
  tasks?: Task[];
  onSkipOccurrence?: (taskId: string, date: string) => void;
  onRescheduleOccurrence?: (taskId: string, date: string, rescheduledDate: string) => void;
  onEndSeries?: (taskId: string, date: string) => void;
  onDeleteSeries?: (taskId: string) => void;
}

export function ScheduleTaskSheet({
  task,
  defaultDate,
  onClose,
  onSchedule,
  onUnschedule,
  tasks = [],
  onSkipOccurrence,
  onRescheduleOccurrence,
  onEndSeries,
  onDeleteSeries,
}: ScheduleTaskSheetProps) {
  const [date, setDate] = useState(() => task
    ? task.isRecurring ? defaultDate : getScheduledDate(task) ?? defaultDate
    : defaultDate
  );
  const [time, setTime] = useState(() => task?.scheduledTime ?? '');
  const [duration, setDuration] = useState(() => normalizeDurationMinutes(task?.durationMinutes, 30));
  const [reminderOffsets, setReminderOffsets] = useState<ReminderOffsetMinutes[]>(() => task?.scheduledReminderOffsets ?? []);

  if (!task) return null;

  const isScheduled = Boolean(getScheduledDate(task));
  const setNextFreeSlot = () => {
    const minute = findNextFreeSlot(tasks, date, duration, time
      ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
      : 6 * 60, 24 * 60, 15, task.id);
    if (minute !== null) {
      setTime(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
    }
  };

  return (
    <ExpandableModal
      isOpen={Boolean(task)}
      onClose={onClose}
      title="Calendar block"
      icon={<CalendarClock className="h-5 w-5 text-[var(--action)]" />}
      maxWidth="max-w-md"
    >
      {() => (
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (task.isRecurring && onRescheduleOccurrence) {
              onRescheduleOccurrence(task.id, defaultDate, date);
              onClose();
              return;
            }
            onSchedule(task.id, {
              date,
              time: time || undefined,
              durationMinutes: time ? normalizeDurationMinutes(duration, 30) : undefined,
              reminderOffsets: time && reminderOffsets.length > 0 ? reminderOffsets : undefined,
            });
            onClose();
          }}
        >
          <p className="truncate border-b border-[var(--rule)] pb-3 text-sm font-semibold text-[var(--ink)]">
            {task.title}
          </p>
          <label className="block text-sm font-medium text-[var(--ink-secondary)]">
            Date
            <input
              autoFocus
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="ui-field-control mt-1 min-h-11 w-full px-3"
            />
          </label>

          {!task.isRecurring && <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-[var(--ink-secondary)]">
              Start time
              <input
                type="time"
                step={900}
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  if (!event.target.value) setReminderOffsets([]);
                }}
                className="ui-field-control mt-1 min-h-11 w-full px-3"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--ink-secondary)]">
              Duration
              <input
                type="number"
                min={15}
                max={1440}
                step={15}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                disabled={!time}
                className="ui-field-control mt-1 min-h-11 w-full px-3 disabled:opacity-50"
              />
            </label>
          </div>}
          {!task.isRecurring && <p className="text-xs text-[var(--ink-muted)]">
            Leave start time blank for a flexible Calendar block.
          </p>}
          {!task.isRecurring && time && (
            <ReminderOffsetPicker label="Start reminders" value={reminderOffsets} onChange={setReminderOffsets} />
          )}
          {!task.isRecurring && <button
            type="button"
            onClick={setNextFreeSlot}
            className="ui-control ui-button ui-button--secondary min-h-11 px-4 text-sm font-medium"
          >
            Find next free time
          </button>}

          {task.isRecurring && (
            <div className="space-y-2 border-y border-[var(--warning)] bg-[var(--warning-soft)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--warning)]">Recurring occurrence</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => { onSkipOccurrence?.(task.id, date); onClose(); }} className="ui-control min-h-11 border border-[var(--warning)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--warning)]">
                  <SkipForward className="mr-1 inline h-3.5 w-3.5" /> This occurrence
                </button>
                <button type="button" onClick={() => { onEndSeries?.(task.id, date); onClose(); }} className="ui-control min-h-11 border border-[var(--rule-strong)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--ink-secondary)]">
                  End this and future
                </button>
                <button type="button" onClick={() => { if (window.confirm('Delete the entire recurring series?')) { onDeleteSeries?.(task.id); onClose(); } }} className="ui-control min-h-11 border border-[var(--danger)] bg-[var(--danger-soft)] px-2 text-xs font-medium text-[var(--danger)]">
                  Entire series
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            {isScheduled && task.scheduledTime && (
              <button
                type="button"
                onClick={() => downloadIcs([task], `assisy-${task.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)}
                className="ui-control min-h-11 px-4 text-sm font-medium text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]"
              >
                <Download className="mr-1 inline h-4 w-4" /> Export
              </button>
            )}
            {isScheduled && !task.isRecurring && (
              <button
                type="button"
                onClick={() => {
                  onUnschedule(task.id);
                  onClose();
                }}
                className="ui-control ui-button ui-button--danger min-h-11 px-4 text-sm font-medium"
              >
                Return to Backlog
              </button>
            )}
            <button
              type="submit"
              className="ui-control ui-button ui-button--primary min-h-11 px-5 text-sm font-semibold"
            >
              {task.isRecurring ? 'Move this occurrence' : 'Save Calendar block'}
            </button>
          </div>
        </form>
      )}
    </ExpandableModal>
  );
}
