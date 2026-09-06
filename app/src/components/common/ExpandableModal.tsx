import { useState, useEffect, useRef, useCallback, useId, type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
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
const FLOATING_NAV_SELECTOR = '.bottom-nav-bar, [data-floating-navigation]';
let openOverlayCount = 0;
const hiddenNavigation = new Map<HTMLElement, {
  ariaHidden: string | null;
  inert: boolean;
  visibility: string;
  pointerEvents: string;
}>();

function setOverlayEnvironment(open: boolean) {
  if (open) {
    openOverlayCount += 1;
    if (openOverlayCount > 1) return;
    document.documentElement.setAttribute('data-modal-open', 'true');
    document.body.setAttribute('data-overlay-open', 'true');
    document.querySelectorAll<HTMLElement>(FLOATING_NAV_SELECTOR).forEach((element) => {
      hiddenNavigation.set(element, {
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.inert,
        visibility: element.style.visibility,
        pointerEvents: element.style.pointerEvents,
      });
      element.setAttribute('aria-hidden', 'true');
      element.inert = true;
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    });
    return;
  }

  openOverlayCount = Math.max(0, openOverlayCount - 1);
  if (openOverlayCount > 0) return;
  document.documentElement.removeAttribute('data-modal-open');
  document.body.removeAttribute('data-overlay-open');
  hiddenNavigation.forEach((previous, element) => {
    if (previous.ariaHidden === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', previous.ariaHidden);
    element.inert = previous.inert;
    element.style.visibility = previous.visibility;
    element.style.pointerEvents = previous.pointerEvents;
  });
  hiddenNavigation.clear();
}

export function ExpandableModal(props: ExpandableModalProps) {
  if (!props.isOpen) return null;
  return <OpenExpandableModal {...props} />;
}

function OpenExpandableModal({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-md',
  children,
  footer,
}: ExpandableModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(isOpen);
  const titleId = `dialog-title-${useId()}`;
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ y: number; time: number } | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    setOverlayEnvironment(true);
    return () => setOverlayEnvironment(false);
  }, []);

  useEffect(() => {
    // Fullscreen swaps the panel element while the modal remains mounted.
    // Restore focus into the replacement so the existing document-level trap
    // continues from inside the active dialog.
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [dialogRef, isFullScreen]);

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
    setIsDragging(true);
  }, [isFullScreen]);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current || !dragStart.current || isFullScreen) return;
    const dy = e.touches[0].clientY - dragStart.current.y;
    if (dy > 0) setDragY(dy);
  }, [isFullScreen]);

  const handleDragEnd = useCallback(() => {
    if (!dragging.current || !dragStart.current) return;
    dragging.current = false;
    setIsDragging(false);
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

  const dragHandle = (
    <div
      className="flex justify-center pt-3 pb-1 cursor-grab sm:hidden"
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <div className={`w-9 h-1 rounded-full bg-slate-300 dark:bg-white/20`} />
    </div>
  );

  const header = (
    <div className={`flex items-center justify-between p-6 border-b flex-shrink-0 ${
      'border-slate-100 dark:border-white/10'
    }`}>
      <div className="flex items-center space-x-3">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            'bg-violet-100 dark:bg-violet-500/20'
          }`}>
            {icon}
          </div>
        )}
        <h2 id={titleId} className={`text-lg font-semibold text-slate-800 dark:text-white`}>
          {title}
        </h2>
      </div>
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setIsFullScreen(!isFullScreen)}
          title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
          aria-label={isFullScreen ? 'Exit full screen' : 'Expand to full screen'}
          className={`p-2 rounded-lg transition-colors ${
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className={`p-2 rounded-lg transition-colors ${
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  const footerEl = footer ? (
    <div className={`flex-shrink-0 px-6 py-4 pb-2 safe-area-pb border-t ${
      'border-slate-100 dark:border-white/10'
    }`}>
      {footer}
    </div>
  ) : null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        <div className="absolute inset-0 bg-[#f8f8fa] dark:bg-[#0c0c10]" />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex h-full w-full flex-col bg-[#f8f8fa] animate-fade-in outline-none dark:bg-[#0c0c10]"
        >
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
        className={`absolute inset-0 backdrop-blur-xl bg-slate-900/15 dark:bg-black/50`}
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative rounded-t-3xl sm:rounded-2xl w-full ${maxWidth} max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden outline-none ${
          dismissing ? '' : 'animate-slide-up'
        } border border-white/60 bg-white/85 shadow-elevated backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#141418]/90`}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
