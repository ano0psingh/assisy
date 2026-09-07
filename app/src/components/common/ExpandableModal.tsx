import { useState, useEffect, useRef, useCallback, useId, type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ExpandableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  maxWidth?: string;
  expandable?: boolean;
  showClose?: boolean;
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
  expandable = true,
  showClose = true,
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
      className="flex cursor-grab justify-center pb-1 pt-3 sm:hidden"
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <div className="h-1 w-9 rounded-full bg-[var(--rule-strong)]" />
    </div>
  );

  const header = (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--rule)] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]">
            {icon}
          </div>
        )}
        <h2 id={titleId} className="truncate text-xl font-bold tracking-[-0.015em] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-1">
        {expandable && (
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
            aria-label={isFullScreen ? 'Exit full screen' : 'Expand to full screen'}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );

  const footerEl = footer ? (
    <div className="safe-area-pb flex-shrink-0 border-t border-[var(--rule)] bg-[var(--surface)] px-5 py-4 sm:px-6">
      {footer}
    </div>
  ) : null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        <div className="absolute inset-0 bg-[var(--canvas)]" />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex h-full w-full animate-fade-in flex-col bg-[var(--canvas)] outline-none"
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
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-end justify-center sm:items-center sm:p-4">
      <div
        className="ui-overlay absolute inset-0"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)] outline-none sm:max-h-[90vh] sm:rounded-[var(--radius-lg)] ${
          dismissing ? '' : 'animate-slide-up'
        }`}
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
