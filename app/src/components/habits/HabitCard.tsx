import { useState, useRef, useEffect } from 'react';
import type { Habit } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Flame, Trash2, Plus, Minus, Check, Pencil, MoreHorizontal } from 'lucide-react';
import { hapticLight } from '../../lib/haptics';
import { SelectionCheckbox, SelectionIndicator } from '../common/SelectionControls';
import { IconButton } from '../ui';

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
  compact?: boolean;
  /** When true the card selects instead of logging progress. */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (habitId: string) => void;
}

export function HabitCard({
  habit,
  todaysValue,
  onLog,
  onDelete,
  onEdit,
  compact,
  selectionMode = false,
  isSelected = false,
  onSelectToggle,
}: HabitCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState(todaysValue.toString());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const target = habit.dailyTarget;
  const isCompleted = target ? todaysValue >= target : todaysValue > 0;
  const progressPct = target ? Math.min(100, Math.round((todaysValue / target) * 100)) : (todaysValue > 0 ? 100 : 0);

  useEffect(() => {
    setInputValue(todaysValue.toString());
  }, [todaysValue]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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

  if (compact && habit.trackingType === 'boolean') {
    return (
      <div className="relative inline-flex items-center" ref={menuRef} data-focus-id={habit.id}>
        <button
          type="button"
          onClick={selectionMode ? () => onSelectToggle?.(habit.id) : handleBooleanToggle}
          {...(selectionMode
            ? { role: 'checkbox' as const, 'aria-checked': isSelected, 'aria-label': `Select "${habit.name}"` }
            : {})}
          className={`inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-l-full text-sm font-medium transition-all duration-200 select-none border-r-0 ${
            selectionMode && isSelected
              ? 'bg-violet-50 text-violet-700 border border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40'
              : isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-white/60 text-slate-600 border border-slate-200 hover:bg-white/80 dark:bg-white/[0.06] dark:text-gray-400 dark:border-white/[0.1] dark:hover:bg-white/[0.1]'
          }`}
        >
          {selectionMode ? (
            <SelectionIndicator selected={isSelected} className="w-4 h-4" />
          ) : (
            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 dark:bg-white/10'
            }`}>
              {isCompleted && <Check size={10} strokeWidth={3} />}
            </span>
          )}
          {habit.name}
          {habit.streakCount > 0 && (
            <span className={`text-xs font-bold ${habit.streakCount >= 7 ? 'text-amber-400' : 'text-orange-500'}`}>
              <Flame size={10} className="inline" />{habit.streakCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={`More actions for ${habit.name}`}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          className={`inline-flex items-center px-2 py-2 rounded-r-full text-sm transition-all border-l-0 ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-400 border border-emerald-300 hover:text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500/50 dark:border-emerald-500/30 dark:hover:text-emerald-300'
              : 'bg-white/60 text-slate-300 border border-slate-200 hover:text-slate-500 dark:bg-white/[0.06] dark:text-gray-600 dark:border-white/[0.1] dark:hover:text-gray-400'
          }`}
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className={`absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl min-w-[120px] ${
            'bg-white border border-slate-200 dark:bg-gray-800 dark:border-white/10'
          }`}>
            <button
              onClick={() => { onEdit(habit); setMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
              }`}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-focus-id={habit.id}
      onClick={selectionMode ? () => onSelectToggle?.(habit.id) : undefined}
      className={`rounded-xl p-3 transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${
        isSelected
          ? 'bg-violet-50/60 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30'
          : isDark
            ? `bg-white/[0.04] border border-white/[0.08] ${isCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : ''}`
            : `bg-white/65 border border-white/70 ${isCompleted ? 'border-emerald-400/40 bg-emerald-50/40' : ''}`
      }`}
    >
      <div className="flex items-center gap-3">
        {selectionMode ? (
          <SelectionCheckbox
            selected={isSelected}
            onToggle={() => onSelectToggle?.(habit.id)}
            label={`Select "${habit.name}"`}
            className="w-7 h-7 flex items-center justify-center"
          />
        ) : (
          <button
            type="button"
            onClick={habit.trackingType === 'boolean' ? handleBooleanToggle : undefined}
            className={`w-7 h-7 min-h-0 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
              isCompleted
                ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.25)]'
                : 'bg-black/[0.04] text-slate-400 border border-black/[0.06] dark:bg-white/[0.08] dark:text-gray-600 dark:border-white/[0.1]'
            } ${habit.trackingType === 'boolean' ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium text-sm truncate ${isCompleted ? ('text-slate-400 line-through dark:text-gray-400') : ('text-slate-800 dark:text-white')}`}>
              {habit.name}
            </h3>
            {habit.streakCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold flex-shrink-0 ${habit.streakCount >= 7 ? 'text-amber-400' : 'text-orange-500'}`} style={habit.streakCount >= 7 ? { filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.4))' } : undefined}>
                <Flame size={11} />{habit.streakCount}d
              </span>
            )}
          </div>
          {target && habit.trackingType !== 'boolean' && (
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex-1 h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.06]`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-violet-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={`text-xs font-medium tabular-nums flex-shrink-0 ${
                isCompleted ? ('text-emerald-600 dark:text-emerald-400') : ('text-slate-500 dark:text-gray-500')
              }`}>
                {todaysValue}/{target}{habit.trackingType === 'duration' ? 'm' : ''}
              </span>
            </div>
          )}
        </div>

        {habit.trackingType !== 'boolean' && !selectionMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <IconButton
              icon={Minus}
              onClick={handleDecrement}
              label={`Decrease ${habit.name}`}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20"
            />
            <div className="relative">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                aria-label={`${habit.name} progress today`}
                className={`w-11 h-9 text-center rounded-lg text-sm font-medium ${
                  'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/10'
                } outline-none`}
                min="0"
              />
              {habit.trackingType === 'duration' && (
                <span className={`absolute right-0.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-gray-500`}>m</span>
              )}
            </div>
            <IconButton
              icon={Plus}
              onClick={handleIncrement}
              label={`Increase ${habit.name}`}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20"
            />
          </div>
        )}

        <div className={`relative flex-shrink-0 ${selectionMode ? 'hidden' : ''}`} ref={menuRef}>
          <IconButton
            icon={MoreHorizontal}
            onClick={() => setMenuOpen(!menuOpen)}
            label={`More actions for ${habit.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          />
          {menuOpen && (
            <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl min-w-[120px] ${
              'bg-white border border-slate-200 dark:bg-gray-800 dark:border-white/10'
            }`}>
              <button
                onClick={() => { onEdit(habit); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                }`}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
