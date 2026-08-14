import { CheckSquare2, Square, ListChecks } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SelectionCheckboxProps {
  selected: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

/** Row checkbox used by the bulk-selection surfaces. */
export function SelectionCheckbox({ selected, onToggle, label, className = '' }: SelectionCheckboxProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={label ?? (selected ? 'Deselect' : 'Select')}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`flex-shrink-0 transition-colors ${
        selected
          ? isDark ? 'text-violet-400' : 'text-violet-600'
          : isDark ? 'text-gray-600 hover:text-gray-400' : 'text-slate-300 hover:text-slate-500'
      } ${className}`}
    >
      {selected ? <CheckSquare2 size={16} /> : <Square size={16} />}
    </button>
  );
}

/**
 * Decorative version of {@link SelectionCheckbox} for rows that are themselves
 * a button. Nesting a button inside a button is invalid HTML, so the parent
 * carries `role="checkbox"` and the click handler while this only draws.
 */
export function SelectionIndicator({ selected, className = '' }: { selected: boolean; className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <span
      aria-hidden="true"
      className={`flex-shrink-0 inline-flex items-center justify-center transition-colors ${
        selected
          ? isDark ? 'text-violet-400' : 'text-violet-600'
          : isDark ? 'text-gray-600' : 'text-slate-300'
      } ${className}`}
    >
      {selected ? <CheckSquare2 size={16} /> : <Square size={16} />}
    </span>
  );
}

interface SelectButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/** Header toggle that puts a list into (or out of) selection mode. */
export function SelectButton({ active, onClick, disabled }: SelectButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
          : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      <ListChecks size={15} />
      <span>{active ? 'Done' : 'Select'}</span>
    </button>
  );
}
