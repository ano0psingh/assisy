import { useState, useEffect, useRef } from 'react';
import type { Task, TaskCategory, Priority, Effort, Goal, RecurrencePattern } from '../../types';
import { Sparkles, Pencil, Loader2, Check, Square, CheckSquare } from 'lucide-react';
import { TiptapEditor } from '../common/TiptapEditor';
import { ExpandableModal } from '../common/ExpandableModal';
import { askAIJson, isAIConfigured } from '../../lib/ai';
import { getLocalDateString } from '../../lib/dateUtils';
import { Button, SelectField, TextField } from '../ui';

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
    specificDays?: number[];
    monthDay?: number;
    goalId?: string;
    dueDate?: Date;
    dueTime?: string;
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
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');

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
      setSelectedGoalId(editingTask.goalId || '');
      setDueDate(editingTask.dueDate ? getLocalDateString(new Date(editingTask.dueDate)) : '');
      setDueTime(editingTask.dueTime || '');
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
    setSelectedGoalId('');
    setDueDate('');
    setDueTime('');
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
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      effort,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      specificDays: isRecurring && recurrencePattern === 'specific_days' ? specificDays : undefined,
      monthDay: isRecurring && recurrencePattern === 'monthly' ? monthDay : undefined,
      goalId: selectedGoalId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      // A time without a date has nothing to attach to, so it is dropped rather
      // than saved as a value no view could place.
      dueTime: dueDate && dueTime ? dueTime : undefined,
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

  const showDecomposeButton = isAIConfigured() && title.trim().length > 30 && !editingTask;

  const subtaskSection = subtasks.length > 0 ? (
    <div className={`mt-3 p-3 rounded-xl border bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20`}>
      <div className={`flex items-center gap-2 text-sm font-medium mb-2 text-violet-700 dark:text-violet-300`}>
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
                ? 'bg-violet-100 text-slate-800 dark:bg-violet-500/20 dark:text-white'
                : 'bg-white text-slate-500 dark:bg-white/5 dark:text-gray-400'
            }`}
          >
            {st.selected
              ? <CheckSquare size={15} className={'text-violet-600 dark:text-violet-400'} />
              : <Square size={15} className={'text-slate-300 dark:text-gray-400'} />
            }
            <span className="flex-1">{st.title}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              st.effort === 'High'
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
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
        <p className={`mt-1 text-xs text-red-600 dark:text-red-400`}>{decomposeError}</p>
      )}
      {subtaskSection}
    </div>
    );
  };

  const notesField = (isFS: boolean) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Notes</label>
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
    <div className={dueDate ? 'grid grid-cols-2 gap-3' : ''}>
      <TextField
        label="Due Date (optional)"
        type="date"
        value={dueDate}
        onChange={(e) => {
          setDueDate(e.target.value);
          if (!e.target.value) setDueTime('');
        }}
        min={getLocalDateString()}
      />
      {dueDate && (
        <TextField
          label="Time (optional)"
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
        />
      )}
    </div>
  );

  const categoryField = (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Category</label>
      <div className="grid grid-cols-3 gap-2">
        {(['Personal', 'Financial', 'Professional'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
              category === cat
                ? cat === 'Personal'
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                  : cat === 'Financial'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/10'
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
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Priority</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                priority === p
                  ? p === 'High'
                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                    : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Effort</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEffort(e)}
              className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                effort === e
                  ? e === 'High'
                    ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/10'
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
          <div className={`w-10 h-6 rounded-full transition-all ${isRecurring ? 'bg-violet-500' : 'bg-slate-200 dark:bg-white/10'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'} mt-1`} />
          </div>
        </div>
        <span className={`text-sm transition-colors text-slate-600 group-hover:text-slate-800 dark:text-gray-400 dark:group-hover:text-gray-200`}>Recurring task</span>
      </label>
      {isRecurring && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-4 gap-2">
            {([
              { value: 'daily' as const, label: 'Daily' },
              { value: 'weekly' as const, label: 'Weekly' },
              { value: 'monthly' as const, label: 'Monthly' },
              { value: 'specific_days' as const, label: 'Custom' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecurrencePattern(value)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                  recurrencePattern === value
                    ? 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {recurrencePattern === 'specific_days' && (
            <div className="flex gap-2 animate-fade-in">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSpecificDays(prev =>
                    prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                  )}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    specificDays.includes(i)
                      ? 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-500/30 dark:text-violet-300 dark:border-violet-500/40'
                      : 'bg-slate-50 text-slate-400 border border-slate-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/10'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
          {recurrencePattern === 'monthly' && (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className={`text-sm text-slate-500 dark:text-gray-400`}>On day</span>
              <SelectField
                aria-label="Day of month"
                value={monthDay}
                onChange={e => setMonthDay(Number(e.target.value))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
              <span className={`text-sm text-slate-500 dark:text-gray-400`}>of every month</span>
            </div>
          )}
          <p className={`text-xs text-slate-400 dark:text-gray-400`}>
            {recurrencePattern === 'daily' ? 'Repeats every day' :
             recurrencePattern === 'weekly' ? 'Repeats every week on this day' :
             recurrencePattern === 'monthly' ? `Repeats on the ${monthDay}${monthDay === 1 ? 'st' : monthDay === 2 ? 'nd' : monthDay === 3 ? 'rd' : 'th'} of every month` :
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
        ? <Pencil className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />
        : <Sparkles className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex flex-col sm:flex-row sm:h-full">
            <div className={`flex-1 flex flex-col p-6 sm:p-8 space-y-6 sm:border-r border-slate-200 dark:border-white/10`}>
              {titleField(true)}
              {notesField(true)}
            </div>
            <div className={`flex-shrink-0 p-6 sm:p-6 space-y-6 sm:overflow-y-auto sm:w-80 border-t sm:border-t-0 border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-slate-400 dark:text-gray-500`}>Task details</h3>
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
