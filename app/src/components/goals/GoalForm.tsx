import { useState, useRef } from 'react';
import type { TaskCategory, Goal, GoalPriority } from '../../types';
import { Target, Pencil } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { TiptapEditor } from '../common/TiptapEditor';
import { Button, SelectField, Surface, TextField } from '../ui';

interface GoalFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: TaskCategory;
    parentGoalId?: string;
    targetDate?: string;
    priority: GoalPriority;
    nextAction?: string;
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
  editingGoal?: Goal | null;
  availableParentGoals?: Goal[];
}

export function GoalForm(props: GoalFormProps) {
  if (!props.isOpen) return null;
  return <OpenGoalForm key={props.editingGoal?.id ?? 'new-goal'} {...props} />;
}

function OpenGoalForm({ onSubmit, onCancel, isOpen, editingGoal, availableParentGoals = [] }: GoalFormProps) {
  const [title, setTitle] = useState(editingGoal?.title ?? '');
  const [description, setDescription] = useState(editingGoal?.description ?? '');
  const [category, setCategory] = useState<TaskCategory>(editingGoal?.category ?? 'Personal');
  const [parentGoalId, setParentGoalId] = useState<string>(editingGoal?.parentGoalId ?? '');
  const [targetDate, setTargetDate] = useState(editingGoal?.targetDate ?? '');
  const [priority, setPriority] = useState<GoalPriority>(editingGoal?.priority ?? 'Medium');
  const [nextAction, setNextAction] = useState(editingGoal?.nextAction ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Personal');
    setParentGoalId('');
    setTargetDate('');
    setPriority('Medium');
    setNextAction('');
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
      targetDate: targetDate || undefined,
      priority,
      nextAction: nextAction.trim() || undefined,
    });
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const isEditing = !!editingGoal;

  const titleField = (
    <TextField
      ref={titleInputRef}
      label="Goal name *"
      type="text"
      value={title}
      onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null); }}
      error={titleError ?? undefined}
      placeholder="What do you want to achieve?"
      autoFocus
    />
  );

  const notesField = (isFS: boolean) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className="block text-sm font-medium mb-2 text-[var(--ink-secondary)]">Notes</label>
      <TiptapEditor
        content={description}
        onChange={setDescription}
        placeholder={'Describe your goal, add milestones...'}
        size={isFS ? 'tall' : 'compact'}
      />
    </div>
  );

  const categoryField = (
    <div>
      <label className="block text-sm font-medium mb-2 text-[var(--ink-secondary)]">Category</label>
      <div className="grid grid-cols-3 gap-2">
        {(['Personal', 'Financial', 'Professional'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-3 rounded-md text-sm font-medium transition-all border ${
              category === cat
                ? cat === 'Personal'
                  ? 'bg-[var(--action-soft)] text-[var(--action)] border-[var(--action)]'
                  : cat === 'Financial'
                  ? 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]'
                  : 'bg-[var(--surface-subtle)] text-[var(--ink-secondary)] border-[var(--rule-strong)]'
                : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--rule)] hover:bg-[var(--surface)]'
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

  const planningFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Target date"
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
        <SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as GoalPriority)}>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </SelectField>
      </div>
      <TextField
        label="Next action"
        value={nextAction}
        onChange={(event) => setNextAction(event.target.value)}
        placeholder="What is the very next step?"
      />
    </div>
  );

  const infoBox = !isEditing ? (
    <Surface level="inset" radius="xl">
      <p className={`text-sm text-[var(--ink-secondary)]`}>
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
        ? <Pencil className={`w-5 h-5 text-[var(--action)]`} />
        : <Target className={`w-5 h-5 text-[var(--action)]`} />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            <div className={`flex-1 flex flex-col p-8 space-y-6 border-r border-[var(--rule)]`}>
              {titleField}
              {notesField(true)}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-6 bg-[var(--surface)]`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-[var(--ink-muted)]`}>Goal details</h3>
              {categoryField}
              {planningFields}
              {parentGoalField}
              {infoBox}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {titleField}
            {notesField(false)}
            {categoryField}
            {planningFields}
            {parentGoalField}
            {infoBox}
          </div>
        )
      }
    </ExpandableModal>
  );
}
