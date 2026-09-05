import { useState } from 'react';
import { CalendarClock, Inbox } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { SelectField, TextField } from '../ui';
import { getLocalDateString } from '../../lib/dateUtils';
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
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate ?? '');
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
      title="Clarify inbox task"
      icon={<Inbox className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
      maxWidth="max-w-lg"
    >
      {() => (
        <div className="space-y-4 p-5">
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

          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
              <CalendarClock size={16} />
              Schedule for a date and time
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
              className="mt-3 min-h-11 w-full rounded-xl bg-violet-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Schedule date/time
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => submit('keep')} className="min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10">
              Keep in Inbox
            </button>
            <button type="button" onClick={() => submit('backlog')} className="min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10">
              Clarify to Backlog
            </button>
            <button type="button" onClick={() => submit('today')} className="min-h-11 rounded-xl bg-violet-50 px-3 text-sm font-medium text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300">
              Schedule Today
            </button>
          </div>
        </div>
      )}
    </ExpandableModal>
  );
}
