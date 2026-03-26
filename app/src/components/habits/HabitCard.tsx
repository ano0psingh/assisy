import { useState } from 'react';
import type { Habit } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useHabitContext } from '../../context/HabitContext';
import { Flame, Trash2, Plus, Minus, Check, Pencil, Trophy } from 'lucide-react';
import { hapticLight } from '../../lib/haptics';

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
  const { getLongestStreak } = useHabitContext();
  const [inputValue, setInputValue] = useState(todaysValue.toString());
  const longestStreak = getLongestStreak(habit.id);

  const target = habit.dailyTarget;
  const isCompleted = target ? todaysValue >= target : todaysValue > 0;
  const progressPct = target ? Math.min(100, Math.round((todaysValue / target) * 100)) : (todaysValue > 0 ? 100 : 0);

  const handleIncrement = () => {
    hapticLight();
    const newValue = todaysValue + 1;
    setInputValue(newValue.toString());
    onLog(habit.id, newValue);
  };

  const handleDecrement = () => {
    hapticLight();
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
    hapticLight();
    onLog(habit.id, todaysValue > 0 ? 0 : 1);
  };

  return (
    <div className={`rounded-2xl p-3.5 transition-all duration-200 backdrop-blur-xl ${
      isDark
        ? `bg-white/[0.04] border border-white/[0.08] ${isCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : ''}`
        : `bg-white/65 border border-white/70 ${isCompleted ? 'border-emerald-400/40 bg-emerald-50/40' : ''}`
    }`} style={{ boxShadow: isCompleted ? (isDark ? '0 0 16px rgba(52,211,153,0.08), inset 0 0 0 0.5px rgba(52,211,153,0.1)' : '0 0 16px rgba(52,211,153,0.06), inset 0 0 0 0.5px rgba(52,211,153,0.1)') : (isDark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.05)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.7)') }}>
      <div className="flex items-center gap-3">
        {/* Left: status + info */}
        <button
          type="button"
          onClick={habit.trackingType === 'boolean' ? handleBooleanToggle : undefined}
          className={`w-8 h-8 min-h-0 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            isCompleted
              ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
              : isDark ? 'bg-white/[0.08] text-gray-600 border border-white/[0.1]' : 'bg-black/[0.04] text-slate-400 border border-black/[0.06]'
          } ${habit.trackingType === 'boolean' ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {isCompleted ? <Check size={16} strokeWidth={2.5} /> : <div className="w-2 h-2 rounded-full bg-current" />}
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {habit.name}
            </h3>
            {habit.streakCount > 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${habit.streakCount >= 7 ? 'text-amber-400' : 'text-orange-500'}`} style={habit.streakCount >= 7 ? { filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.4))' } : undefined}>
                <Flame size={11} />{habit.streakCount}d
              </span>
            )}
            {longestStreak > 1 && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] ${isDark ? 'text-amber-400/50' : 'text-amber-500/50'}`}>
                <Trophy size={10} />{longestStreak}d
              </span>
            )}
          </div>
          {/* Compact meta row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-500'
            }`}>{habit.category}</span>
            {target && habit.trackingType !== 'boolean' && (
              <span className={`text-[11px] font-medium tabular-nums ${
                isCompleted ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-500' : 'text-slate-500')
              }`}>
                {todaysValue}/{target}{habit.trackingType === 'duration' ? 'm' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Target progress bar (thin, inline) */}
        {target && habit.trackingType !== 'boolean' && (
          <div className="w-12 flex-shrink-0 hidden sm:block">
            <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-violet-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        {habit.trackingType !== 'boolean' && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={handleDecrement} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}><Minus size={14} /></button>
            <div className="relative">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className={`w-12 h-7 text-center rounded-lg text-sm font-medium ${
                  isDark ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-800 border border-slate-200'
                } outline-none`}
                min="0"
              />
              {habit.trackingType === 'duration' && (
                <span className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>m</span>
              )}
            </div>
            <button onClick={handleIncrement} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}><Plus size={14} /></button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onEdit(habit)} className={`p-1.5 rounded-lg transition-all ${
            isDark ? 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/20' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
          }`} title="Edit"><Pencil size={15} /></button>
          <button onClick={() => onDelete(habit.id)} className={`p-1.5 rounded-lg transition-all ${
            isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
          }`} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}
