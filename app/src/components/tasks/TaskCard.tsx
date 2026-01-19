import type { Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Check, Clock, Trash2, Flame, Zap, Pencil, RotateCcw, CalendarDays, CalendarPlus, CalendarMinus } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onAddToToday?: (taskId: string) => void;
  onRemoveFromToday?: (taskId: string) => void;
  showTodayActions?: boolean; // Whether to show add/remove from today buttons
  isInTodayView?: boolean; // Whether this card is shown in Today's Tasks section
}

// Helper to check if task is from a previous day
function isFromPreviousDay(createdAt: Date): boolean {
  const today = new Date();
  const taskDate = new Date(createdAt);
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

// Helper to get days ago text
function getDaysAgoText(createdAt: Date): string {
  const today = new Date();
  const taskDate = new Date(createdAt);
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - taskDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// Helper to format due date
function formatDueDate(dueDate: Date): { text: string; isOverdue: boolean; isToday: boolean } {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
  if (diffDays === 0) return { text: 'Today', isOverdue: false, isToday: true };
  if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false, isToday: false };
  if (diffDays <= 7) return { text: `${diffDays}d`, isOverdue: false, isToday: false };
  return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false, isToday: false };
}

export function TaskCard({ 
  task, 
  onToggleComplete, 
  onDelete, 
  onEdit, 
  onAddToToday,
  onRemoveFromToday,
  showTodayActions = false,
  isInTodayView = false,
}: TaskCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isCompleted = task.status === 'Completed';
  const isCarriedForward = task.status === 'Carried Forward' || (!task.isRecurring && isFromPreviousDay(task.createdAt) && !isCompleted);
  const daysAgoText = isCarriedForward && !task.isRecurring ? getDaysAgoText(task.createdAt) : '';
  
  // Check if task is manually focused for today
  const todayStr = new Date().toISOString().split('T')[0];
  const isFocusedToday = task.isFocusedToday && task.focusedDate === todayStr;
  
  // Check if task is auto-included (due today, overdue, recurring)
  const isDueToday = task.dueDate && (() => {
    const due = new Date(task.dueDate as Date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  })();
  
  const isOverdue = task.dueDate && (() => {
    const due = new Date(task.dueDate as Date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();
  
  // Can remove from today only if manually added (not auto-included)
  const canRemoveFromToday = isFocusedToday && !isDueToday && !isOverdue && !task.isRecurring && task.status !== 'Carried Forward';
  
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
            {/* Title - clickable to edit */}
            <h3 
              onClick={() => onEdit(task)}
              className={`font-medium cursor-pointer hover:opacity-80 ${
                isCompleted 
                  ? isDark ? 'line-through text-gray-500' : 'line-through text-slate-400'
                  : isDark ? 'text-white' : 'text-slate-800'
              }`}
            >
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
              
              {/* Carried Forward Badge - inline with other badges */}
              {isCarriedForward && !isCompleted && (
                <span className={`badge ${isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-600 border-orange-200'} border`}>
                  <RotateCcw size={12} className="mr-1" />
                  {daysAgoText}
                </span>
              )}
              
              {/* Focused Today Badge - shows when manually added */}
              {isFocusedToday && isInTodayView && (
                <span className={`badge ${isDark ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-violet-100 text-violet-600 border-violet-200'} border`}>
                  <CalendarPlus size={12} className="mr-1" />
                  Added
                </span>
              )}
              
              {/* Due Date Badge */}
              {task.dueDate && !isCompleted && (() => {
                const { text, isOverdue, isToday } = formatDueDate(task.dueDate);
                return (
                  <span className={`badge border ${
                    isOverdue 
                      ? isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-600 border-red-200'
                      : isToday
                      ? isDark ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-violet-100 text-violet-600 border-violet-200'
                      : isDark ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CalendarDays size={12} className="mr-1" />
                    {text}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* Actions - always visible */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Add to Today button - shown on Tasks page when not in today */}
          {showTodayActions && !isInTodayView && onAddToToday && !isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToToday(task.id); }}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20' 
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              title="Add to Today's Tasks"
            >
              <CalendarPlus size={18} />
            </button>
          )}
          
          {/* Remove from Today button - shown on Dashboard when manually added */}
          {isInTodayView && canRemoveFromToday && onRemoveFromToday && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromToday(task.id); }}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-orange-400 hover:bg-orange-500/20' 
                  : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
              }`}
              title="Remove from Today's Tasks"
            >
              <CalendarMinus size={18} />
            </button>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/20' 
                : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
            }`}
            title="Edit task"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' 
                : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
            }`}
            title="Delete task"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
