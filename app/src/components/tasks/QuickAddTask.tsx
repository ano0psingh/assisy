import { useState } from 'react';
import { Plus } from 'lucide-react';
import { QuickCapture } from './QuickCapture';

export function QuickAddTask() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <QuickCapture
      open={isOpen}
      onClose={() => setIsOpen(false)}
      anchorClassName="relative hidden md:block [&_[role=dialog]]:right-0 [&_[role=dialog]]:top-full [&_[role=dialog]]:mt-3"
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Plus size={15} />
        <span>Add</span>
      </button>
    </QuickCapture>
  );
}
