import type { Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Trash2, CheckCircle, Archive, RotateCcw, ChevronRight } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  linkedTasksCount: number;
  completedTasksCount: number;
  onComplete: (goalId: string) => void;
  onArchive: (goalId: string) => void;
  onReactivate: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onClick: (goal: Goal) => void;
}

export function GoalCard({ 
  goal, 
  linkedTasksCount, 
  completedTasksCount,
  onComplete, 
  onArchive, 
  onReactivate,
  onDelete,
  onClick 
}: GoalCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isCompleted = goal.status === 'Completed';
  const isArchived = goal.status === 'Archived';
  
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Personal': return 'badge-blue';
      case 'Financial': return 'badge-green';
      case 'Professional': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) return { class: 'badge-green', text: 'Completed' };
    if (isArchived) return { class: 'badge-gray', text: 'Archived' };
    return { class: 'badge-purple', text: 'Active' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div 
      className={`group rounded-xl p-5 transition-all duration-200 cursor-pointer ${
        isDark 
          ? `bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 ${isCompleted || isArchived ? 'opacity-60' : ''}`
          : `bg-white border border-slate-200 hover:shadow-md hover:border-slate-300 ${isCompleted || isArchived ? 'opacity-60 bg-slate-50' : ''}`
      }`}
      onClick={() => onClick(goal)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-violet-500/20' : 'bg-violet-100'
          }`}>
            <Target className={`w-6 h-6 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`font-semibold text-lg ${
              isCompleted || isArchived
                ? isDark ? 'text-gray-500' : 'text-slate-400'
                : isDark ? 'text-white' : 'text-slate-800'
            }`}>
              {goal.title}
            </h3>
            
            {/* Description */}
            {goal.description && (
              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {goal.description}
              </p>
            )}
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>Progress</span>
                <span className={`font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  {goal.progress}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    goal.progress === 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                      : 'bg-gradient-to-r from-violet-500 to-purple-500'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={`badge ${getCategoryBadge(goal.category)}`}>
                {goal.category}
              </span>
              <span className={`badge ${statusBadge.class}`}>
                {statusBadge.text}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {completedTasksCount}/{linkedTasksCount} tasks
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions & Arrow */}
        <div className="flex items-center space-x-2">
          {/* Action buttons - show on hover */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {goal.status === 'Active' && (
              <>
                <button
                  onClick={() => onComplete(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/20' 
                      : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                  }`}
                  title="Mark as complete"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => onArchive(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/20' 
                      : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title="Archive"
                >
                  <Archive size={18} />
                </button>
              </>
            )}
            {(goal.status === 'Completed' || goal.status === 'Archived') && (
              <button
                onClick={() => onReactivate(goal.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/20' 
                    : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
                }`}
                title="Reactivate"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20' 
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {/* Arrow */}
          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
        </div>
      </div>
    </div>
  );
}
