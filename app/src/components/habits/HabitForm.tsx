import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Zap, Pencil, Heart, Target, Bell } from 'lucide-react';
import type { TrackingType, Habit } from '../../types';
import { ExpandableModal } from '../common/ExpandableModal';

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
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<TrackingType>('duration');
  const [category, setCategory] = useState('Health');
  const [xpPerUnit, setXpPerUnit] = useState(1);
  const [dailyTarget, setDailyTarget] = useState<string>('');
  const [reminderTime, setReminderTime] = useState('');

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setTrackingType(editingHabit.trackingType);
      setCategory(editingHabit.category);
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
    setXpPerUnit(1);
    setDailyTarget('');
    setReminderTime('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const target = parseInt(dailyTarget) || undefined;
    onSubmit({
      name: name.trim(),
      trackingType,
      category,
      xpPerUnit,
      dailyTarget: trackingType === 'boolean' ? undefined : target,
      reminderTime: reminderTime || undefined,
    });
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const isEditing = !!editingHabit;

  const inputCls = `w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
    isDark
      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500'
      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
  }`;

  const nameField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Habit Name *</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Morning Meditation"
        className={inputCls}
        autoFocus
      />
    </div>
  );

  const trackingTypeField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Tracking Type</label>
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
              <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{type.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const categoryField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>
    </div>
  );

  const targetField = trackingType !== 'boolean' ? (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        <div className="flex items-center gap-2">
          <Target size={16} className="text-emerald-500" />
          Daily Target <span className={`text-xs font-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>(optional)</span>
        </div>
      </label>
      <input
        type="number"
        value={dailyTarget}
        onChange={(e) => setDailyTarget(e.target.value)}
        placeholder={trackingType === 'duration' ? 'e.g. 30 (minutes)' : 'e.g. 8 (glasses)'}
        min="1"
        className={inputCls}
      />
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {dailyTarget
          ? `Progress shows as X/${dailyTarget}${trackingType === 'duration' ? ' min' : ''}. Streak counts when target is met.`
          : 'Leave empty to count any value > 0 as done.'}
      </p>
    </div>
  ) : null;

  const reminderField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-violet-500" />
          Daily Reminder <span className={`text-xs font-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>(optional)</span>
        </div>
      </label>
      <input
        type="time"
        value={reminderTime}
        onChange={(e) => setReminderTime(e.target.value)}
        className={inputCls}
      />
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {reminderTime ? `You'll get a notification at ${reminderTime} daily.` : 'Set a time to get reminded about this habit.'}
      </p>
    </div>
  );

  const xpField = (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          XP per {trackingType === 'boolean' ? 'completion' : trackingType === 'duration' ? 'minute' : 'unit'}
        </div>
      </label>
      <input
        type="number"
        value={xpPerUnit}
        onChange={(e) => setXpPerUnit(Math.max(1, parseInt(e.target.value) || 1))}
        min="1"
        max="100"
        className={inputCls}
      />
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {trackingType === 'boolean'
          ? `You'll earn ${xpPerUnit} XP each day you complete this habit`
          : trackingType === 'duration'
          ? `You'll earn ${xpPerUnit} XP for each minute tracked`
          : `You'll earn ${xpPerUnit} XP for each unit logged`
        }
      </p>
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end gap-3">
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
        {isEditing ? 'Save Changes' : 'Create Habit'}
      </button>
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
            <div className={`flex-1 p-8 space-y-5 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {nameField}
              {trackingTypeField}
            </div>
            <div className={`w-80 flex-shrink-0 p-6 space-y-5 overflow-y-auto ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Settings</h3>
              {categoryField}
              {targetField}
              {xpField}
              {reminderField}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {nameField}
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
