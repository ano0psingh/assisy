import { useState } from 'react';
import type { Habit, TrackingType } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Flame, Trash2, Plus, Minus, Check, Pencil } from 'lucide-react';

interface HabitLog {
  date: string;
  value: number;
}

interface HabitWithLogs extends Habit {
  logs: HabitLog[];
}

interface HabitCardProps {
  habit: HabitWithLogs;
  todaysValue: number;
  onLog: (habitId: string, value: number) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: HabitWithLogs) => void;
}

export function HabitCard({ habit, todaysValue, onLog, onDelete, onEdit }: HabitCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState(todaysValue.toString());

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health': return { bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-50', text: isDark ? 'text-emerald-400' : 'text-emerald-600' };
      case 'mindfulness': return { bg: isDark ? 'bg-violet-500/20' : 'bg-violet-50', text: isDark ? 'text-violet-400' : 'text-violet-600' };
      case 'learning': return { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-50', text: isDark ? 'text-blue-400' : 'text-blue-600' };
      case 'productivity': return { bg: isDark ? 'bg-amber-500/20' : 'bg-amber-50', text: isDark ? 'text-amber-400' : 'text-amber-600' };
      default: return { bg: isDark ? 'bg-gray-500/20' : 'bg-slate-100', text: isDark ? 'text-gray-400' : 'text-slate-600' };
    }
  };

  const categoryColors = getCategoryColor(habit.category);
  const isCompleted = todaysValue > 0;

  const handleIncrement = () => {
    const newValue = todaysValue + 1;
    setInputValue(newValue.toString());
    onLog(habit.id, newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(0, todaysValue - 1);
    setInputValue(newValue.toString());
    onLog(habit.id, newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      onLog(habit.id, numValue);
    }
  };

  const handleBooleanToggle = () => {
    onLog(habit.id, todaysValue > 0 ? 0 : 1);
  };

  const getUnitLabel = (type: TrackingType) => {
    switch (type) {
      case 'duration': return 'min';
      case 'count': return '';
      case 'boolean': return '';
      default: return '';
    }
  };

  return (
    <div className={`group rounded-xl p-4 transition-all duration-200 ease-spring active:scale-[0.99] ${
      isDark
        ? `bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] ${isCompleted ? 'border-emerald-500/30' : ''}`
        : `bg-white border border-neutral-200 hover:shadow-medium hover:border-neutral-300 ${isCompleted ? 'border-emerald-300 bg-emerald-50/30' : ''}`
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Completion indicator */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isCompleted 
              ? 'bg-emerald-500/20' 
              : isDark ? 'bg-white/5' : 'bg-slate-100'
          }`}>
            {isCompleted ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-gray-600' : 'bg-slate-300'}`} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {habit.name}
              </h3>
              {habit.streakCount > 0 && (
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame size={14} />
                  <span className="text-xs font-bold">{habit.streakCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors.bg} ${categoryColors.text}`}>
                {habit.category}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                +{habit.xpPerUnit} XP/{habit.trackingType === 'boolean' ? 'day' : getUnitLabel(habit.trackingType) || 'unit'}
              </span>
            </div>
          </div>
        </div>

        {/* Input controls */}
        <div className="flex items-center gap-2">
          {habit.trackingType === 'boolean' ? (
            <button
              onClick={handleBooleanToggle}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isDark 
                    ? 'bg-white/10 text-gray-400 hover:bg-white/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Check size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDecrement}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark 
                    ? 'bg-white/10 text-gray-400 hover:bg-white/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Minus size={16} />
              </button>
              <div className="relative">
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  className={`w-16 h-10 text-center rounded-lg font-medium ${
                    isDark 
                      ? 'bg-white/10 text-white border border-white/10 focus:border-violet-500' 
                      : 'bg-slate-100 text-slate-800 border border-slate-200 focus:border-violet-500'
                  } outline-none transition-colors`}
                  min="0"
                />
                {habit.trackingType === 'duration' && (
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    m
                  </span>
                )}
              </div>
              <button
                onClick={handleIncrement}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark 
                    ? 'bg-white/10 text-gray-400 hover:bg-white/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          {/* Edit button - always visible */}
          <button
            onClick={() => onEdit(habit)}
            className={`p-2 rounded-lg transition-all ${
              isDark 
                ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/20' 
                : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
            }`}
            title="Edit habit"
          >
            <Pencil size={18} />
          </button>
          {/* Delete button - always visible */}
          <button
            onClick={() => onDelete(habit.id)}
            className={`p-2 rounded-lg transition-all ${
              isDark 
                ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' 
                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Delete habit"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
