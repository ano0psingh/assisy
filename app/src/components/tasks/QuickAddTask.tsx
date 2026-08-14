import { useState } from 'react';
import type { TaskCategory, Priority, Effort } from '../../types';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
        className="btn-primary px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-sm"
      >
        <Plus size={15} />
        <span>Add</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className={`absolute top-full right-0 mt-3 w-80 rounded-2xl shadow-elevated z-50 overflow-hidden animate-slide-down ${
        isDark
          ? 'bg-[#12121a] border border-white/10'
          : 'bg-white border border-slate-200'
      }`}>
        <form onSubmit={e => { e.preventDefault(); submit(true); }} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Quick Add</h3>
            <button
              aria-label="Close"
              type="button"
              onClick={handleCancel}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
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
            className="w-full px-3 py-2.5 input rounded-xl text-sm"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="px-2 py-1.5 input rounded-lg text-xs">
              <option value="Personal">Personal</option>
              <option value="Financial">Financial</option>
              <option value="Professional">Professional</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="px-2 py-1.5 input rounded-lg text-xs">
              <option value="High">High Pri</option>
              <option value="Low">Low Pri</option>
            </select>
            <select value={effort} onChange={(e) => setEffort(e.target.value as Effort)} className="px-2 py-1.5 input rounded-lg text-xs">
              <option value="High">High Effort</option>
              <option value="Low">Low Effort</option>
            </select>
          </div>

          {/* Two clear action paths */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}
            >
              <CalendarPlus size={14} />
              Today
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
