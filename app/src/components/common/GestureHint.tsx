import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { usePersistentState } from '../../hooks/usePersistentState';

interface GestureHintProps {
  /** Stable id; the dismissal is remembered under it. */
  id: string;
  children: React.ReactNode;
}

/**
 * A one-off, dismissible tip shown only on touch layouts.
 *
 * Gestures like swipe-to-complete were explained once in the onboarding tour
 * and never again, so anyone who skipped or forgot it had no way to discover
 * them.
 */
export function GestureHint({ id, children }: GestureHintProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dismissed, setDismissed] = usePersistentState(`assisy_hint_${id}`, false);

  if (dismissed) return null;

  return (
    <div
      className={`md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
        isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100/70 text-slate-500'
      }`}
    >
      <p className="flex-1">{children}</p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss tip"
        className={`p-2 -m-1 rounded-lg flex-shrink-0 ${
          isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-slate-200 text-slate-400'
        }`}
      >
        <X size={13} />
      </button>
    </div>
  );
}
