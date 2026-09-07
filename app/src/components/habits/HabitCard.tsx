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
              ? 'bg-[var(--action-soft)] text-[var(--action)] border border-[var(--action)]'
              : isCompleted
                ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]'
                : 'bg-[var(--surface)]/60 text-[var(--ink-secondary)] border border-[var(--rule)] hover:bg-[var(--surface)]'
          }`}
        >
          {selectionMode ? (
            <SelectionIndicator selected={isSelected} className="w-4 h-4" />
          ) : (
            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isCompleted
                ? 'bg-[var(--success)] text-white'
                : 'bg-[var(--surface-inset)]'
            }`}>
              {isCompleted && <Check size={10} strokeWidth={3} />}
            </span>
          )}
          {habit.name}
          {habit.streakCount > 0 && (
            <span className={`text-xs font-bold ${habit.streakCount >= 7 ? 'text-[var(--warning)]' : 'text-[var(--warning)]'}`}>
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
              ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)] hover:text-[var(--success)]'
              : 'bg-[var(--surface)]/60 text-[var(--ink-disabled)] border border-[var(--rule)] hover:text-[var(--ink-muted)]'
          }`}
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className={`absolute left-0 top-full mt-1 z-50 rounded-md overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.18)] min-w-[120px] ${
            'bg-[var(--surface)] border border-[var(--rule)]'
          }`}>
            <button
              onClick={() => { onEdit(habit); setMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                'text-[var(--ink-secondary)] hover:bg-[var(--surface)]'
              }`}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
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
      className={`rounded-md p-3 transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${
        isSelected
          ? 'bg-[var(--selected)] border border-[var(--action)]'
          : isDark
            ? `bg-[var(--surface)] border border-[var(--rule)] ${isCompleted ? 'border-[var(--success)] bg-[var(--success)]/[0.06]' : ''}`
            : `bg-[var(--surface)] border border-[var(--rule)] ${isCompleted ? 'border-[var(--success)] bg-[var(--success-soft)]/40' : ''}`
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
            className={`w-7 h-7 min-h-0 rounded-sm flex items-center justify-center flex-shrink-0 transition-all ${
              isCompleted
                ? 'bg-[var(--success)] text-white shadow-[0_0_10px_rgba(52,211,153,0.25)]'
                : 'bg-black/[0.04] text-[var(--ink-muted)] border border-black/[0.06]'
            } ${habit.trackingType === 'boolean' ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium text-sm truncate ${isCompleted ? ('text-[var(--ink-muted)] line-through') : ('text-[var(--ink)]')}`}>
              {habit.name}
            </h3>
            {habit.streakCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold flex-shrink-0 ${habit.streakCount >= 7 ? 'text-[var(--warning)]' : 'text-[var(--warning)]'}`}>
                <Flame size={11} />{habit.streakCount}d
              </span>
            )}
          </div>
          {target && habit.trackingType !== 'boolean' && (
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex-1 h-1 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--action)]'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={`text-xs font-medium tabular-nums flex-shrink-0 ${
                isCompleted ? ('text-[var(--success)]') : ('text-[var(--ink-muted)]')
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
              className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)]"
            />
            <div className="relative">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                aria-label={`${habit.name} progress today`}
                className={`w-11 h-9 text-center rounded-sm text-sm font-medium ${
                  'bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--rule)]'
                } outline-none`}
                min="0"
              />
              {habit.trackingType === 'duration' && (
                <span className={`absolute right-0.5 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-muted)]`}>m</span>
              )}
            </div>
            <IconButton
              icon={Plus}
              onClick={handleIncrement}
              label={`Increase ${habit.name}`}
              className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)]"
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
            <div className={`absolute right-0 top-full mt-1 z-50 rounded-md overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.18)] min-w-[120px] ${
              'bg-[var(--surface)] border border-[var(--rule)]'
            }`}>
              <button
                onClick={() => { onEdit(habit); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  'text-[var(--ink-secondary)] hover:bg-[var(--surface)]'
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
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
