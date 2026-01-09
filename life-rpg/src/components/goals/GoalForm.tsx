import { useState, useEffect } from 'react';
import type { TaskCategory, Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { X, Target, Pencil, GitBranch } from 'lucide-react';

interface GoalFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: TaskCategory;
    parentGoalId?: string;
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
  editingGoal?: Goal | null;
  availableParentGoals?: Goal[];
}

export function GoalForm({ onSubmit, onCancel, isOpen, editingGoal, availableParentGoals = [] }: GoalFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [parentGoalId, setParentGoalId] = useState<string>('');

  // Populate form when editing
  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description || '');
      setCategory(editingGoal.category);
      setParentGoalId(editingGoal.parentGoalId || '');
    } else {
      resetForm();
    }
  }, [editingGoal]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Personal');
    setParentGoalId('');
  };

  // Filter out the current goal from parent options (can't be its own parent)
  const parentOptions = availableParentGoals.filter(g => 
    g.id !== editingGoal?.id && 
    !g.parentGoalId && // Only top-level goals can be parents (no nested sub-goals)
    g.status === 'Active'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      parentGoalId: parentGoalId || undefined,
    });

    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  if (!isOpen) return null;

  const isEditing = !!editingGoal;

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
                <Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              )}
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {isEditing ? 'Edit Goal' : 'Create New Goal'}
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
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Goal Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 input rounded-xl"
              placeholder="What do you want to achieve?"
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
              placeholder="Describe your goal in detail (optional)"
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
                  onClick={() => setCategory(cat)}
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

          {/* Parent Goal (Sub-goal option) */}
          {parentOptions.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <div className="flex items-center space-x-2">
                  <GitBranch size={14} />
                  <span>Parent Goal (optional)</span>
                </div>
              </label>
              <select
                value={parentGoalId}
                onChange={(e) => setParentGoalId(e.target.value)}
                className="w-full px-4 py-3 input rounded-xl"
              >
                <option value="">No parent (top-level goal)</option>
                {parentOptions.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
              {parentGoalId && (
                <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  This goal will be a sub-goal of the selected parent.
                </p>
              )}
            </div>
          )}

          {/* Info */}
          {!isEditing && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                💡 After creating a goal, you can link tasks to it to track your progress automatically.
              </p>
            </div>
          )}

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
              {isEditing ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
