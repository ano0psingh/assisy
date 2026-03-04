import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Undo2, X } from 'lucide-react';

type UndoAction = {
  id: string;
  label: string;
  onUndo: () => void;
};

interface UndoContextType {
  pushUndo: (label: string, onUndo: () => void) => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [action, setAction] = useState<UndoAction | null>(null);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setAction(null);
    if (timer) clearTimeout(timer);
  }, [timer]);

  const pushUndo = useCallback((label: string, onUndo: () => void) => {
    if (timer) clearTimeout(timer);
    const id = Date.now().toString();
    setAction({ id, label, onUndo });
    const t = setTimeout(() => setAction(null), 5000);
    setTimer(t);
  }, [timer]);

  const handleUndo = () => {
    if (action) {
      action.onUndo();
      dismiss();
    }
  };

  return (
    <UndoContext.Provider value={{ pushUndo }}>
      {children}

      {/* Toast */}
      {action && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated ${
            isDark
              ? 'bg-[#1a1a2e] border border-white/10 text-gray-200'
              : 'bg-white border border-slate-200 text-slate-700 shadow-lg'
          }`}>
            <span className="text-sm">{action.label}</span>
            <button
              onClick={handleUndo}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}
            >
              <Undo2 size={14} />
              Undo
            </button>
            <button
              onClick={dismiss}
              className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
}
