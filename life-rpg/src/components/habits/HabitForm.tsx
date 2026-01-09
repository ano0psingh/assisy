import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Zap } from 'lucide-react';
import type { TrackingType } from '../../types';

interface HabitFormProps {
  isOpen: boolean;
  onSubmit: (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
  }) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'Health', label: '🏃 Health & Fitness' },
  { value: 'Mindfulness', label: '🧘 Mindfulness' },
  { value: 'Learning', label: '📚 Learning & Growth' },
  { value: 'Productivity', label: '🎯 Productivity' },
  { value: 'Financial', label: '💰 Financial' },
];

const TRACKING_TYPES: { value: TrackingType; label: string; description: string }[] = [
  { value: 'duration', label: 'Duration', description: 'Track in minutes (e.g., meditation, reading)' },
  { value: 'count', label: 'Count', description: 'Track quantity (e.g., glasses of water, pushups)' },
  { value: 'boolean', label: 'Yes/No', description: 'Simple completion (e.g., took vitamins)' },
];

export function HabitForm({ isOpen, onSubmit, onCancel }: HabitFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<TrackingType>('duration');
  const [category, setCategory] = useState('Health');
  const [xpPerUnit, setXpPerUnit] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      trackingType,
      category,
      xpPerUnit,
    });
    
    // Reset form
    setName('');
    setTrackingType('duration');
    setCategory('Health');
    setXpPerUnit(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className={`relative rounded-2xl shadow-elevated w-full max-w-md ${
        isDark 
          ? 'bg-[#12121a] border border-white/10' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Create New Habit
          </h2>
          <button 
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              Habit Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Meditation"
              className="w-full px-4 py-3 input rounded-xl"
              autoFocus
              required
            />
          </div>

          {/* Tracking Type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              Tracking Type
            </label>
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
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {type.label}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                      {type.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 input rounded-xl"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* XP Per Unit */}
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
              className="w-full px-4 py-3 input rounded-xl"
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary px-5 py-2.5 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-5 py-2.5 rounded-xl"
            >
              Create Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
