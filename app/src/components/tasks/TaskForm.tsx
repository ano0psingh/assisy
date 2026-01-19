import { useState, useEffect } from 'react';
import type { Task, TaskCategory, Priority, Effort, Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { X, Sparkles, Target, Pencil, Calendar } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
    isRecurring: boolean;
    recurrencePattern?: 'daily' | 'weekly';
    goalId?: string;
    dueDate?: Date;
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
  goals?: Goal[];
  editingTask?: Task | null;
}

export function TaskForm({ onSubmit, onCancel, isOpen, goals = [], editingTask }: TaskFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly'>('daily');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Populate form when editing
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

  // Filter active goals for the selected category
  const availableGoals = goals.filter(g => g.status === 'Active' && g.category === category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    });

    resetForm();
  };

  // Reset goal selection when category changes
  const handleCategoryChange = (newCategory: TaskCategory) => {
    setCategory(newCategory);
    // Only reset goal if it doesn't match the new category
    const currentGoal = goals.find(g => g.id === selectedGoalId);
    if (currentGoal && currentGoal.category !== newCategory) {
      setSelectedGoalId('');
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  if (!isOpen) return null;

  const isEditing = !!editingTask;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className={`relative rounded-2xl shadow-elevated w-full max-w-md animate-slide-up overflow-hidden ${
        isDark 
          ? 'bg-[#12121a] border border-white/10' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
              {isEditing ? (
                <Pencil className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              ) : (
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              )}
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>
          <button 
            onClick={handleCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 input rounded-xl"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 input rounded-xl resize-none"
              rows={3}
              placeholder="Add some details (optional)"
            />
          </div>

          {/* Due Date */}
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
              className="w-full px-4 py-3 input rounded-xl"
            />
          </div>

          {/* Category */}
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

          {/* Link to Goal */}
          {availableGoals.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <span className="flex items-center space-x-2">
                  <Target size={14} />
                  <span>Link to Goal (optional)</span>
                </span>
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-4 py-3 input rounded-xl"
              >
                <option value="">No goal</option>
                {availableGoals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Priority & Effort */}
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

          {/* Recurring Toggle */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-all ${
                  isRecurring ? 'bg-violet-500' : isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                    isRecurring ? 'translate-x-5' : 'translate-x-1'
                  } mt-1`} />
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

          {/* Actions */}
          <div className={`flex justify-end space-x-3 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary px-5 py-2.5 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-5 py-2.5 rounded-xl"
            >
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
