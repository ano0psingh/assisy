import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { QuickCapture } from '../tasks/QuickCapture';

export function QuickCaptureFAB() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => document.documentElement.hasAttribute('data-modal-open'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHidden(document.documentElement.hasAttribute('data-modal-open'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-modal-open'] });
    return () => observer.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <QuickCapture
      open={open}
      onClose={() => setOpen(false)}
      anchorClassName="fixed bottom-20 right-4 z-40 md:hidden [&_[role=dialog]]:bottom-14 [&_[role=dialog]]:right-0"
    >
      {!open && (
        <button
          aria-label="Quick add a task"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg transition-transform active:scale-95"
        >
          <Plus size={22} />
        </button>
      )}
    </QuickCapture>
  );
}
