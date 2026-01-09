import type { Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Trash2, CheckCircle, Archive, RotateCcw, ChevronRight, Pencil, GitBranch } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  progress: number;
  linkedTasksCount: number;
  completedTasksCount: number;
  subGoalsCount?: number;
  onComplete: (goalId: string) => void;
  onArchive: (goalId: string) => void;
  onReactivate: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onClick: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export function GoalCard({ 
  goal, 
  progress,
  linkedTasksCount, 
  completedTasksCount,
  subGoalsCount = 0,
  onComplete, 
  onArchive, 
  onReactivate,
  onDelete,
  onClick,
  onEdit,
  onToggleExpand,
  isExpanded,
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
            {/* Title with sub-goals badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={`font-semibold text-lg ${
                isCompleted || isArchived
                  ? isDark ? 'text-gray-500' : 'text-slate-400'
                  : isDark ? 'text-white' : 'text-slate-800'
              }`}>
                {goal.title}
              </h3>
              {subGoalsCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                    isDark 
                      ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40 hover:bg-violet-500/35' 
                      : 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200'
                  }`}
                >
                  <GitBranch size={14} />
                  <span>{subGoalsCount} sub-goal{subGoalsCount !== 1 ? 's' : ''}</span>
                  <ChevronRight size={12} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
            
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
                  {progress}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress === 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                      : 'bg-gradient-to-r from-violet-500 to-purple-500'
                  }`}
                  style={{ width: `${progress}%` }}
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
          {/* Action buttons - always visible */}
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(goal)}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/20' 
                  : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
              }`}
              title="Edit"
            >
              <Pencil size={18} />
            </button>
            {goal.status === 'Active' && (
              <>
                <button
                  onClick={() => onComplete(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20' 
                      : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title="Mark as complete"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => onArchive(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/20' 
                      : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
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
                    ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/20' 
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
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
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' 
                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
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
