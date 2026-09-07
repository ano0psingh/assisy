import { X } from 'lucide-react';

interface BulkActionBarProps {
  count: number;
  /** Noun for the selected rows, e.g. "task". Pluralised with a trailing "s". */
  itemLabel: string;
  allSelected: boolean;
  onSelectAll: () => void;
  onDelete: () => void;
  onClear: () => void;
  /** Shown between "Select All" and "Delete", e.g. a Mark Read action. */
  children?: React.ReactNode;
}

/**
 * Floating bar shown while rows are selected. Mirrors the bar the Feed page has
 * always used, so bulk editing feels the same everywhere.
 */
export function BulkActionBar({
  count,
  itemLabel,
  allSelected,
  onSelectAll,
  onDelete,
  onClear,
  children,
}: BulkActionBarProps) {
  if (count === 0) return null;

  const neutralButton = 'min-h-10 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]';
  const divider = 'h-5 w-px bg-[var(--rule)]';

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-xl w-full px-4">
      <div
        role="toolbar"
        aria-label={`${count} ${itemLabel}${count === 1 ? '' : 's'} selected`}
        className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-elevated)]"
      >
        <span className="mr-1 whitespace-nowrap text-sm font-medium text-[var(--ink)]">
          {count} selected
        </span>

        {!allSelected && (
          <>
            <button onClick={onSelectAll} className={neutralButton}>
              Select All
            </button>
            <div className={divider} />
          </>
        )}

        {children}

        <button
          onClick={onDelete}
          className="min-h-10 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)] hover:text-[var(--ink-inverse)]"
        >
          Delete
        </button>

        <div className={divider} />

        <button
          onClick={onClear}
          aria-label="Cancel selection"
          className="flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
