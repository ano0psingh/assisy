import { useState } from 'react';
import type { TaskCategory, Priority, Effort } from '../../types';
import { Plus, X, CalendarPlus, Archive } from 'lucide-react';

interface QuickAddTaskProps {
  onSubmit: (data: {
    title: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
    addToToday?: boolean;
  }) => void;
}

export function QuickAddTask({ onSubmit }: QuickAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');

  const submit = (addToToday: boolean) => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), category, priority, effort, addToToday });
    setTitle('');
    setCategory('Personal');
    setPriority('High');
    setEffort('Low');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTitle('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
      >
        <Plus size={15} />
        <span>Add</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className={`absolute top-full right-0 mt-3 w-80 rounded-2xl shadow-elevated z-50 overflow-hidden animate-slide-down ${
        'bg-white border border-slate-200 dark:bg-[#12121a] dark:border-white/10'
      }`}>
        <form onSubmit={e => { e.preventDefault(); submit(true); }} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm text-slate-800 dark:text-white`}>Quick Add</h3>
            <button
              aria-label="Close"
              type="button"
              onClick={handleCancel}
              className={`p-2 rounded-lg transition-colors ${
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-3 input rounded-xl text-sm"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="px-2 py-2 input rounded-lg text-xs">
              <option value="Personal">Personal</option>
              <option value="Financial">Financial</option>
              <option value="Professional">Professional</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="px-2 py-2 input rounded-lg text-xs">
              <option value="High">High Pri</option>
              <option value="Low">Low Pri</option>
            </select>
            <select value={effort} onChange={(e) => setEffort(e.target.value as Effort)} className="px-2 py-2 input rounded-lg text-xs">
              <option value="High">High Effort</option>
              <option value="Low">Low Effort</option>
            </select>
          </div>

          {/* Two clear action paths */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
              }`}
            >
              <CalendarPlus size={14} />
              Today
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
              }`}
            >
              <Archive size={14} />
              Backlog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
