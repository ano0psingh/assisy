import { useState, useEffect } from 'react';
import type { Task, TaskCategory, Priority, Effort, Goal, RecurrencePattern } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Target, Pencil, Calendar } from 'lucide-react';
import { NotesEditor } from '../common/NotesEditor';
import { ExpandableModal } from '../common/ExpandableModal';

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    goalId?: string;
    dueDate?: Date;
    addToToday?: boolean;
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
  goals?: Goal[];
  editingTask?: Task | null;
  defaultAddToToday?: boolean;
}

export function TaskForm({ onSubmit, onCancel, isOpen, goals = [], editingTask, defaultAddToToday = false }: TaskFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setEffort(editingTask.effort);
      setIsRecurring(editingTask.isRecurring);
      setRecurrencePattern(editingTask.recurrencePattern || 'daily');
      setSelectedGoalId(editingTask.goalId || '');
      setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '');
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
    setSelectedGoalId('');
    setDueDate('');
  };

  const availableGoals = goals.filter(g => g.status === 'Active' && g.category === category);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      effort,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
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

  const inputCls = `w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
    isDark
      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500 placeholder-gray-600'
      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500 placeholder-slate-400'
  }`;

  const titleField = (isFS: boolean) => (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Title *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${inputCls} ${isFS ? 'py-3.5 text-lg' : ''}`}
        placeholder="What needs to be done?"
        autoFocus
      />
    </div>
  );

  const notesField = (isFS: boolean) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Notes</label>
      <NotesEditor
        value={description}
        onChange={setDescription}
        placeholder={'Add notes, checklists, or details...\n\nTip: Type "- " for bullets, "[] " for checklists'}
        minRows={isFS ? 14 : 4}
        maxRows={isFS ? 30 : 12}
      />
    </div>
  );

  const dueDateField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        <span className="flex items-center space-x-2">
          <Calendar size={14} />
          <span>Due Date (optional)</span>
        </span>
      </label>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
        className={inputCls}
      />
    </div>
  );

  const categoryField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Category</label>
      <div className="grid grid-cols-3 gap-2">
        {(['Personal', 'Financial', 'Professional'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
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
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        <span className="flex items-center space-x-2">
          <Target size={14} />
          <span>Link to Goal (optional)</span>
        </span>
      </label>
      <select value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)} className={inputCls}>
        <option value="">No goal</option>
        {availableGoals.map(goal => (
          <option key={goal.id} value={goal.id}>{goal.title}</option>
        ))}
      </select>
    </div>
  ) : null;

  const priorityEffortField = (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Priority</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
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
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Effort</label>
        <div className="grid grid-cols-2 gap-2">
          {(['High', 'Low'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEffort(e)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
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
        <div className="grid grid-cols-2 gap-2 animate-fade-in">
          {(['daily', 'weekly'] as const).map((pattern) => (
            <button
              key={pattern}
              type="button"
              onClick={() => setRecurrencePattern(pattern)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${
                recurrencePattern === pattern
                  ? isDark ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-violet-50 text-violet-600 border-violet-200'
                  : isDark
                    ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {pattern}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={handleCancel}
        className={`px-5 py-2.5 rounded-xl transition-colors ${
          isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      >
        Cancel
      </button>
      <button type="button" onClick={handleSubmit} className="btn-primary px-5 py-2.5 rounded-xl">
        {isEditing ? 'Save Changes' : 'Create Task'}
      </button>
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
          <div className="flex h-full">
            <div className={`flex-1 flex flex-col p-8 space-y-5 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {titleField(true)}
              {notesField(true)}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-5 overflow-y-auto ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Task details</h3>
              {dueDateField}
              {categoryField}
              {goalField}
              {priorityEffortField}
              {recurringField}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
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
