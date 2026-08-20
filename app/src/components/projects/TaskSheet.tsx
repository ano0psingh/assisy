import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Circle,
  Play,
  CheckCircle2,
  X,
  CalendarPlus,
  CalendarCheck,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import type { ProjectTask, WorkItemStatus } from '../../types';
import { getLocalDateString } from '../../lib/dateUtils';

type SortKey =
  | 'title'
  | 'status'
  | 'project'
  | 'subProject'
  | 'priority'
  | 'effort'
  | 'deadline'
  | 'timeSpent'
  | 'createdAt'
  | 'completedAt';

type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<WorkItemStatus, number> = {
  Backlog: 0,
  'In Progress': 1,
  Done: 2,
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function statusIcon(status: WorkItemStatus) {
  switch (status) {
    case 'Done':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'In Progress':
      return <Play size={10} fill="currentColor" className={'text-blue-500 dark:text-blue-400'} />;
    default:
      return <Circle size={14} className={'text-slate-400 dark:text-gray-400'} />;
  }
}

function fmtDate(d: Date | string | undefined | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmtTime(mins: number | undefined): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Multi-select dropdown component
function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear }: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', close);
      document.addEventListener('touchstart', close, { passive: true });
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const hasSelection = selected.size > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
          hasSelection
            ? 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/40'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/10'
        }`}
      >
        <Filter size={12} />
        {label}
        {hasSelection && <span className="ml-1">({selected.size})</span>}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-xl shadow-lg border py-1 animate-fade-in ${
          'bg-white border-slate-200 dark:bg-[#1a1a2e] dark:border-white/10'
        }`}>
          {options.map(opt => {
            const active = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                  active
                    ? 'bg-violet-500 border-violet-500'
                    : 'border-slate-300 dark:border-gray-600'
                }`}>
                  {active && <CheckCircle2 size={10} className="text-white" />}
                </div>
                {opt}
              </button>
            );
          })}
          {hasSelection && (
            <>
              <div className={`my-1 border-t border-slate-100 dark:border-white/10`} />
              <button
                type="button"
                onClick={() => { onClear(); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/5'
                }`}
              >
                <X size={12} /> Clear selection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskSheet() {
  const {
    projectTasks,
    projects,
    getProject,
    getSubProject,
    updateTaskStatus,
    addTaskToToday,
    removeTaskFromToday,
  } = useProjectContext();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<WorkItemStatus>>(new Set());
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSetItem = <T extends string>(setter: React.Dispatch<React.SetStateAction<Set<T>>>) => (val: T) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const enriched = useMemo(() => {
    return projectTasks.map(task => ({
      task,
      projectName: getProject(task.projectId)?.title ?? '',
      subProjectName: getSubProject(task.subProjectId)?.title ?? '',
    }));
  }, [projectTasks, getProject, getSubProject]);

  const filtered = useMemo(() => {
    return enriched.filter(({ task, projectName, subProjectName }) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !task.title.toLowerCase().includes(q) &&
          !projectName.toLowerCase().includes(q) &&
          !subProjectName.toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false;
      if (projectFilter && task.projectId !== projectFilter) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(task.priority)) return false;
      return true;
    });
  }, [enriched, search, statusFilter, projectFilter, priorityFilter]);

  const sorted = useMemo(() => {
    const mul = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title':
          cmp = a.task.title.localeCompare(b.task.title);
          break;
        case 'status':
          cmp = STATUS_ORDER[a.task.status] - STATUS_ORDER[b.task.status];
          break;
        case 'project':
          cmp = a.projectName.localeCompare(b.projectName);
          break;
        case 'subProject':
          cmp = a.subProjectName.localeCompare(b.subProjectName);
          break;
        case 'priority':
          cmp = PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
          break;
        case 'effort':
          cmp = PRIORITY_ORDER[a.task.effort] - PRIORITY_ORDER[b.task.effort];
          break;
        case 'deadline': {
          const ad = a.task.deadline ? new Date(a.task.deadline).getTime() : Infinity;
          const bd = b.task.deadline ? new Date(b.task.deadline).getTime() : Infinity;
          cmp = ad - bd;
          break;
        }
        case 'timeSpent':
          cmp = (a.task.timeSpent ?? 0) - (b.task.timeSpent ?? 0);
          break;
        case 'createdAt':
          cmp = new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
          break;
        case 'completedAt': {
          const ac = a.task.completedAt ? new Date(a.task.completedAt).getTime() : Infinity;
          const bc = b.task.completedAt ? new Date(b.task.completedAt).getTime() : Infinity;
          cmp = ac - bc;
          break;
        }
      }
      return cmp * mul;
    });
  }, [filtered, sortKey, sortDir]);

  const cycleStatus = (task: ProjectTask) => {
    const order: WorkItemStatus[] = ['Backlog', 'In Progress', 'Done'];
    const idx = order.indexOf(task.status);
    updateTaskStatus(task.id, order[(idx + 1) % order.length]);
  };

  const todayStr = getLocalDateString();

  const toggleToday = (task: ProjectTask) => {
    const isToday = task.isFocusedToday && task.focusedDate === todayStr;
    if (isToday) {
      removeTaskFromToday(task.id);
    } else {
      addTaskToToday(task.id);
    }
  };

  const hasActiveFilters = search || statusFilter.size > 0 || projectFilter || priorityFilter.size > 0;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(new Set());
    setProjectFilter('');
    setPriorityFilter(new Set());
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const thCls = `px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${
    'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'
  }`;

  const tdCls = `px-3 py-3 text-sm whitespace-nowrap text-slate-700 dark:text-gray-300`;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 flex-1 min-w-[180px] max-w-sm ${
          'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'
        }`}>
          <Search size={14} className={'text-slate-400 dark:text-gray-500'} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className={`bg-transparent outline-none text-sm flex-1 text-slate-800 placeholder-slate-400 dark:text-white dark:placeholder-gray-500`}
          />
        </div>

        <MultiSelect
          label="Status"
          options={['Backlog', 'In Progress', 'Done']}
          selected={statusFilter as Set<string>}
          onToggle={toggleSetItem(setStatusFilter) as (v: string) => void}
          onClear={() => setStatusFilter(new Set())}
        />

        <MultiSelect
          label="Priority"
          options={['High', 'Medium', 'Low']}
          selected={priorityFilter}
          onToggle={toggleSetItem(setPriorityFilter)}
          onClear={() => setPriorityFilter(new Set())}
        />

        {/* Project dropdown */}
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-xs font-medium outline-none ${
            'bg-white border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-300'
          }`}
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
            }`}
          >
            <X size={12} /> Clear all
          </button>
        )}

        <span className={`ml-auto text-xs tabular-nums text-slate-400 dark:text-gray-500`}>
          {sorted.length} task{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden border-slate-200 dark:border-white/10`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className={'bg-slate-50 dark:bg-white/[0.04]'}>
                {/* Today toggle header */}
                <th className={`${thCls} w-10 text-center`}>
                  <span title="Add to Today">📌</span>
                </th>
                <th className={`${thCls} sticky left-0 z-10 bg-slate-50 dark:bg-[#13131b]`} onClick={() => handleSort('title')}>
                  <span className="inline-flex items-center gap-1">Title <SortIcon col="title" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('status')}>
                  <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('project')}>
                  <span className="inline-flex items-center gap-1">Project <SortIcon col="project" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('subProject')}>
                  <span className="inline-flex items-center gap-1">Sub-project <SortIcon col="subProject" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('priority')}>
                  <span className="inline-flex items-center gap-1">Priority <SortIcon col="priority" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('effort')}>
                  <span className="inline-flex items-center gap-1">Effort <SortIcon col="effort" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('deadline')}>
                  <span className="inline-flex items-center gap-1">Deadline <SortIcon col="deadline" /></span>
                </th>
                <th className={thCls}>Tags</th>
                <th className={thCls} onClick={() => handleSort('timeSpent')}>
                  <span className="inline-flex items-center gap-1">Time <SortIcon col="timeSpent" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('createdAt')}>
                  <span className="inline-flex items-center gap-1">Created <SortIcon col="createdAt" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('completedAt')}>
                  <span className="inline-flex items-center gap-1">Completed <SortIcon col="completedAt" /></span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-white/5`}>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className={`px-4 py-12 text-center text-sm text-slate-400 dark:text-gray-500`}>
                    {hasActiveFilters ? 'No tasks match the current filters.' : 'No project tasks yet.'}
                  </td>
                </tr>
              ) : (
                sorted.map(({ task, projectName, subProjectName }) => {
                  const priorityColor =
                    task.priority === 'High'
                      ? 'text-red-600 dark:text-red-400'
                      : task.priority === 'Medium'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-gray-400';
                  const effortColor =
                    task.effort === 'High'
                      ? 'text-orange-600 dark:text-orange-400'
                      : task.effort === 'Medium'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-gray-400';

                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done';
                  const isToday = task.isFocusedToday && task.focusedDate === todayStr;

                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors ${
                        task.status === 'Done' ? 'opacity-60' : ''
                      } hover:bg-slate-50/80 dark:hover:bg-white/[0.03]`}
                    >
                      {/* Today toggle */}
                      <td className={`${tdCls} text-center`}>
                        <button
                          type="button"
                          onClick={() => toggleToday(task)}
                          className={`p-1 rounded-lg transition-colors ${
                            isToday
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                          }`}
                          title={isToday ? 'Remove from Today' : 'Add to Today'}
                        >
                          {isToday ? <CalendarCheck size={15} /> : <CalendarPlus size={15} />}
                        </button>
                      </td>

                      {/* Title — sticky */}
                      <td className={`${tdCls} sticky left-0 z-10 font-medium max-w-[260px] truncate ${
                        'bg-white dark:bg-[#111117]'
                      } ${task.status === 'Done' ? 'line-through' : ''}`}>
                        {task.title}
                      </td>

                      {/* Status */}
                      <td className={tdCls}>
                        <button
                          type="button"
                          onClick={() => cycleStatus(task)}
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            task.status === 'Done'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : task.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                          }`}
                        >
                          {statusIcon(task.status)}
                          {task.status}
                        </button>
                      </td>

                      {/* Project */}
                      <td className={`${tdCls} max-w-[140px] truncate`}>{projectName || '—'}</td>

                      {/* Sub-project */}
                      <td className={`${tdCls} max-w-[140px] truncate`}>{subProjectName || '—'}</td>

                      {/* Priority */}
                      <td className={`${tdCls} font-medium ${priorityColor}`}>{task.priority}</td>

                      {/* Effort */}
                      <td className={`${tdCls} ${effortColor}`}>{task.effort}</td>

                      {/* Deadline */}
                      <td className={`${tdCls} ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                        {fmtDate(task.deadline)}
                      </td>

                      {/* Tags */}
                      <td className={tdCls}>
                        {task.tags.length > 0 ? (
                          <div className="flex gap-1 max-w-[160px] overflow-hidden">
                            {task.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-gray-400'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {task.tags.length > 3 && (
                              <span className={`text-xs text-slate-400 dark:text-gray-500`}>
                                +{task.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={'text-slate-300 dark:text-gray-400'}>—</span>
                        )}
                      </td>

                      {/* Time Spent */}
                      <td className={tdCls}>{fmtTime(task.timeSpent)}</td>

                      {/* Created */}
                      <td className={tdCls}>{fmtDate(task.createdAt)}</td>

                      {/* Completed At */}
                      <td className={tdCls}>
                        {task.completedAt ? (
                          <span className={'text-emerald-600 dark:text-emerald-400'}>{fmtDate(task.completedAt)}</span>
                        ) : (
                          <span className={'text-slate-300 dark:text-gray-400'}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
