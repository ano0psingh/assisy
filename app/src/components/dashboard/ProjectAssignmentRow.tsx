import { CalendarCheck, CalendarMinus, Check, Circle, Clock3, Pencil, Play } from 'lucide-react';
import type { ProjectTask, WorkItemStatus } from '../../types';

interface ProjectAssignmentRowProps {
  task: ProjectTask;
  projectName?: string;
  subProjectName?: string;
  onAdvanceStatus: (status: WorkItemStatus) => void;
  onEdit: () => void;
  onOpenProject: () => void;
  onRemoveFromToday: () => void;
  featured?: boolean;
}

function formatTime(time: string) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ProjectAssignmentRow({
  task,
  projectName,
  subProjectName,
  onAdvanceStatus,
  onEdit,
  onOpenProject,
  onRemoveFromToday,
  featured = false,
}: ProjectAssignmentRowProps) {
  const isDone = task.status === 'Done';
  const nextStatus: WorkItemStatus = task.status === 'Backlog'
    ? 'In Progress'
    : task.status === 'In Progress'
      ? 'Done'
      : 'Backlog';

  if (featured) {
    return (
      <article className="border-y-2 border-[var(--ink)] bg-[var(--surface-raised)] px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[var(--ink-muted)]">
              <button type="button" onClick={onOpenProject} className="text-[var(--action)] hover:underline">
                {projectName || 'Project'}{subProjectName ? ` / ${subProjectName}` : ''}
              </button>
              <span>{task.status}</span>
              {task.priority === 'High' && <span className="text-[var(--danger)]">Urgent</span>}
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="mt-3 max-w-3xl font-[var(--font-display)] text-left text-2xl font-bold leading-tight tracking-[-0.025em] text-[var(--ink)] hover:text-[var(--action)] sm:text-3xl"
            >
              {task.title}
            </button>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={15} className="text-[var(--action)]" />
                {task.scheduledTime ? formatTime(task.scheduledTime) : 'Any time today'}
                {task.durationMinutes ? ` · ${task.durationMinutes} min` : ''}
              </span>
              {task.deadline && (
                <span>Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAdvanceStatus(isDone ? 'Backlog' : 'Done')}
            className="inline-flex min-h-12 items-center gap-2 bg-[var(--action)] px-5 text-sm font-bold text-[var(--ink-inverse)] hover:brightness-95"
          >
            <Check size={17} strokeWidth={2.5} />
            {isDone ? 'Reopen' : 'Complete'}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--rule)] pt-3">
          <button type="button" onClick={onEdit} className="min-h-11 px-2 text-sm font-semibold text-[var(--action)] hover:underline">
            Edit assignment
          </button>
          <button type="button" onClick={onRemoveFromToday} className="min-h-11 px-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--action)]">
            Remove from Today
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className={`group border-b border-[var(--rule)] bg-[var(--surface-raised)] px-3 py-3 last:border-b-0 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAdvanceStatus(nextStatus)}
          aria-label={`${task.status === 'Done' ? 'Reopen' : 'Advance'} "${task.title}"`}
          title={`${task.status} — next: ${nextStatus}`}
          className="flex min-h-11 min-w-11 -m-3 items-center justify-center text-[var(--ink-muted)]"
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
            isDone
              ? 'border-[var(--success)] bg-[var(--success)] text-[var(--ink-inverse)]'
              : task.status === 'In Progress'
                ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                : 'border-[var(--rule-strong)]'
          }`}>
            {isDone ? <Check size={12} strokeWidth={3} /> : task.status === 'In Progress' ? <Play size={9} fill="currentColor" /> : <Circle size={9} />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEdit}
            className={`line-clamp-2 text-left text-sm font-semibold text-[var(--ink)] hover:text-[var(--action)] ${isDone ? 'line-through' : ''}`}
          >
            {task.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-muted)]">
            <button type="button" onClick={onOpenProject} className="font-medium text-[var(--action)] hover:underline">
              {projectName || 'Project'}{subProjectName ? ` / ${subProjectName}` : ''}
            </button>
            <span>{task.status}</span>
            {(task.scheduledTime || task.durationMinutes) && (
              <span className="inline-flex items-center gap-1 text-[var(--info)]">
                <Clock3 size={11} />
                {task.scheduledTime ? formatTime(task.scheduledTime) : 'Flexible'}
                {task.durationMinutes ? ` · ${task.durationMinutes}m` : ''}
              </span>
            )}
            {task.priority === 'High' && <span className="font-medium text-[var(--danger)]">Urgent</span>}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit "${task.title}"`}
            title="Edit assignment"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--action)]"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={onRemoveFromToday}
            aria-label={`Remove "${task.title}" from Today`}
            title="Remove from Today"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--action)] hover:bg-[var(--action-soft)]"
          >
            {task.scheduledDate ? <CalendarCheck size={16} /> : <CalendarMinus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}
