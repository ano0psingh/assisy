import { useState } from 'react';
import type { TaskCategory, Priority, Effort } from '../../types';
import { Plus, X } from 'lucide-react';

interface QuickAddTaskProps {
  onSubmit: (data: {
    title: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
  }) => void;
}

export function QuickAddTask({ onSubmit }: QuickAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Personal');
  const [priority, setPriority] = useState<Priority>('High');
  const [effort, setEffort] = useState<Effort>('Low');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      category,
      priority,
      effort,
    });

    // Reset form
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
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
      >
        <Plus size={16} />
        <span>Quick Add</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Quick Add Task</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            autoFocus
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="Personal">Personal</option>
              <option value="Financial">Financial</option>
              <option value="Professional">Professional</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="High">High Pri</option>
              <option value="Low">Low Pri</option>
            </select>

            <select
              value={effort}
              onChange={(e) => setEffort(e.target.value as Effort)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="High">High Effort</option>
              <option value="Low">Low Effort</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}