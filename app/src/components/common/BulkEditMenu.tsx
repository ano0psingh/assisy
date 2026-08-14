import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface BulkEditOption {
  label: string;
  value: string | number;
}

/**
 * One editable field in the bulk edit popover. `key` is the entity field name;
 * the page decides how to turn the chosen value into an update.
 */
export type BulkEditField =
  | { key: string; label: string; kind: 'choice'; options: BulkEditOption[] }
  | { key: string; label: string; kind: 'date' | 'time' };

interface BulkEditMenuProps {
  fields: BulkEditField[];
  /** `value` is null when the user clears a date or time field. */
  onApply: (key: string, value: string | number | null) => void;
  className?: string;
}

/**
 * "Edit" control for {@link BulkActionBar}. Each choice applies immediately and
 * closes the popover, so a bulk edit is one tap and one undoable toast rather
 * than a staged form.
 */
export function BulkEditMenu({ fields, onApply, className = '' }: BulkEditMenuProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Capture phase so Escape closes this popover before the list's own Escape
    // handler exits selection mode — one press per layer.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const apply = (key: string, value: string | number | null) => {
    onApply(key, value);
    setOpen(false);
  };

  const optionClass = `px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
    isDark
      ? 'bg-white/[0.06] text-gray-300 hover:bg-violet-500/20 hover:text-violet-300'
      : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'
  }`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
          open
            ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-700'
            : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        } ${className}`}
      >
        <SlidersHorizontal size={13} />
        Edit
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="group"
          aria-label="Edit selected items"
          className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[70] w-60 max-h-[60vh] overflow-y-auto rounded-2xl p-3 shadow-2xl backdrop-blur-xl outline-none ${
            isDark ? 'bg-gray-900/95 border border-white/10' : 'bg-white/95 border border-slate-200'
          }`}
        >
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key}>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                  isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  {field.label}
                </div>

                {field.kind === 'choice' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {field.options.map(option => (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => apply(field.key, option.value)}
                        className={optionClass}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type={field.kind}
                      aria-label={field.label}
                      onChange={e => {
                        if (e.target.value) apply(field.key, e.target.value);
                      }}
                      className={`flex-1 min-w-0 px-2 py-1 rounded-lg text-xs outline-none ${
                        isDark
                          ? 'bg-white/[0.06] text-gray-200 border border-white/10'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    />
                    <button type="button" onClick={() => apply(field.key, null)} className={optionClass}>
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
