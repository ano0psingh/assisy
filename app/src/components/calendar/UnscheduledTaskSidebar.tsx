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
    <aside className="card rounded-2xl p-4" aria-label="Unscheduled tasks">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Unscheduled</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">
          Drag into the calendar or use Schedule.
        </p>
      </div>

      <div className={`mb-3 grid gap-2 ${contextOptions.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
          Domain
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryFilter)}
            className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-gray-200"
          >
            {(['All', 'Personal', 'Financial', 'Professional'] as const).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        {contextOptions.length > 0 && (
          <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Context
            <select
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-gray-200"
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
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center dark:border-white/10">
          <CalendarPlus className="mx-auto mb-2 h-5 w-5 text-slate-300 dark:text-gray-500" />
          <p className="text-xs text-slate-400 dark:text-gray-500">No matching clarified tasks</p>
        </div>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 lg:max-h-[36rem]">
          {unscheduledTasks.map((task) => (
            <li key={task.id}>
              <div
                draggable
                onDragStart={(event) => startDrag(event, task.id)}
                className="group rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50/50 dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-violet-500/30"
              >
                <div className="flex items-start gap-2">
                  <GripVertical
                    aria-hidden="true"
                    className="mt-0.5 hidden h-4 w-4 shrink-0 cursor-grab text-slate-300 lg:block dark:text-gray-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5 text-slate-700 dark:text-gray-200">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full bg-white px-2 py-0.5 text-slate-500 dark:bg-white/5 dark:text-gray-400">
                        {task.category}
                      </span>
                      {task.priority === 'High' && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          High
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Clock3 className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="min-h-10 shrink-0 rounded-lg px-2 text-xs font-semibold text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/15"
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
