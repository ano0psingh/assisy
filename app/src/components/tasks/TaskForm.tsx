import { useState, useEffect, useRef } from 'react';
import type { Task, TaskCategory, Priority, Effort, Goal, RecurrencePattern, RecurrenceRule, ReminderOffsetMinutes } from '../../types';
import { Sparkles, Pencil, Loader2, Check, Square, CheckSquare } from 'lucide-react';
import { TiptapEditor } from '../common/TiptapEditor';
import { ExpandableModal } from '../common/ExpandableModal';
import { askAIJson, isAIConfigured } from '../../lib/ai';
import { getLocalDateString } from '../../lib/dateUtils';
import { Button, SelectField, TextField } from '../ui';
import { ReminderOffsetPicker } from './ReminderOffsetPicker';

interface SuggestedSubtask {
  title: string;
  effort: 'High' | 'Low';
  selected: boolean;
}

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceRule?: RecurrenceRule;
    specificDays?: number[];
    monthDay?: number;
    goalId?: string;
    dueDate?: Date;
    dueTime?: string;
    dueReminderOffsets?: ReminderOffsetMinutes[];
    addToToday?: boolean;
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
  goals?: Goal[];
  editingTask?: Task | null;
  defaultAddToToday?: boolean;
  onCreateSubtasks?: (subtasks: { title: string; effort: Effort }[]) => void;
}

