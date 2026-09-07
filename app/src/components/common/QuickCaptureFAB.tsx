import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { QuickCapture } from '../tasks/QuickCapture';

export function QuickCaptureFAB() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => document.documentElement.hasAttribute('data-modal-open'));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHidden(document.documentElement.hasAttribute('data-modal-open'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modal-open'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  if (hidden) return null;

  return (
    <QuickCapture
      open={open}
      onClose={() => setOpen(false)}
      anchorClassName="fixed bottom-20 right-4 z-40 md:hidden [&_[role=dialog]]:bottom-14 [&_[role=dialog]]:right-0"
    >
      {!open && (
        <button
          ref={triggerRef}
          aria-label="Quick add a task"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--action)] text-[var(--action-ink)] shadow-[var(--shadow-medium)] hover:bg-[var(--action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
        >
          <Plus size={22} />
        </button>
      )}
    </QuickCapture>
  );
}
