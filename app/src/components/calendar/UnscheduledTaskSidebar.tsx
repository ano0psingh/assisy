import { useMemo, useState, type DragEvent } from 'react';
import { CalendarPlus, Clock3, GripVertical } from 'lucide-react';
import type { Goal, Project, Task, TaskCategory } from '../../types';
import { getScheduledDate } from '../../lib/dateUtils';

interface UnscheduledTaskSidebarProps {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
}

type CategoryFilter = 'All' | TaskCategory;

function deadlineTime(task: Task): number {
  const time = task.dueDate ? new Date(task.dueDate).getTime() : Number.POSITIVE_INFINITY;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function UnscheduledTaskSidebar({
  tasks,
  goals,
  projects,
  onOpenTask,
}: UnscheduledTaskSidebarProps) {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [context, setContext] = useState('all');

  const contextOptions = useMemo(() => {
    const usedGoalIds = new Set(tasks.map((task) => task.goalId).filter(Boolean));
    const usedProjectNames = new Set(
      projects
        .filter((project) => tasks.some((task) => task.id.startsWith('pt-') && task.title.endsWith(`(${project.title})`)))
        .map((project) => project.title),
    );
    return [
      ...goals.filter((goal) => usedGoalIds.has(goal.id)).map((goal) => ({
        value: `goal:${goal.id}`,
        label: `Goal: ${goal.title}`,
      })),
      ...projects.filter((project) => usedProjectNames.has(project.title)).map((project) => ({
        value: `project:${project.title}`,
        label: `Project: ${project.title}`,
      })),
    ];
  }, [goals, projects, tasks]);

  const unscheduledTasks = useMemo(() => tasks
    .filter((task) => (
      task.status !== 'Completed'
      && !task.isRecurring
      && task.inbox !== true
      && !getScheduledDate(task)
      && !task.scheduledTime
    ))
    .filter((task) => category === 'All' || task.category === category)
    .filter((task) => {
      if (context === 'all') return true;
      if (context.startsWith('goal:')) return task.goalId === context.slice(5);
      if (context.startsWith('project:')) {
        return task.id.startsWith('pt-') && task.title.endsWith(`(${context.slice(8)})`);
      }
      return true;
    })
    .sort((a, b) => (
      deadlineTime(a) - deadlineTime(b)
      || Number(b.priority === 'High') - Number(a.priority === 'High')
      || a.title.localeCompare(b.title)
    )), [category, context, tasks]);

  const startDrag = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="border-y border-[var(--rule)] bg-[var(--surface)] p-4" aria-label="Backlog tasks">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Backlog</h2>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
          Tap Schedule. On desktop, you can also drag into the calendar.
        </p>
      </div>

      <div className={`mb-3 grid gap-2 ${contextOptions.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <label className="text-xs font-medium text-[var(--ink-secondary)]">
          Domain
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryFilter)}
            className="ui-field-control mt-1 min-h-10 w-full px-2 text-xs"
          >
            {(['All', 'Personal', 'Financial', 'Professional'] as const).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        {contextOptions.length > 0 && (
          <label className="text-xs font-medium text-[var(--ink-secondary)]">
            Context
            <select
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="ui-field-control mt-1 min-h-10 w-full px-2 text-xs"
            >
              <option value="all">All contexts</option>
              {contextOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {unscheduledTasks.length === 0 ? (
        <div className="border-t border-dashed border-[var(--rule)] px-3 py-6 text-center">
          <CalendarPlus className="mx-auto mb-2 h-5 w-5 text-[var(--ink-muted)]" />
          <p className="text-xs text-[var(--ink-muted)]">No matching Backlog tasks</p>
        </div>
      ) : (
        <ul className="max-h-72 divide-y divide-[var(--rule)] overflow-y-auto pr-1 lg:max-h-[36rem]">
          {unscheduledTasks.map((task) => (
            <li key={task.id}>
              <div
                draggable
                onDragStart={(event) => startDrag(event, task.id)}
                className="group py-3 hover:bg-[var(--state-hover)]"
              >
                <div className="flex items-start gap-2">
                  <GripVertical
                    aria-hidden="true"
                    className="mt-0.5 hidden h-4 w-4 shrink-0 cursor-grab text-[var(--ink-muted)] lg:block"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5 text-[var(--ink)]">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="border border-[var(--rule)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[var(--ink-secondary)]">
                        {task.category}
                      </span>
                      {task.priority === 'High' && (
                        <span className="border border-[var(--danger)] bg-[var(--danger-soft)] px-2 py-0.5 text-[var(--danger)]">
                          High
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[var(--warning)]">
                          <Clock3 className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="ui-control min-h-10 shrink-0 px-2 text-xs font-semibold text-[var(--action)] hover:bg-[var(--action-soft)]"
                    aria-label={`Schedule ${task.title}`}
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
