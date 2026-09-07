import { useState } from 'react';
import { CalendarClock, Inbox } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { SelectField, TextField } from '../ui';
import { getLocalDateString, getScheduledDate } from '../../lib/dateUtils';
import type { Effort, Goal, Priority, Task, TaskCategory } from '../../types';

export type ClarifyAction = 'keep' | 'backlog' | 'today' | 'schedule';

export interface ClarifyTaskData {
  title: string;
  category: TaskCategory;
  priority: Priority;
  effort: Effort;
  goalId?: string;
  dueDate?: Date;
  dueTime?: string;
  durationMinutes?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface ClarifyTaskSheetProps {
  task: Task;
  goals: Goal[];
  onClose: () => void;
  onSubmit: (action: ClarifyAction, data: ClarifyTaskData) => void;
}

export function ClarifyTaskSheet({ task, goals, onClose, onSubmit }: ClarifyTaskSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [category, setCategory] = useState<TaskCategory>(task.category);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [effort, setEffort] = useState<Effort>(task.effort);
  const [goalId, setGoalId] = useState(task.goalId ?? '');
  const [dueDate, setDueDate] = useState(task.dueDate ? getLocalDateString(new Date(task.dueDate)) : '');
  const [dueTime, setDueTime] = useState(task.dueTime ?? '');
  const [durationMinutes, setDurationMinutes] = useState(task.durationMinutes?.toString() ?? '');
  const [scheduledDate, setScheduledDate] = useState(getScheduledDate(task) ?? '');
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime ?? '');

  const activeGoals = goals.filter(goal => goal.status === 'Active' && goal.category === category);

  const submit = (action: ClarifyAction) => {
    if (!title.trim()) return;
    if (action === 'schedule' && !scheduledDate) return;
    onSubmit(action, {
      title: title.trim(),
      category,
      priority,
      effort,
      goalId: goalId || undefined,
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : undefined,
      dueTime: dueDate && dueTime ? dueTime : undefined,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      scheduledDate: action === 'schedule' ? scheduledDate : undefined,
      scheduledTime: action === 'schedule' && scheduledDate ? scheduledTime || undefined : undefined,
    });
  };

  return (
    <ExpandableModal
      isOpen
      onClose={onClose}
      title="Clarify task"
      icon={<Inbox className="h-5 w-5 text-[var(--action)]" />}
      maxWidth="max-w-lg"
    >
      {() => (
        <div className="space-y-5 p-5">
          <p className="border-y border-[var(--rule)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--ink-secondary)]">
            Decide where this task belongs. You can keep it in Inbox, move it to Backlog, assign it to Today, or reserve a Calendar block.
          </p>
          <TextField label="Title" value={title} onChange={event => setTitle(event.target.value)} autoFocus />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label="Category" value={category} onChange={event => {
              const next = event.target.value as TaskCategory;
              setCategory(next);
              if (!goals.some(goal => goal.id === goalId && goal.category === next)) setGoalId('');
            }}>
              <option value="Personal">Personal</option>
              <option value="Financial">Financial</option>
              <option value="Professional">Professional</option>
            </SelectField>
            <SelectField label="Priority" value={priority} onChange={event => setPriority(event.target.value as Priority)}>
              <option value="High">High</option>
              <option value="Low">Low</option>
            </SelectField>
            <SelectField label="Effort" value={effort} onChange={event => setEffort(event.target.value as Effort)}>
              <option value="Low">Low</option>
              <option value="High">High</option>
            </SelectField>
          </div>

          <SelectField label="Goal (optional)" value={goalId} onChange={event => setGoalId(event.target.value)}>
            <option value="">No goal</option>
            {activeGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </SelectField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField label="Deadline (optional)" type="date" value={dueDate} onChange={event => {
              setDueDate(event.target.value);
              if (!event.target.value) setDueTime('');
            }} />
            <TextField label="Due time (optional)" type="time" value={dueTime} disabled={!dueDate} onChange={event => setDueTime(event.target.value)} />
            <TextField label="Duration (minutes)" type="number" min="5" step="5" value={durationMinutes} onChange={event => setDurationMinutes(event.target.value)} />
          </div>

          <section className="border-y border-[var(--rule-strong)] bg-[var(--surface-subtle)] p-3" aria-labelledby="calendar-block-heading">
            <div id="calendar-block-heading" className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <CalendarClock size={16} />
              Calendar block
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Date" type="date" min={getLocalDateString()} value={scheduledDate} onChange={event => {
                setScheduledDate(event.target.value);
                if (!event.target.value) setScheduledTime('');
              }} />
              <TextField label="Time (optional)" type="time" value={scheduledTime} disabled={!scheduledDate} onChange={event => setScheduledTime(event.target.value)} />
            </div>
            <button
              type="button"
              disabled={!scheduledDate || !title.trim()}
              onClick={() => submit('schedule')}
              className="ui-control ui-button ui-button--primary mt-3 min-h-11 w-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign calendar block
            </button>
          </section>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => submit('keep')} className="ui-control ui-button ui-button--secondary min-h-11 px-3 text-sm font-medium">
              Keep in Inbox
            </button>
            <button type="button" onClick={() => submit('backlog')} className="ui-control ui-button ui-button--secondary min-h-11 px-3 text-sm font-medium">
              Move to Backlog
            </button>
            <button type="button" onClick={() => submit('today')} className="ui-control ui-button ui-button--primary min-h-11 px-3 text-sm font-medium">
              Assign to Today
            </button>
          </div>
        </div>
      )}
    </ExpandableModal>
  );
}
