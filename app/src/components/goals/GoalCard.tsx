import type { Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Trash2, CheckCircle, Archive, RotateCcw, ChevronRight, Pencil, GitBranch } from 'lucide-react';
import { SelectionCheckbox } from '../common/SelectionControls';

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
  /** When true the card selects instead of opening the goal. */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (goalId: string) => void;
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
  selectionMode = false,
  isSelected = false,
  onSelectToggle,
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
      data-focus-id={goal.id}
      className={`group rounded-2xl p-6 transition-all duration-200 ease-spring cursor-pointer active:scale-[0.985] backdrop-blur-xl ${
        isSelected
          ? 'bg-violet-50/60 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30'
          : isDark
            ? `bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.16] ${isCompleted || isArchived ? 'opacity-60' : ''}`
            : `bg-white/65 border border-white/70 hover:bg-white/80 hover:shadow-medium ${isCompleted || isArchived ? 'opacity-60' : ''}`
      }`}
      style={{ boxShadow: isDark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.2)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.7), 0 2px 12px rgba(0,0,0,0.04)' }}
      onClick={() => selectionMode ? onSelectToggle?.(goal.id) : onClick(goal)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {selectionMode ? (
            <SelectionCheckbox
              selected={isSelected}
              onToggle={() => onSelectToggle?.(goal.id)}
              label={`Select "${goal.title}"`}
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
            />
          ) : (
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              'bg-violet-100/80 dark:bg-violet-500/20 dark:shadow-[0_0_12px_rgba(139,92,246,0.15)]'
            }`}>
              <Target className={`w-6 h-6 text-violet-500 dark:text-violet-400`} />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Title with sub-goals badge */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* The card is clickable for pointers, but the title is the real
                  control, so the goal is reachable by keyboard. Making the
                  whole card a button would nest the actions inside it. */}
              <h3 className={`font-semibold text-lg ${
                isCompleted || isArchived
                  ? 'text-slate-400 dark:text-gray-500'
                  : 'text-slate-800 dark:text-white'
              }`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectionMode) onSelectToggle?.(goal.id);
                    else onClick(goal);
                  }}
                  className="text-left rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  {goal.title}
                </button>
              </h3>
              {subGoalsCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                  className={`px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${
                    'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 dark:bg-violet-500/25 dark:text-violet-300 dark:border-violet-500/40 dark:hover:bg-violet-500/35'
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
              <p className={`text-sm mt-1 line-clamp-2 text-slate-500 dark:text-gray-500`}>
                {goal.description}
              </p>
            )}
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className={'text-slate-600 dark:text-gray-400'}>Progress</span>
                <span className={`font-medium text-violet-600 dark:text-violet-400`}>
                  {progress}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden bg-black/[0.04] dark:bg-white/[0.08]`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress === 100 
                      ? 'bg-emerald-400' 
                      : 'bg-violet-500'
                  }`}
                  style={{ width: `${progress}%`, boxShadow: progress > 0 ? (progress === 100 ? '0 0 8px rgba(52,211,153,0.3)' : '0 0 8px rgba(139,92,246,0.25)') : 'none' }}
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
              <span className={`text-xs text-slate-500 dark:text-gray-500`}>
                {completedTasksCount}/{linkedTasksCount} tasks
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions & Arrow — hidden while selecting */}
        <div className={`flex items-center space-x-2 ${selectionMode ? 'hidden' : ''}`}>
          {/* Action buttons - always visible */}
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(goal)}
              className={`p-2 rounded-lg transition-colors ${
                'text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:text-gray-400 dark:hover:text-violet-400 dark:hover:bg-violet-500/20'
              }`}
              title="Edit"
              aria-label="Edit"
            >
              <Pencil size={18} />
            </button>
            {goal.status === 'Active' && (
              <>
                <button
                  onClick={() => onComplete(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/20'
                  }`}
                  title="Mark as complete"
                  aria-label="Mark as complete"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => onArchive(goal.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-400 dark:hover:bg-amber-500/20'
                  }`}
                  title="Archive"
                  aria-label="Archive"
                >
                  <Archive size={18} />
                </button>
              </>
            )}
            {(goal.status === 'Completed' || goal.status === 'Archived') && (
              <button
                onClick={() => onReactivate(goal.id)}
                className={`p-2 rounded-lg transition-colors ${
                  'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-500/20'
                }`}
                title="Reactivate"
                aria-label="Reactivate"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className={`p-2 rounded-lg transition-colors ${
                'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/20'
              }`}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {/* Arrow */}
          <ChevronRight className={`w-5 h-5 text-slate-400 dark:text-gray-400`} />
        </div>
      </div>
    </div>
  );
}
