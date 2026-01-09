import { Zap, User } from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTaskContext } from '../../context/TaskContext';
import type { TaskCategory, Priority, Effort } from '../../types';

// Calculate level from XP (100 XP per level)
function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

// Get title based on level
function getTitle(level: number): string {
  if (level <= 5) return 'Task Initiate';
  if (level <= 10) return 'Task Apprentice';
  if (level <= 20) return 'Task Warrior';
  if (level <= 30) return 'Taskmaster';
  if (level <= 50) return 'Grand Taskmaster';
  return 'Legendary Achiever';
}

export function Header() {
  const { createTask, getTotalXP } = useTaskContext();
  const totalXP = getTotalXP();
  const level = calculateLevel(totalXP);
  const title = getTitle(level);

  const handleQuickAdd = (data: {
    title: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
  }) => {
    createTask(data.title, '', data.category, data.priority, data.effort);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-purple-400">Life RPG</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <QuickAddTask onSubmit={handleQuickAdd} />
        
        <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
          <Zap className="text-yellow-400" size={16} />
          <span className="text-yellow-400 font-medium">{totalXP.toLocaleString()} XP</span>
          <span className="text-gray-500">|</span>
          <span className="text-purple-400">Lv {level}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-300 text-sm font-medium">Kage</span>
            <span className="text-gray-500 text-xs">{title}</span>
          </div>
        </div>
      </div>
    </header>
  );
}