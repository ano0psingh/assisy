import { useState, useEffect, type ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ExpandableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  maxWidth?: string;
  /** Popup mode content */
  children: (isFullScreen: boolean) => ReactNode;
  /** Optional footer (action buttons) — rendered pinned at bottom */
  footer?: ReactNode;
}

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

  useEffect(() => {
    if (!isOpen) {
      setIsFullScreen(false);
    }
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

  if (!isOpen) return null;

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
    <div className={`flex-shrink-0 px-6 py-4 border-t ${
      isDark ? 'border-white/10' : 'border-slate-100'
    }`}>
      {footer}
    </div>
  ) : null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col">
        <div className={`absolute inset-0 ${isDark ? 'bg-[#0a0a12]' : 'bg-slate-50'}`} />
        <div className={`relative flex flex-col h-full w-full animate-fade-in ${
          isDark ? 'bg-[#0a0a12]' : 'bg-slate-50'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={onClose}
      />
      <div className={`relative rounded-2xl shadow-elevated w-full ${maxWidth} max-h-[90vh] flex flex-col animate-slide-up overflow-hidden ${
        isDark
          ? 'bg-[#12121a] border border-white/10'
          : 'bg-white'
      }`}>
        {header}
        <div className="flex-1 overflow-y-auto">
          {children(false)}
        </div>
        {footerEl}
      </div>
    </div>
  );
}
