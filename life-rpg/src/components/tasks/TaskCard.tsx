import type { Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Check, Clock, Trash2, Flame, Zap } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onDelete }: TaskCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isCompleted = task.status === 'Completed';
  
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Personal': return 'badge-blue';
      case 'Financial': return 'badge-green';
      case 'Professional': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  return (
    <div className={`group rounded-xl p-4 transition-all duration-200 ${
      isDark 
        ? `bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 ${isCompleted ? 'opacity-60' : ''}`
        : `bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 ${isCompleted ? 'opacity-60 bg-slate-50' : ''}`
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {/* Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isCompleted 
                ? 'bg-emerald-500 border-emerald-500 shadow-sm' 
                : isDark
                  ? 'border-gray-600 hover:border-violet-500 hover:bg-violet-500/20'
                  : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50'
            }`}
          >
            {isCompleted && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
          
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`font-medium ${
              isCompleted 
                ? isDark ? 'line-through text-gray-500' : 'line-through text-slate-400'
                : isDark ? 'text-white' : 'text-slate-800'
            }`}>
              {task.title}
            </h3>
            
            {/* Description */}
            {task.description && (
              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{task.description}</p>
            )}
            
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Category */}
              <span className={`badge ${getCategoryBadge(task.category)}`}>
                {task.category}
              </span>
              
              {/* Priority */}
              <span className={`badge ${task.priority === 'High' ? 'badge-red' : 'badge-yellow'}`}>
                {task.priority === 'High' && <Flame size={12} className="mr-1" />}
                {task.priority}
              </span>
              
              {/* Effort */}
              <span className={`badge ${task.effort === 'High' ? 'badge-orange' : 'badge-green'}`}>
                {task.effort} Effort
              </span>
              
              {/* XP Badge */}
              {task.category !== 'Professional' && task.xpValue > 0 && (
                <span className="badge badge-yellow">
                  <Zap size={12} className="mr-1" />
                  {task.xpValue} XP
                </span>
              )}
              
              {/* Recurring Badge */}
              {task.isRecurring && (
                <span className="badge badge-purple">
                  <Clock size={12} className="mr-1" />
                  {task.recurrencePattern}
                </span>
              )}
            </div>
            
            {/* Carried Forward Notice */}
            {task.status === 'Carried Forward' && (
              <div className="flex items-center space-x-1.5 mt-2 text-xs text-orange-500">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span>Carried forward from previous day</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(task.id)}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20' 
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
