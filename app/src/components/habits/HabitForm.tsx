import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useHabitContext } from '../../context/HabitContext';
import { useGoalContext } from '../../context/GoalContext';
import { Pencil, Heart, Sparkles, Loader2, Link2 } from 'lucide-react';
import type { TrackingType, Habit } from '../../types';
import { ExpandableModal } from '../common/ExpandableModal';
import { GoalTreeThumbnail } from '../goals/GoalTree';
import { askAIJson, isAIConfigured } from '../../lib/ai';
import { Button, SelectField, Surface, TextField } from '../ui';

interface HabitWithLogs extends Habit {
  logs: { date: string; value: number }[];
}

interface HabitFormProps {
  isOpen: boolean;
  onSubmit: (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
    dailyTarget?: number;
    reminderTime?: string;
    goalId?: string;
  }) => void;
  onCancel: () => void;
  editingHabit?: HabitWithLogs | null;
}

const CATEGORIES = [
  { value: 'Health', label: 'Health & Fitness' },
  { value: 'Mindfulness', label: 'Mindfulness' },
  { value: 'Learning', label: 'Learning & Growth' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Financial', label: 'Financial' },
];

const TRACKING_TYPES: { value: TrackingType; label: string; description: string }[] = [
  { value: 'duration', label: 'Duration', description: 'Track in minutes (e.g., meditation, reading)' },
  { value: 'count', label: 'Count', description: 'Track quantity (e.g., glasses of water, pushups)' },
  { value: 'boolean', label: 'Yes/No', description: 'Simple completion (e.g., took vitamins)' },
];

export function HabitForm({ isOpen, onSubmit, onCancel, editingHabit }: HabitFormProps) {
  const { theme } = useTheme();
  const { getHabitLogs } = useHabitContext();
  const { goals, getActiveGoals } = useGoalContext();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<TrackingType>('duration');
  const [category, setCategory] = useState('Health');
  const [goalId, setGoalId] = useState<string>('');
  const [xpPerUnit, setXpPerUnit] = useState(1);
  const [dailyTarget, setDailyTarget] = useState<string>('');
  const [reminderTime, setReminderTime] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeGoals = getActiveGoals();

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setTrackingType(editingHabit.trackingType);
      setCategory(editingHabit.category);
      setGoalId(editingHabit.goalId ?? '');
      setXpPerUnit(editingHabit.xpPerUnit);
      setDailyTarget(editingHabit.dailyTarget ? String(editingHabit.dailyTarget) : '');
      setReminderTime(editingHabit.reminderTime ?? '');
    } else {
      resetForm();
    }
  }, [editingHabit]);

  const resetForm = () => {
    setName('');
    setTrackingType('duration');
    setCategory('Health');
    setGoalId('');
    setXpPerUnit(1);
    setDailyTarget('');
    setReminderTime('');
    setAiReason(null);
    setNameError(null);
  };

  const handleAISuggestTime = async () => {
    if (!editingHabit) return;
    const logs = getHabitLogs(editingHabit.id, 30);
    if (logs.length < 5) return;
    setAiSuggesting(true);
    setAiReason(null);
    try {
      const times = logs.map(l => l.date).join(', ');
      const result = await askAIJson<{ suggested_time: string; reason: string }>(
        `Based on these habit completion times over the last 30 days, suggest the optimal reminder time. The habit "${editingHabit.name}" was completed on these dates: ${times}. Consider that most people complete habits at consistent times. Respond with JSON: {"suggested_time": "HH:MM", "reason": "brief explanation"}`,
      );
      if (result.suggested_time) {
        setReminderTime(result.suggested_time);
      }
      if (result.reason) {
        setAiReason(result.reason);
      }
    } catch {
      setAiReason('Could not generate suggestion. Try again later.');
    } finally {
      setAiSuggesting(false);
    }
  };

  const showAISuggest = isAIConfigured() && !!editingHabit && (editingHabit.logs?.length ?? 0) >= 5;

  const handleSubmit = () => {
    // Previously this returned silently, so pressing Create appeared to do
    // nothing at all.
    if (!name.trim()) {
      setNameError('Give the habit a name so you can recognise it later.');
      nameInputRef.current?.focus();
      return;
    }
    setNameError(null);
    const target = parseInt(dailyTarget) || undefined;
    const linkedGoal = goalId ? goals.find(g => g.id === goalId) : undefined;
    const resolvedCategory = linkedGoal ? linkedGoal.category : category;
    onSubmit({
      name: name.trim(),
      trackingType,
      category: resolvedCategory,
      xpPerUnit,
      dailyTarget: trackingType === 'boolean' ? undefined : target,
      reminderTime: reminderTime || undefined,
      goalId: goalId || undefined,
    });
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const isEditing = !!editingHabit;

  const nameField = (
    <div>
      <TextField
        ref={nameInputRef}
        label="Habit Name *"
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
        error={nameError ?? undefined}
        placeholder="e.g., Morning Meditation"
        autoFocus
      />
    </div>
  );

  const trackingTypeField = (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Tracking Type</label>
      <div className="space-y-2">
        {TRACKING_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex items-start p-3 rounded-xl cursor-pointer transition-all ${
              trackingType === type.value
                ? isDark ? 'bg-violet-500/20 border border-violet-500/50' : 'bg-violet-50 border border-violet-300'
                : isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <input
              type="radio"
              name="trackingType"
              value={type.value}
              checked={trackingType === type.value}
              onChange={(e) => setTrackingType(e.target.value as TrackingType)}
              className="sr-only"
            />
            <div>
              <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{type.label}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{type.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const goalField = (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-violet-500" />
          Linked Goal
        </div>
      </label>
      {activeGoals.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activeGoals.map(g => (
            <label
              key={g.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                goalId === g.id
                  ? isDark ? 'bg-violet-500/20 border border-violet-500/50' : 'bg-violet-50 border border-violet-300'
                  : isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="goalId"
                value={g.id}
                checked={goalId === g.id}
                onChange={() => setGoalId(g.id)}
                className="sr-only"
              />
              <div className="flex-shrink-0 w-8 h-8">
                <GoalTreeThumbnail level={g.level} theme={g.theme} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{g.title}</div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Lv.{g.level} · {g.category}</div>
              </div>
            </label>
          ))}
          {goalId && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setGoalId('')}>
              Clear selection
            </Button>
          )}
        </div>
      ) : (
        <Surface level="inset" radius="xl">
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            No active goals yet. Create a goal first to link habits to it.
          </p>
        </Surface>
      )}
    </div>
  );

  const categoryField = !goalId ? (
    <SelectField
      label="Category"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      hint="Used for grouping when no goal is linked."
    >
      {CATEGORIES.map((cat) => (
        <option key={cat.value} value={cat.value}>{cat.label}</option>
      ))}
    </SelectField>
  ) : null;

  const targetField = trackingType !== 'boolean' ? (
    <TextField
      label="Daily Target (optional)"
      type="number"
      value={dailyTarget}
      onChange={(e) => setDailyTarget(e.target.value)}
      placeholder={trackingType === 'duration' ? 'e.g. 30 (minutes)' : 'e.g. 8 (glasses)'}
      min="1"
      hint={dailyTarget
        ? `Progress shows as X/${dailyTarget}${trackingType === 'duration' ? ' min' : ''}. Streak counts when target is met.`
        : 'Leave empty to count any value > 0 as done.'}
    />
  ) : null;

  const reminderField = (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="Daily Reminder (optional)"
            type="time"
            value={reminderTime}
            onChange={(e) => { setReminderTime(e.target.value); setAiReason(null); }}
          />
        </div>
        {showAISuggest && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAISuggestTime}
            disabled={aiSuggesting}
            className="whitespace-nowrap px-3 py-3"
          >
            {aiSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI suggest
          </Button>
        )}
      </div>
      {aiReason && (
        <p className={`text-xs mt-2 px-3 py-2 rounded-lg ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
          {aiReason}
        </p>
      )}
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {reminderTime ? `You'll get a notification at ${reminderTime} daily.` : 'Set a time to get reminded about this habit.'}
      </p>
    </div>
  );

  const xpField = (
    <TextField
      label={`XP per ${trackingType === 'boolean' ? 'completion' : trackingType === 'duration' ? 'minute' : 'unit'}`}
      type="number"
      value={xpPerUnit}
      onChange={(e) => setXpPerUnit(Math.max(1, parseInt(e.target.value) || 1))}
      min="1"
      max="100"
      hint={trackingType === 'boolean'
        ? `You'll earn ${xpPerUnit} XP each day you complete this habit`
        : trackingType === 'duration'
        ? `You'll earn ${xpPerUnit} XP for each minute tracked`
        : `You'll earn ${xpPerUnit} XP for each unit logged`}
    />
  );

  const actionButtons = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" size="lg" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" variant="primary" size="lg" onClick={handleSubmit}>
        {isEditing ? 'Save Changes' : 'Create Habit'}
      </Button>
    </div>
  );

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? 'Edit Habit' : 'Create New Habit'}
      icon={isEditing
        ? <Pencil className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
        : <Heart className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
      }
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            <div className={`flex-1 p-8 space-y-6 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {nameField}
              {trackingTypeField}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-6 overflow-y-auto ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Settings</h3>
              {goalField}
              {categoryField}
              {targetField}
              {xpField}
              {reminderField}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {nameField}
            {goalField}
            {trackingTypeField}
            {categoryField}
            {targetField}
            {xpField}
            {reminderField}
          </div>
        )
      }
    </ExpandableModal>
  );
}
