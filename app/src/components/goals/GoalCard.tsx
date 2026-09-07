import type { Goal } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Trash2, CheckCircle, Archive, RotateCcw, ChevronRight, Pencil, GitBranch, CalendarDays } from 'lucide-react';
import { SelectionCheckbox } from '../common/SelectionControls';
import { InlineGoalName } from './InlineGoalName';
import { formatGoalTargetDate, getMilestoneProgress, isGoalOverdue } from '../../lib/goalUtils';

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
  onRename: (goalId: string, title: string) => void;
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
  onRename,
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
  const overdue = isGoalOverdue(goal);
  const latestHealth = goal.healthCheckIns.at(-1);

  return (
    <div
      data-focus-id={goal.id}
      className={`group rounded-md p-6 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-[var(--selected)] border border-[var(--action)]'
          : isDark
            ? `bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-subtle)] hover:border-[var(--rule-strong)] ${isCompleted || isArchived ? 'opacity-60' : ''}`
            : `bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface)]  ${isCompleted || isArchived ? 'opacity-60' : ''}`
      }`}
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
            <div className={`flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center ${
              'bg-[var(--action-soft)] dark:shadow-[0_0_12px_rgba(139,92,246,0.15)]'
            }`}>
              <Target className={`w-6 h-6 text-[var(--action)]`} />
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
                  ? 'text-[var(--ink-muted)]'
                  : 'text-[var(--ink)]'
              }`}>
                <InlineGoalName
                  name={goal.title}
                  onSave={title => onRename(goal.id, title)}
                  onOpen={() => selectionMode ? onSelectToggle?.(goal.id) : onClick(goal)}
                />
              </h3>
              {subGoalsCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                  className={`px-3 py-1 rounded-sm flex items-center gap-2 text-xs font-semibold transition-all ${
                    'bg-[var(--action-soft)] text-[var(--action)] border border-[var(--action)] hover:bg-[var(--selected)]'
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
              <p className={`text-sm mt-1 line-clamp-2 text-[var(--ink-muted)]`}>
                {goal.description}
              </p>
            )}
            {(goal.targetDate || goal.nextAction) && (
              <div className="mt-2 space-y-1 text-xs text-[var(--ink-muted)]">
                {goal.targetDate && (
                  <p className={`flex items-center gap-1 ${overdue ? 'font-semibold text-[var(--danger)]' : ''}`} role={overdue ? 'alert' : undefined}>
                    <CalendarDays size={13} /> {overdue ? 'Overdue: ' : 'Target: '}{formatGoalTargetDate(goal.targetDate)}
                  </p>
                )}
                {goal.nextAction && <p><span className="font-medium">Next:</span> {goal.nextAction}</p>}
              </div>
            )}

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className={'text-[var(--ink-secondary)]'}>Progress</span>
                <span className={`font-medium text-[var(--action)]`}>
                  {progress}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden bg-black/[0.04]`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress === 100
                      ? 'bg-[var(--success)]'
                      : 'bg-[var(--action)]'
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
              <span className={`text-xs text-[var(--ink-muted)]`}>
                {completedTasksCount}/{linkedTasksCount} tasks
              </span>
              {goal.milestones.length > 0 && <span className="text-xs text-[var(--ink-muted)]">{getMilestoneProgress(goal)}% milestones</span>}
              <span className="text-xs text-[var(--ink-muted)]">{goal.priority} priority</span>
              {latestHealth && <span className="badge badge-gray">{latestHealth.status.replace('-', ' ')}</span>}
            </div>
          </div>
        </div>

        {/* Actions & Arrow — hidden while selecting */}
        <div className={`flex items-center space-x-2 ${selectionMode ? 'hidden' : ''}`}>
          {/* Action buttons - always visible */}
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(goal)}
              className={`p-2 rounded-sm transition-colors ${
                'text-[var(--ink-muted)] hover:text-[var(--action)] hover:bg-[var(--action-soft)]'
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
                  className={`p-2 rounded-sm transition-colors ${
                    'text-[var(--ink-muted)] hover:text-[var(--success)] hover:bg-[var(--success-soft)]'
                  }`}
                  title="Mark as complete"
                  aria-label="Mark as complete"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => onArchive(goal.id)}
                  className={`p-2 rounded-sm transition-colors ${
                    'text-[var(--ink-muted)] hover:text-[var(--warning)] hover:bg-[var(--warning-soft)]'
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
                className={`p-2 rounded-sm transition-colors ${
                  'text-[var(--ink-muted)] hover:text-[var(--action)] hover:bg-[var(--action-soft)]'
                }`}
                title="Reactivate"
                aria-label="Reactivate"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className={`p-2 rounded-sm transition-colors ${
                'text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]'
              }`}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Arrow */}
          <ChevronRight className={`w-5 h-5 text-[var(--ink-muted)]`} />
        </div>
      </div>
    </div>
  );
}
