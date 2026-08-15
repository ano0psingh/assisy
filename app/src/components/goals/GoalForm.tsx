import { useState, useEffect, useRef } from 'react';
import type { TaskCategory, Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Pencil } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { TiptapEditor } from '../common/TiptapEditor';
import { Button, SelectField, Surface } from '../ui';

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
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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
    setTitleError(null);
  };

  const parentOptions = availableParentGoals.filter(g =>
    g.id !== editingGoal?.id &&
    !g.parentGoalId &&
    g.status === 'Active'
  );

  const handleSubmit = () => {
    // Previously this returned silently, so pressing Create appeared to do
    // nothing at all.
    if (!title.trim()) {
      setTitleError('Give the goal a title so you can recognise it later.');
      titleInputRef.current?.focus();
      return;
    }
    setTitleError(null);
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

  const inputCls = `w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
    isDark
      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500'
      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
  }`;

  const titleField = (
    <div>
      <label htmlFor="goal-title" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Goal Title *</label>
      <input
        id="goal-title"
        ref={titleInputRef}
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null); }}
        aria-invalid={titleError ? true : undefined}
        aria-describedby={titleError ? 'goal-title-error' : undefined}
        className={`${inputCls} ${titleError ? '!border-red-500 focus:!border-red-500' : ''}`}
        placeholder="What do you want to achieve?"
        autoFocus
      />
      {titleError && (
        <p id="goal-title-error" role="alert" className="mt-2 text-xs text-red-500">{titleError}</p>
      )}
    </div>
  );

  const notesField = (isFS: boolean) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Notes</label>
      <TiptapEditor
        content={description}
        onChange={setDescription}
        placeholder={'Describe your goal, add milestones...'}
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

  const parentGoalField = parentOptions.length > 0 ? (
    <SelectField
      label="Parent Goal (optional)"
      value={parentGoalId}
      onChange={(e) => setParentGoalId(e.target.value)}
      hint={parentGoalId ? 'This goal will be a sub-goal of the selected parent.' : undefined}
    >
      <option value="">No parent (top-level goal)</option>
      {parentOptions.map((goal) => (
        <option key={goal.id} value={goal.id}>{goal.title}</option>
      ))}
    </SelectField>
  ) : null;

  const infoBox = !isEditing ? (
    <Surface level="inset" radius="xl">
      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        After creating a goal, you can link tasks to it to track your progress automatically.
      </p>
    </Surface>
  ) : null;

  const actionButtons = (
    <div className="flex justify-end space-x-3">
      <Button type="button" variant="ghost" size="lg" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" variant="primary" size="lg" onClick={handleSubmit}>
        {isEditing ? 'Save Changes' : 'Create Goal'}
      </Button>
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
            <div className={`flex-1 flex flex-col p-8 space-y-6 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {titleField}
              {notesField(true)}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-6 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Goal details</h3>
              {categoryField}
              {parentGoalField}
              {infoBox}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
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
