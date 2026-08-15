import { useState, useEffect, useRef } from 'react';
import type { Task, TaskCategory, Priority, Effort, Goal, RecurrencePattern } from '../../types';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    <div className={`mt-3 p-3 rounded-xl border ${isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200'}`}>
      <div className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
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
                ? isDark ? 'bg-violet-500/20 text-white' : 'bg-violet-100 text-slate-800'
                : isDark ? 'bg-white/5 text-gray-400' : 'bg-white text-slate-500'
            }`}
          >
            {st.selected
              ? <CheckSquare size={15} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
              : <Square size={15} className={isDark ? 'text-gray-600' : 'text-slate-300'} />
            }
            <span className="flex-1">{st.title}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              st.effort === 'High'
                ? isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
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
        <p className={`mt-1 text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{decomposeError}</p>
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
      />
    </div>
  );

  const dueDateField = (
    <TextField
      label="Due Date (optional)"
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      min={getLocalDateString()}
    />
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
                  ? isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'
                  : cat === 'Financial'
                  ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : isDark ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-slate-100 text-slate-600 border-slate-300'
                : isDark
                  ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
                    ? isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200'
                    : isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200'
                  : isDark
                    ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
                    ? isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-600 border-orange-200'
                    : isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : isDark
                    ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
          <div className={`w-10 h-6 rounded-full transition-all ${isRecurring ? 'bg-violet-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'} mt-1`} />
          </div>
        </div>
        <span className={`text-sm transition-colors ${isDark ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-600 group-hover:text-slate-800'}`}>Recurring task</span>
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
                    ? isDark ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-violet-50 text-violet-600 border-violet-200'
                    : isDark
                      ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
                      ? isDark ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'bg-violet-100 text-violet-700 border border-violet-200'
                      : isDark ? 'bg-white/5 text-gray-500 border border-white/10' : 'bg-slate-50 text-slate-400 border border-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
          {recurrencePattern === 'monthly' && (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>On day</span>
              <SelectField
                aria-label="Day of month"
                value={monthDay}
                onChange={e => setMonthDay(Number(e.target.value))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>of every month</span>
            </div>
          )}
          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
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
        ? <Pencil className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
        : <Sparkles className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex flex-col sm:flex-row sm:h-full">
            <div className={`flex-1 flex flex-col p-6 sm:p-8 space-y-6 sm:border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {titleField(true)}
              {notesField(true)}
            </div>
            <div className={`flex-shrink-0 p-6 sm:p-6 space-y-6 sm:overflow-y-auto sm:w-80 border-t sm:border-t-0 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Task details</h3>
              {dueDateField}
              {categoryField}
              {goalField}
              {priorityEffortField}
              {recurringField}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {titleField(false)}
            {notesField(false)}
            {dueDateField}
            {categoryField}
            {goalField}
            {priorityEffortField}
            {recurringField}
          </div>
        )
      }
    </ExpandableModal>
  );
}
