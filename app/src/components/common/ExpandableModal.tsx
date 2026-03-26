import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ExpandableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  maxWidth?: string;
  children: (isFullScreen: boolean) => ReactNode;
  footer?: ReactNode;
}

const DISMISS_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

export function ExpandableModal({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-md',
  children,
  footer,
}: ExpandableModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const dragStart = useRef<{ y: number; time: number } | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFullScreen(false);
      setDragY(0);
      setDismissing(false);
    }
    if (isOpen) {
      document.documentElement.setAttribute('data-modal-open', 'true');
    } else {
      document.documentElement.removeAttribute('data-modal-open');
    }
    return () => document.documentElement.removeAttribute('data-modal-open');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isFullScreen, onClose]);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    if (isFullScreen) return;
    dragStart.current = { y: e.touches[0].clientY, time: Date.now() };
    dragging.current = true;
  }, [isFullScreen]);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current || !dragStart.current || isFullScreen) return;
    const dy = e.touches[0].clientY - dragStart.current.y;
    if (dy > 0) setDragY(dy);
  }, [isFullScreen]);

  const handleDragEnd = useCallback(() => {
    if (!dragging.current || !dragStart.current) return;
    dragging.current = false;
    const elapsed = Date.now() - dragStart.current.y;
    const velocity = dragY / Math.max(1, Date.now() - dragStart.current.time);

    if (dragY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      setDismissing(true);
      setDragY(window.innerHeight);
      setTimeout(onClose, 200);
    } else {
      setDragY(0);
    }
    dragStart.current = null;
  }, [dragY, onClose]);

  if (!isOpen) return null;

  const dragHandle = (
    <div
      className="flex justify-center pt-3 pb-1 cursor-grab sm:hidden"
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <div className={`w-9 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-300'}`} />
    </div>
  );

  const header = (
    <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${
      isDark ? 'border-white/10' : 'border-slate-100'
    }`}>
      <div className="flex items-center space-x-3">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-violet-500/20' : 'bg-violet-100'
          }`}>
            {icon}
          </div>
        )}
        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h2>
      </div>
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setIsFullScreen(!isFullScreen)}
          title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  const footerEl = footer ? (
    <div className={`flex-shrink-0 px-6 py-4 pb-2 safe-area-pb border-t ${
      isDark ? 'border-white/10' : 'border-slate-100'
    }`}>
      {footer}
    </div>
  ) : null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        <div className={`absolute inset-0 ${isDark ? 'bg-[#0c0c10]' : 'bg-[#f8f8fa]'}`} />
        <div className={`relative flex flex-col h-full w-full animate-fade-in ${
          isDark ? 'bg-[#0c0c10]' : 'bg-[#f8f8fa]'
        }`}>
          {header}
          <div className="flex-1 overflow-y-auto">
            {children(true)}
          </div>
          {footerEl}
        </div>
      </div>
    );
  }

  const backdropOpacity = Math.max(0, 1 - dragY / 400);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div
        className={`absolute inset-0 backdrop-blur-xl ${isDark ? 'bg-black/50' : 'bg-slate-900/15'}`}
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />
      <div
        className={`relative rounded-t-3xl sm:rounded-2xl w-full ${maxWidth} max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden ${
          dismissing ? '' : 'animate-slide-up'
        } ${isDark ? 'bg-[#141418]/90 border border-white/[0.1] backdrop-blur-2xl' : 'bg-white/85 border border-white/60 backdrop-blur-2xl'}`}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isDark
            ? '0 -4px 40px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.08)'
            : '0 -4px 40px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(255,255,255,0.8)',
        }}
      >
        {dragHandle}
        {header}
        <div className="flex-1 overflow-y-auto">
          {children(false)}
        </div>
        {footerEl}
      </div>
    </div>
  );
}
