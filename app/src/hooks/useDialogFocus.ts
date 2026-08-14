import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Focus management for a modal overlay: moves focus in on open, keeps Tab
 * inside it, and returns focus to the trigger on close.
 *
 * Without this, tabbing inside an open modal walks off into the page behind it,
 * and closing the modal drops focus at the top of the document — so keyboard
 * and screen reader users lose their place on every dialog.
 *
 * Attach the returned ref to the dialog panel, which also needs
 * `role="dialog"`, `aria-modal="true"` and `tabIndex={-1}`.
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>(isOpen: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const restoreTo = document.activeElement as HTMLElement | null;

    const visibleFocusable = () => {
      const container = containerRef.current;
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        // `offsetParent` is null for anything display:none, which covers the
        // controls the modal hides at different breakpoints.
        .filter(el => el.offsetParent !== null);
    };

    // Respect an autoFocus field that already took focus inside the dialog.
    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) {
      (visibleFocusable()[0] ?? container).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = visibleFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // No-op if the trigger has since unmounted.
      restoreTo?.focus?.();
    };
  }, [isOpen]);

  return containerRef;
}
