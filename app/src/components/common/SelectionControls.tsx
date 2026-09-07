import { CheckSquare2, Square, ListChecks } from 'lucide-react';

interface SelectionCheckboxProps {
  selected: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

/** Row checkbox used by the bulk-selection surfaces. */
export function SelectionCheckbox({ selected, onToggle, label, className = '' }: SelectionCheckboxProps) {

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={label ?? (selected ? 'Deselect' : 'Select')}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center transition-colors ${
        selected
          ? 'text-[var(--action)]'
          : 'text-[var(--rule-strong)] hover:text-[var(--ink-secondary)]'
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

  return (
    <span
      aria-hidden="true"
      className={`flex-shrink-0 inline-flex items-center justify-center transition-colors ${
        selected
          ? 'text-[var(--action)]'
          : 'text-[var(--rule-strong)]'
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
          : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
      }`}
    >
      <ListChecks size={15} />
      <span>{active ? 'Done' : 'Select'}</span>
    </button>
  );
}
