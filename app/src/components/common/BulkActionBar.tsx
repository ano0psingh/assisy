import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (count === 0) return null;

  const neutralButton = `px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
    isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;
  const divider = `w-px h-5 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-xl w-full px-4">
      <div
        role="toolbar"
        aria-label={`${count} ${itemLabel}${count === 1 ? '' : 's'} selected`}
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl ${
          isDark ? 'bg-gray-900/90 border border-white/10' : 'bg-white/90 border border-slate-200 shadow-slate-200/50'
        }`}
      >
        <span className={`text-sm font-medium mr-1 whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
          className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors whitespace-nowrap"
        >
          Delete
        </button>

        <div className={divider} />

        <button
          onClick={onClear}
          aria-label="Cancel selection"
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
          }`}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
