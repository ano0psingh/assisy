import { useState, useRef, useEffect } from 'react';
import type { Habit } from '../../types';
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
      <div className="relative inline-flex min-w-[11rem] items-stretch" ref={menuRef} data-focus-id={habit.id}>
        <button
          type="button"
          onClick={selectionMode ? () => onSelectToggle?.(habit.id) : handleBooleanToggle}
          {...(selectionMode
            ? { role: 'checkbox' as const, 'aria-checked': isSelected, 'aria-label': `Select "${habit.name}"` }
            : {})}
          className={`inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-l-[var(--radius-sm)] border-r-0 py-2 pl-3 pr-2 text-left text-sm font-medium transition-colors duration-200 select-none ${
            selectionMode && isSelected
              ? 'bg-[var(--action-soft)] text-[var(--action)] border border-[var(--action)]'
              : isCompleted
                ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]'
                : 'border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
          }`}
        >
          {selectionMode ? (
            <SelectionIndicator selected={isSelected} className="w-4 h-4" />
          ) : (
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors ${
              isCompleted
                ? 'border-[var(--success)] bg-[var(--success)] text-[var(--ink-inverse)]'
                : 'border-[var(--rule-strong)] bg-[var(--surface-inset)] text-[var(--ink-muted)]'
            }`}>
              {isCompleted ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 bg-current" />}
            </span>
          )}
          <span className="truncate">{habit.name}</span>
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
          className={`inline-flex min-h-11 min-w-10 items-center justify-center rounded-r-[var(--radius-sm)] border-l-0 px-2 py-2 text-sm transition-colors ${
            isCompleted
              ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)] hover:text-[var(--success)]'
              : 'border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]'
          }`}
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]">
            <button
              onClick={() => { onEdit(habit); setMenuOpen(false); }}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
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
      className={`border px-3 py-2 transition-colors duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${
        isSelected
          ? 'bg-[var(--selected)] border border-[var(--action)]'
          : `border-[var(--rule)] bg-[var(--surface-raised)] ${isCompleted ? 'border-[var(--success)] bg-[var(--success-soft)]' : 'hover:bg-[var(--state-hover)]'}`
      }`}
    >
      <div className="flex min-h-12 items-center gap-3">
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
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors ${
              isCompleted
                ? 'border-[var(--success)] bg-[var(--success)] text-[var(--ink-inverse)]'
                : 'border-[var(--rule-strong)] bg-[var(--surface-inset)] text-[var(--ink-muted)] hover:border-[var(--action)] hover:bg-[var(--action-soft)] hover:text-[var(--action)]'
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
          <div className="flex flex-shrink-0 items-stretch overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface)]">
            <button
              type="button"
              onClick={handleDecrement}
              aria-label={`Decrease ${habit.name}`}
              className="flex min-h-11 min-w-11 items-center justify-center text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
            >
              <Minus size={16} />
            </button>
            <div className="relative">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                aria-label={`${habit.name} progress today`}
                className="h-11 w-14 border-x border-[var(--rule)] bg-[var(--surface-inset)] text-center font-mono text-sm font-semibold tabular-nums text-[var(--ink)] outline-none focus:bg-[var(--surface-raised)]"
                min="0"
              />
              {habit.trackingType === 'duration' && (
                <span className={`absolute right-0.5 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-muted)]`}>m</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleIncrement}
              aria-label={`Increase ${habit.name}`}
              className="flex min-h-11 min-w-11 items-center justify-center bg-[var(--action-soft)] text-[var(--action)] transition-colors hover:bg-[var(--selected)]"
            >
              <Plus size={16} />
            </button>
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
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]">
              <button
                onClick={() => { onEdit(habit); setMenuOpen(false); }}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
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
