import { useState } from 'react';
import type { Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { X, Sunrise, CheckSquare, Plus, Zap, CalendarDays, Target, Flame } from 'lucide-react';

interface PlanYourDayProps {
  isOpen: boolean;
  onClose: () => void;
  todaysTasks: Task[];
  suggestedTasks: Task[];
  onAddToToday: (taskId: string) => void;
  onRemoveFromToday: (taskId: string) => void;
}

export function PlanYourDay({
  isOpen,
  onClose,
  todaysTasks,
  suggestedTasks,
  onAddToToday,
  onRemoveFromToday,
}: PlanYourDayProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleToggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleConfirm = () => {
    selectedTasks.forEach(taskId => {
      onAddToToday(taskId);
    });
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter out manually added tasks (they can be removed)
  const autoTasks = todaysTasks.filter(task => {
    const isFocusedToday = task.isFocusedToday && task.focusedDate === todayStr;
    return !isFocusedToday;
  });
  
  const manuallyAddedTasks = todaysTasks.filter(task => {
    const isFocusedToday = task.isFocusedToday && task.focusedDate === todayStr;
    return isFocusedToday;
  });

  const totalPotentialXP = [...todaysTasks, ...Array.from(selectedTasks).map(id => 
    suggestedTasks.find(t => t.id === id)
  ).filter(Boolean)]
    .filter(t => t && t.category !== 'Professional')
    .reduce((sum, t) => sum + (t?.xpValue || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div className={`relative rounded-2xl shadow-elevated w-full max-w-2xl animate-slide-up overflow-hidden ${
        isDark 
          ? 'bg-[#12121a] border border-white/10' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-gradient-to-br from-amber-50 to-orange-50'
              }`}>
                <Sunrise className={`w-7 h-7 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Plan Your Day ✨
                </h2>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <button 
              onClick={handleSkip}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* XP Preview */}
          <div className={`mt-4 flex items-center space-x-2 px-4 py-2 rounded-xl ${
            isDark ? 'bg-amber-500/10' : 'bg-amber-50'
          }`}>
            <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              {totalPotentialXP} XP potential for today
            </span>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Auto-included Tasks */}
          {autoTasks.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <CheckSquare size={16} />
                <span>Already on Today's List</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                  {autoTasks.length}
                </span>
              </h3>
              <div className="space-y-2">
                {autoTasks.map(task => (
                  <TaskRow key={task.id} task={task} isDark={isDark} type="auto" />
                ))}
              </div>
            </div>
          )}

          {/* Manually Added Tasks */}
          {manuallyAddedTasks.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <Plus size={16} />
                <span>Manually Added</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                  {manuallyAddedTasks.length}
                </span>
              </h3>
              <div className="space-y-2">
                {manuallyAddedTasks.map(task => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    isDark={isDark} 
                    type="manual" 
                    onRemove={() => onRemoveFromToday(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tasks */}
          {suggestedTasks.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <Target size={16} />
                <span>Add More Tasks</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  {suggestedTasks.length} available
                </span>
              </h3>
              <div className="space-y-2">
                {suggestedTasks.map(task => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    isDark={isDark} 
                    type="suggested"
                    isSelected={selectedTasks.has(task.id)}
                    onToggle={() => handleToggleTask(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {autoTasks.length === 0 && manuallyAddedTasks.length === 0 && suggestedTasks.length === 0 && (
            <div className="text-center py-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                isDark ? 'bg-violet-500/20' : 'bg-violet-50'
              }`}>
                <CheckSquare className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                No tasks yet
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Create some tasks to plan your day!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {selectedTasks.size > 0 
                ? `${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} selected`
                : 'Select tasks to add to today'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleSkip}
                className="btn-secondary px-5 py-2.5 rounded-xl"
              >
                Skip for now
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedTasks.size === 0 && manuallyAddedTasks.length === 0}
                className={`btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2 ${
                  selectedTasks.size === 0 && manuallyAddedTasks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>Let's Go!</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for task rows
function TaskRow({ 
  task, 
  isDark, 
  type,
  isSelected,
  onToggle,
  onRemove,
}: { 
  task: Task; 
  isDark: boolean; 
  type: 'auto' | 'manual' | 'suggested';
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Personal': return isDark ? 'text-blue-400' : 'text-blue-500';
      case 'Financial': return isDark ? 'text-emerald-400' : 'text-emerald-500';
      case 'Professional': return isDark ? 'text-gray-400' : 'text-gray-500';
      default: return isDark ? 'text-gray-400' : 'text-gray-500';
    }
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
        type === 'suggested' ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? isDark ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'
          : isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
      }`}
      onClick={type === 'suggested' ? onToggle : undefined}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {type === 'suggested' && (
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? 'bg-violet-500 border-violet-500' 
              : isDark ? 'border-gray-600' : 'border-slate-300'
          }`}>
            {isSelected && <CheckSquare size={12} className="text-white" />}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {task.title}
            </span>
            {task.priority === 'High' && (
              <Flame size={14} className="text-red-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-xs ${getCategoryColor(task.category)}`}>{task.category}</span>
            {task.dueDate && (
              <span className={`text-xs flex items-center space-x-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                <CalendarDays size={10} />
                <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </span>
            )}
            {task.xpValue > 0 && task.category !== 'Professional' && (
              <span className={`text-xs flex items-center space-x-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>
                <Zap size={10} />
                <span>{task.xpValue}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {type === 'manual' && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark 
              ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' 
              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
          }`}
          title="Remove from today"
        >
          <X size={16} />
        </button>
      )}
      
      {type === 'auto' && (
        <span className={`text-xs px-2 py-1 rounded-lg ${
          isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
        }`}>
          {task.dueDate && new Date(task.dueDate) < new Date() ? 'Overdue' : 
           task.isRecurring ? task.recurrencePattern : 
           task.status === 'Carried Forward' ? 'Carried' : 'Due today'}
        </span>
      )}
    </div>
  );
}
