import { useState, useEffect } from 'react';
import type { TaskCategory, Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Pencil, GitBranch } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { NotesEditor } from '../common/NotesEditor';

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

  const parentOptions = availableParentGoals.filter(g =>
    g.id !== editingGoal?.id &&
    !g.parentGoalId &&
    g.status === 'Active'
  );

  const handleSubmit = () => {
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

  const isEditing = !!editingGoal;

  const inputCls = `w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
    isDark
      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500'
      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
  }`;

  const titleField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Goal Title *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputCls}
        placeholder="What do you want to achieve?"
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
        placeholder={'Describe your goal, add milestones...\n\nTip: Type "- " for bullets, "[] " for checklists'}
        minRows={isFS ? 12 : 4}
        maxRows={isFS ? 28 : 10}
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
  );

  const parentGoalField = parentOptions.length > 0 ? (
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
        className={inputCls}
      >
        <option value="">No parent (top-level goal)</option>
        {parentOptions.map((goal) => (
          <option key={goal.id} value={goal.id}>{goal.title}</option>
        ))}
      </select>
      {parentGoalId && (
        <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          This goal will be a sub-goal of the selected parent.
        </p>
      )}
    </div>
  ) : null;

  const infoBox = !isEditing ? (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        After creating a goal, you can link tasks to it to track your progress automatically.
      </p>
    </div>
  ) : null;

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
      <button
        type="button"
        onClick={handleSubmit}
        className="btn-primary px-5 py-2.5 rounded-xl"
      >
        {isEditing ? 'Save Changes' : 'Create Goal'}
      </button>
    </div>
  );

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? 'Edit Goal' : 'Create New Goal'}
      icon={isEditing
        ? <Pencil className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
        : <Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            <div className={`flex-1 flex flex-col p-8 space-y-5 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {titleField}
              {notesField(true)}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Goal details</h3>
              {categoryField}
              {parentGoalField}
              {infoBox}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {titleField}
            {notesField(false)}
            {categoryField}
            {parentGoalField}
            {infoBox}
          </div>
        )
      }
    </ExpandableModal>
  );
}
