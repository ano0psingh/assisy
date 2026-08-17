import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react';
import { hapticLight } from '../../lib/haptics';

type ToastType = 'success' | 'error' | 'info' | 'undo';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastContextType {
  toast: (opts: { message: string; type?: ToastType; action?: { label: string; onClick: () => void }; duration?: number }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  undo: Undo2,
};

function ToastCard({ item, onDismiss, isDark }: { item: ToastItem; onDismiss: (id: string) => void; isDark: boolean }) {
  const [exiting, setExiting] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, handleDismiss]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    setDragX(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (Math.abs(dragX) > 80) {
      handleDismiss();
    } else {
      setDragX(0);
    }
  };

  const Icon = ICONS[item.type];
  const iconColor = item.type === 'success' ? 'text-emerald-400' :
    item.type === 'error' ? 'text-red-400' :
    item.type === 'undo' ? 'text-violet-400' : 'text-blue-400';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all backdrop-blur-2xl ${
        exiting ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100'
      } ${'bg-white/75 border border-white/60 text-slate-700 dark:bg-[#1a1a2e]/80 dark:border-white/[0.1] dark:text-gray-200'
      }`}
      style={{
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.06)' : '0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 0.5px rgba(255,255,255,0.8)',
        transform: `translateX(${dragX}px)${exiting ? ' translateY(8px) scale(0.95)' : ''}`,
        opacity: Math.max(0, 1 - Math.abs(dragX) / 150),
        transition: dragging.current ? 'none' : 'all 0.2s ease',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Icon size={16} className={`flex-shrink-0 ${iconColor}`} />
      <span className="text-sm flex-1 min-w-0">{item.message}</span>
      {item.action && (
        <button
          onClick={() => { item.action!.onClick(); handleDismiss(); }}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
          }`}
        >
          {item.action.label}
        </button>
      )}
      <button
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
          'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
        }`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ message, type = 'info', action, duration = 3000 }: {
    message: string; type?: ToastType; action?: { label: string; onClick: () => void }; duration?: number;
  }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    hapticLight();
    setToasts(prev => {
      const next = [...prev, { id, message, type, action, duration }];
      return next.length > 3 ? next.slice(-3) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
          {toasts.map(item => (
            <div key={item.id} className="animate-slide-up">
              <ToastCard item={item} onDismiss={dismiss} isDark={isDark} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