export function TaskForm({ onSubmit, onCancel, isOpen, goals = [], editingTask, defaultAddToToday = false, onCreateSubtasks }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState<number>(1);
  const [monthEnd, setMonthEnd] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceAdvanced, setRecurrenceAdvanced] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [dueReminderOffsets, setDueReminderOffsets] = useState<ReminderOffsetMinutes[]>([]);

  const [subtasks, setSubtasks] = useState<SuggestedSubtask[]>([]);
  const [decomposing, setDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setEffort(editingTask.effort);
      setIsRecurring(editingTask.isRecurring);
      setRecurrencePattern(editingTask.recurrencePattern || 'daily');
      setSpecificDays(editingTask.specificDays || []);
      setMonthDay(editingTask.monthDay ?? 1);
      setMonthEnd(editingTask.recurrenceRule?.monthEnd ?? false);
      setRecurrenceInterval(editingTask.recurrenceRule?.interval ?? 1);
      setRecurrenceEnd(editingTask.recurrenceRule?.endDate ? 'date' : editingTask.recurrenceRule?.count ? 'count' : 'never');
      setRecurrenceEndDate(editingTask.recurrenceRule?.endDate ?? '');
      setRecurrenceCount(editingTask.recurrenceRule?.count ?? 10);
      setRecurrenceAdvanced(Boolean(editingTask.recurrenceRule
        && ((editingTask.recurrenceRule.interval ?? 1) > 1 || editingTask.recurrenceRule.endDate || editingTask.recurrenceRule.count)));
      setSelectedGoalId(editingTask.goalId || '');
      setDueDate(editingTask.dueDate ? getLocalDateString(new Date(editingTask.dueDate)) : '');
      setDueTime(editingTask.dueTime || '');
      setDueReminderOffsets(editingTask.dueReminderOffsets || []);
    } else {
      resetForm();
    }
  }, [editingTask]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Personal');
    setPriority('High');
    setEffort('Low');
    setIsRecurring(false);
    setRecurrencePattern('daily');
    setSpecificDays([]);
    setMonthDay(1);
    setMonthEnd(false);
    setRecurrenceInterval(1);
    setRecurrenceEnd('never');
    setRecurrenceEndDate('');
    setRecurrenceCount(10);
    setRecurrenceAdvanced(false);
    setSelectedGoalId('');
    setDueDate('');
    setDueTime('');
    setDueReminderOffsets([]);
    setSubtasks([]);
    setDecomposeError(null);
    setTitleError(null);
  };

  const availableGoals = goals.filter(g => g.status === 'Active' && g.category === category);

  const handleDecompose = async () => {
    setDecomposing(true);
    setDecomposeError(null);
    try {
      const descText = description.replace(/<[^>]*>/g, '').trim();
      const prompt = `Break this task into 3-6 smaller, actionable sub-tasks. Task: ${title}. Description: ${descText || 'None'}. Respond with JSON: {"subtasks": [{"title": string, "effort": "High"|"Low"}]}`;
      const result = await askAIJson<{ subtasks: { title: string; effort: 'High' | 'Low' }[] }>(prompt);
      setSubtasks(result.subtasks.map(st => ({ ...st, selected: true })));
    } catch {
      setDecomposeError('Failed to break down task. Please try again.');
    } finally {
      setDecomposing(false);
    }
  };

  const handleCreateSelected = () => {
    const selected = subtasks.filter(s => s.selected).map(s => ({ title: s.title, effort: s.effort }));
    if (selected.length > 0 && onCreateSubtasks) {
      onCreateSubtasks(selected);
    }
    setSubtasks([]);
  };

  const toggleSubtask = (index: number) => {
    setSubtasks(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
  };

  const handleSubmit = () => {
    // Previously this returned silently, so pressing Create appeared to do
    // nothing at all.
    if (!title.trim()) {
      setTitleError('Give the task a title so you can recognise it later.');
      titleInputRef.current?.focus();
      return;
    }
    setTitleError(null);
    const frequency = recurrencePattern === 'specific_days' ? 'weekly' : recurrencePattern;
    const startDate = editingTask?.recurrenceRule?.startDate
      ?? (editingTask ? getLocalDateString(new Date(editingTask.createdAt)) : getLocalDateString());
    const recurrenceRule: RecurrenceRule | undefined = isRecurring ? {
      frequency,
      interval: Math.max(1, recurrenceInterval),
      startDate,
      weekdays: frequency === 'weekly' ? specificDays : undefined,
      monthDay: frequency === 'monthly' && !monthEnd ? monthDay : undefined,
      monthEnd: frequency === 'monthly' ? monthEnd : undefined,
      endDate: recurrenceEnd === 'date' ? recurrenceEndDate || undefined : undefined,
      count: recurrenceEnd === 'count' ? Math.max(1, recurrenceCount) : undefined,
      overrides: editingTask?.recurrenceRule?.overrides,
    } : undefined;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      effort,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      recurrenceRule,
      specificDays: isRecurring && (recurrencePattern === 'specific_days' || recurrencePattern === 'weekly') ? specificDays : undefined,
      monthDay: isRecurring && recurrencePattern === 'monthly' && !monthEnd ? monthDay : undefined,
      goalId: selectedGoalId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      // A time without a date has nothing to attach to, so it is dropped rather
      // than saved as a value no view could place.
      dueTime: dueDate && dueTime ? dueTime : undefined,
      dueReminderOffsets: dueDate && dueTime && dueReminderOffsets.length > 0 ? dueReminderOffsets : undefined,
      addToToday: !editingTask ? defaultAddToToday : undefined,
    });
    resetForm();
  };

  const handleCategoryChange = (newCategory: TaskCategory) => {
    setCategory(newCategory);
    const currentGoal = goals.find(g => g.id === selectedGoalId);
    if (currentGoal && currentGoal.category !== newCategory) {
      setSelectedGoalId('');
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const isEditing = !!editingTask;
  const recurrenceStartDate = editingTask?.recurrenceRule?.startDate
    ?? (editingTask ? getLocalDateString(new Date(editingTask.createdAt)) : getLocalDateString());

  const showDecomposeButton = isAIConfigured() && title.trim().length > 30 && !editingTask;

  const subtaskSection = subtasks.length > 0 ? (
    <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--action)] bg-[var(--action-soft)] p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--action)]">
        <Sparkles size={14} />
        Suggested Sub-tasks
      </div>
      <div className="space-y-2">
        {subtasks.map((st, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleSubtask(i)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              st.selected
                ? 'bg-[var(--selected)] text-[var(--ink)]'
                : 'bg-[var(--surface-raised)] text-[var(--ink-secondary)]'
            }`}
          >
            {st.selected
              ? <CheckSquare size={15} className="text-[var(--action)]" />
              : <Square size={15} className="text-[var(--rule-strong)]" />
            }
            <span className="flex-1">{st.title}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              st.effort === 'High'
                ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                : 'bg-[var(--success-soft)] text-[var(--success)]'
            }`}>{st.effort}</span>
          </button>
        ))}
      </div>
      {onCreateSubtasks && subtasks.some(s => s.selected) && (
        <Button
          type="button"
          variant="primary"
          block
          icon={Check}
          onClick={handleCreateSelected}
          className="mt-3"
        >
          Create {subtasks.filter(s => s.selected).length} selected
        </Button>
      )}
    </div>
  ) : null;

  // Both variants can be mounted by the modal at once; TextField derives its own
  // id with useId, so the two no longer have to be named apart by hand.
  const titleField = (isFS: boolean) => {
    return (
    <div>
      <TextField
        ref={titleInputRef}
        label="Title *"
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null); }}
        error={titleError ?? undefined}
        className={isFS ? 'py-4 text-lg' : ''}
        placeholder="What needs to be done?"
        autoFocus
      />
      {showDecomposeButton && subtasks.length === 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleDecompose}
          disabled={decomposing}
          className="mt-2"
        >
          {decomposing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {decomposing ? 'Breaking down...' : 'Break this down'}
        </Button>
      )}
      {decomposeError && (
        <p className="mt-1 text-xs text-[var(--danger)]">{decomposeError}</p>
      )}
      {subtaskSection}
    </div>
    );
  };

  const notesField = (isFS: boolean) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className="mb-2 block text-sm font-semibold text-[var(--ink-secondary)]">Notes</label>
      <TiptapEditor
        content={description}
        onChange={setDescription}
        placeholder={'Add notes, checklists, or details...'}
        size={isFS ? 'tall' : 'compact'}
      />
    </div>
  );

  /**
   * The time only appears once a date is picked, because on its own it has
   * nothing to attach to and the browser would happily collect a value that no
   * view could place. Clearing the date clears the time with it, so the two can
   * never disagree.
   */
  const dueDateField = (
    <div className="space-y-3">
      <div className={dueDate ? 'grid grid-cols-2 gap-3' : ''}>
        <TextField
          label="Due Date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            if (!e.target.value) {
              setDueTime('');
              setDueReminderOffsets([]);
            }
          }}
          min={getLocalDateString()}
        />
        {dueDate && (
          <TextField
            label="Time (optional)"
            type="time"
            value={dueTime}
            onChange={(e) => {
              setDueTime(e.target.value);
              if (!e.target.value) setDueReminderOffsets([]);
            }}
          />
        )}
      </div>
      {dueDate && dueTime && (
        <ReminderOffsetPicker label="Deadline reminders" value={dueReminderOffsets} onChange={setDueReminderOffsets} />
      )}
    </div>
  );

  const categoryField = (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--ink-secondary)]">Category</label>
      <div className="grid grid-cols-3 gap-2">
        {(['Personal', 'Financial', 'Professional'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition-colors ${
              category === cat
                ? cat === 'Personal'
                  ? 'border-[var(--info)] bg-[var(--info-soft)] text-[var(--info)]'
                  : cat === 'Financial'
                  ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                  : 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );

  const goalField = availableGoals.length > 0 ? (
    <SelectField
      label="Link to Goal (optional)"
      value={selectedGoalId}
      onChange={(e) => setSelectedGoalId(e.target.value)}
    >
      <option value="">No goal</option>
      {availableGoals.map(goal => (
        <option key={goal.id} value={goal.id}>{goal.title}</option>
      ))}
    </SelectField>
  ) : null;

  const priorityEffortField = (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-[var(--ink-secondary)]">Priority</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition-colors ${
                priority === p
                  ? p === 'High'
                    ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                    : 'border-[var(--rule-strong)] bg-[var(--surface-subtle)] text-[var(--ink-secondary)]'
                  : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-[var(--ink-secondary)]">Effort</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEffort(e)}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition-colors ${
                effort === e
                  ? e === 'High'
                    ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]'
                    : 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                  : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const recurringField = (
    <div className="space-y-3">
      <label className="flex items-center space-x-3 cursor-pointer group">
        <div className="relative">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="sr-only" />
          <div className={`h-6 w-10 rounded-full border transition-colors ${isRecurring ? 'border-[var(--action)] bg-[var(--action)]' : 'border-[var(--rule)] bg-[var(--surface-inset)]'}`}>
            <div className={`mt-1 h-4 w-4 transform rounded-full bg-[var(--surface-raised)] shadow-[var(--shadow-soft)] transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </div>
        <span className="text-sm text-[var(--ink-secondary)] transition-colors group-hover:text-[var(--ink)]">Recurring task</span>
      </label>
      {isRecurring && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-5 gap-2">
            {([
              { value: 'daily' as const, label: 'Daily' },
              { value: 'weekly' as const, label: 'Weekly' },
              { value: 'monthly' as const, label: 'Monthly' },
              { value: 'yearly' as const, label: 'Yearly' },
              { value: 'specific_days' as const, label: 'Custom' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecurrencePattern(value)}
                className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition-colors ${
                  recurrencePattern === value
                    ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                    : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {(recurrencePattern === 'specific_days' || recurrencePattern === 'weekly') && (
            <div className="flex gap-2 animate-fade-in">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSpecificDays(prev =>
                    prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                  )}
                  className={`min-h-11 flex-1 rounded-[var(--radius-sm)] border py-2 text-xs font-medium transition-colors ${
                    specificDays.includes(i)
                      ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                      : 'border-[var(--rule)] bg-[var(--surface-subtle)] text-[var(--ink-muted)]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
          {recurrencePattern === 'monthly' && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in">
              <span className="text-sm text-[var(--ink-muted)]">On day</span>
              <SelectField
                aria-label="Day of month"
                value={monthDay}
                onChange={e => setMonthDay(Number(e.target.value))}
                disabled={monthEnd}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
              <span className="text-sm text-[var(--ink-muted)]">of every month</span>
              <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
                <input type="checkbox" checked={monthEnd} onChange={event => setMonthEnd(event.target.checked)} />
                Last day
              </label>
            </div>
          )}
          <button
            type="button"
            onClick={() => setRecurrenceAdvanced(value => !value)}
            className="min-h-11 text-xs font-medium text-[var(--action)] hover:text-[var(--action-hover)]"
          >
            {recurrenceAdvanced ? 'Hide repeat options' : 'More repeat options'}
          </button>
          {recurrenceAdvanced && (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--ink-muted)]">Every</span>
                <input
                  aria-label="Repeat interval"
                  type="number"
                  min={1}
                  max={365}
                  value={recurrenceInterval}
                  onChange={event => setRecurrenceInterval(Math.max(1, Number(event.target.value)))}
                  className="input min-h-11 w-20 px-2"
                />
                <span className="text-sm text-[var(--ink-muted)]">
                  {recurrencePattern === 'specific_days' ? 'weeks' : `${recurrencePattern}s`}
                </span>
              </div>
              <SelectField label="Ends" value={recurrenceEnd} onChange={event => setRecurrenceEnd(event.target.value as typeof recurrenceEnd)}>
                <option value="never">Never</option>
                <option value="date">On a date</option>
                <option value="count">After a number of occurrences</option>
              </SelectField>
              {recurrenceEnd === 'date' && (
                <TextField label="Last occurrence date" type="date" value={recurrenceEndDate} min={recurrenceStartDate} onChange={event => setRecurrenceEndDate(event.target.value)} />
              )}
              {recurrenceEnd === 'count' && (
                <TextField label="Number of occurrences" type="number" min={1} value={recurrenceCount} onChange={event => setRecurrenceCount(Number(event.target.value))} />
              )}
            </div>
          )}
          <p className="text-xs text-[var(--ink-muted)]">
            {recurrencePattern === 'daily' ? 'Repeats every day' :
             recurrencePattern === 'weekly' ? 'Repeats every week on this day' :
             recurrencePattern === 'monthly' ? `Repeats on the ${monthDay}${monthDay === 1 ? 'st' : monthDay === 2 ? 'nd' : monthDay === 3 ? 'rd' : 'th'} of every month` :
             recurrencePattern === 'yearly' ? 'Repeats every year' :
             specificDays.length === 0 ? 'Select days' :
             `Every ${specificDays.sort().map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`}
          </p>
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end space-x-3">
      <Button type="button" variant="ghost" size="lg" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" variant="primary" size="lg" onClick={handleSubmit}>
        {isEditing ? 'Save Changes' : 'Create Task'}
      </Button>
    </div>
  );

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      icon={isEditing
        ? <Pencil className="h-5 w-5" />
        : <Sparkles className="h-5 w-5" />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex flex-col sm:flex-row sm:h-full">
            <div className="flex flex-1 flex-col space-y-6 border-[var(--rule)] p-6 sm:border-r sm:p-8">
              {titleField(true)}
              {notesField(true)}
            </div>
            <div className="flex-shrink-0 space-y-6 border-t border-[var(--rule)] bg-[var(--surface)] p-6 sm:w-80 sm:overflow-y-auto sm:border-t-0">
              <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Task details</h3>
              {dueDateField}
              {categoryField}
              {goalField}
              {priorityEffortField}
              {recurringField}
            </div>
          </div>
        ) : (
          /* Notes comes last here, though it is second in the fullscreen layout
             above. It is the largest field and the one least often touched when
             editing an existing task, and while it sat second the quick decisions —
             when it is due, how it is prioritised — were all below the fold. Writing
             at length is what the expand button is for. */
          <div className="p-6 space-y-6">
            {titleField(false)}
            {dueDateField}
            {priorityEffortField}
            {categoryField}
            {goalField}
            {recurringField}
            {notesField(false)}
          </div>
        )
      }
    </ExpandableModal>
  );
}
