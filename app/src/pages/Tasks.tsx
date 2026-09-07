import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useProjectContext } from '../context/ProjectContext';
import { useGamification } from '../context/GamificationContext';
import { useDataVersion } from '../context/DataVersionContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { ExpandableModal } from '../components/common/ExpandableModal';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { ClarifyTaskSheet, type ClarifyAction, type ClarifyTaskData } from '../components/tasks/ClarifyTaskSheet';
import { useUndo } from '../components/common/UndoToast';
import { useToast } from '../components/common/Toast';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkEditMenu, type BulkEditField } from '../components/common/BulkEditMenu';
import { GestureHint } from '../components/common/GestureHint';
import { SelectButton } from '../components/common/SelectionControls';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import { usePersistentSet, usePersistentState } from '../hooks/usePersistentState';
import { parseDateInput, pluralise } from '../lib/bulkUpdate';
import { hapticMedium } from '../lib/haptics';
import { addLocalDays, getLocalDateString, getScheduledDate } from '../lib/dateUtils';
import { isRecurrenceDate } from '../lib/recurrence';
import { useUnifiedTaskActions } from '../hooks/useUnifiedTaskActions';
import { Plus, ListFilter, LayoutList, FolderKanban, Target, ChevronDown, ChevronRight, Grid2X2, Flame, Zap, CalendarClock, Coffee, CheckCircle2, Search, X, Inbox } from 'lucide-react';
import type { Task, TaskCategory, Goal, RecurrencePattern, RecurrenceRule, ReminderOffsetMinutes } from '../types';
import { Button } from '../components/ui';

const TASK_BULK_FIELDS: BulkEditField[] = [
  {
    key: 'category',
    label: 'Category',
    kind: 'choice',
    options: [
      { label: 'Personal', value: 'Personal' },
      { label: 'Financial', value: 'Financial' },
      { label: 'Professional', value: 'Professional' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    kind: 'choice',
    options: [
      { label: 'High', value: 'High' },
      { label: 'Low', value: 'Low' },
    ],
  },
  {
    key: 'effort',
    label: 'Effort',
    kind: 'choice',
    options: [
      { label: 'High', value: 'High' },
      { label: 'Low', value: 'Low' },
    ],
  },
  { key: 'dueDate', label: 'Due date', kind: 'date' },
];

type FilterStatus = 'all' | 'pending' | 'completed';
type ViewMode = 'list' | 'grouped' | 'matrix';
type SmartFilter = 'none' | 'overdue' | 'due_today' | 'due_week' | 'high_priority' | 'quick_wins' | 'in_today' | 'recurring';
type TaskPageView = 'all' | 'inbox';

export function Tasks() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tasks, createTask, updateTask, updateTasks, revertTasks, completeTask, uncompleteTask, deleteTask, deleteTasks, restoreTasks, setTaskInbox, getTodaysTasks, skipOccurrence, pauseRecurring, resumeRecurring } = useTaskContext();
  const { schedule: scheduleTask, unschedule: unscheduleTask } = useUnifiedTaskActions();
  const addToToday = useCallback((taskId: string) => {
    scheduleTask(taskId, { date: getLocalDateString() });
  }, [scheduleTask]);
  const removeFromToday = unscheduleTask;
  const { goals, linkTaskToGoal, unlinkTaskFromGoal, addXPToGoal } = useGoalContext();
  const { projects, createProjectTask, getSubProjectsByProject } = useProjectContext();
  const { recordTaskCompletion, updateStreak, checkAndUnlockAchievements, recordTaskCreated } = useGamification();
  
  // Get tasks already in today to determine which show the "Add to Today" button
  const todaysTasks = getTodaysTasks();
  const todayTaskIds = new Set(todaysTasks.map(t => t.id));
  const scheduleTomorrow = useCallback((taskId: string) => {
    scheduleTask(taskId, { date: getLocalDateString(addLocalDays(new Date(), 1)) });
  }, [scheduleTask]);
  const { pushUndo } = useUndo();
  const { toast } = useToast();
  const { refresh } = useDataVersion();
  const onRefresh = useCallback(async () => { refresh(); }, [refresh]);
  const { pullDistance, isRefreshing: pullRefreshing, containerRef } = usePullToRefresh({ onRefresh });
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(() => {
    const shouldOpen = sessionStorage.getItem('assisy_open_task_form') === '1';
    if (shouldOpen) sessionStorage.removeItem('assisy_open_task_form');
    return shouldOpen;
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [clarifyingTask, setClarifyingTask] = useState<Task | null>(null);
  // Filters and view mode persist: losing them on every navigation (or stray
  // swipe between pages) was a constant tax on daily use.
  const [statusFilter, setStatusFilter] = usePersistentState<FilterStatus>('assisy_tasks_status', 'all');
  const [categoryFilter, setCategoryFilter] = usePersistentState<TaskCategory | 'all'>('assisy_tasks_category', 'all');
  const [smartFilter, setSmartFilter] = usePersistentState<SmartFilter>('assisy_tasks_smart', 'none');
  const [viewMode, setViewMode] = usePersistentState<ViewMode>('assisy_tasks_view', 'list');
  const pageView: TaskPageView = pathname === '/tasks/inbox' ? 'inbox' : 'all';
  const setPageView = useCallback((nextView: TaskPageView) => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    navigate({
      pathname: nextView === 'inbox' ? '/tasks/inbox' : '/tasks',
      search: next.toString(),
    });
  }, [navigate, searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGoals, setExpandedGoals] = usePersistentSet('assisy_tasks_expanded', ['unlinked']);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Move to Project modal state
  const [isMoveToProjectOpen, setIsMoveToProjectOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSubProjectId, setSelectedSubProjectId] = useState<string>('');

  useEffect(() => {
    const openFullTaskForm = () => {
      sessionStorage.removeItem('assisy_open_task_form');
      setEditingTask(null);
      setIsTaskFormOpen(true);
    };
    window.addEventListener('assisy:open-task-form', openFullTaskForm);
    return () => window.removeEventListener('assisy:open-task-form', openFullTaskForm);
  }, []);

  // Arriving from global search: clear the filters that could be hiding the
  // task we are about to scroll to, then let the hook find it.
  const handleSearchFocus = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSmartFilter('none');
    setPageView('all');
    setSearchQuery('');
    setIsCompletedExpanded(true);
  }, [setStatusFilter, setCategoryFilter, setSmartFilter, setPageView]);
  useFocusHighlight(handleSearchFocus);

  const goalMap = useMemo(() => {
    const m = new Map<string, string>();
    goals.forEach(g => m.set(g.id, g.title));
    return m;
  }, [goals]);

  // Get active projects for the move modal
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'Active'), 
    [projects]
  );

  // Get sub-projects for selected project
  const availableSubProjects = useMemo(() => 
    selectedProjectId ? getSubProjectsByProject(selectedProjectId) : [],
    [selectedProjectId, getSubProjectsByProject]
  );

  // Handle opening move to project modal
  const handleOpenMoveToProject = (task: Task) => {
    setTaskToMove(task);
    setSelectedProjectId('');
    setSelectedSubProjectId('');
    setIsMoveToProjectOpen(true);
  };

  // Handle moving task to project
  const handleMoveToProject = () => {
    if (!taskToMove || !selectedProjectId || !selectedSubProjectId) return;
    
    // Create new project task
    createProjectTask(
      selectedSubProjectId,
      taskToMove.title,
      taskToMove.description,
      taskToMove.priority === 'High' ? 'High' : 'Medium',
      taskToMove.effort === 'High' ? 'High' : 'Medium',
      undefined,
      taskToMove.dueDate
    );
    
    // Delete original task
    deleteTask(taskToMove.id);
    
    // Close modal
    setIsMoveToProjectOpen(false);
    setTaskToMove(null);
  };

  const todayStr = getLocalDateString();
  const nowDate = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const weekEnd = (() => { const d = new Date(nowDate); d.setDate(d.getDate() + 7); return d; })();

  const normalisedQuery = searchQuery.trim().toLowerCase();
  const inboxCount = tasks.filter(task => task.inbox === true && task.status !== 'Completed').length;
  const inventoryCount = tasks.filter(task => task.inbox !== true).length;

  const filteredTasks = tasks
    .filter(task => pageView === 'inbox'
      ? task.inbox === true && task.status !== 'Completed'
      : task.inbox !== true)
    .filter(task => {
      if (!normalisedQuery) return true;
      return (
        task.title.toLowerCase().includes(normalisedQuery) ||
        (task.description?.toLowerCase().includes(normalisedQuery) ?? false)
      );
    })
    .filter(task => {
      if (pageView === 'inbox') return true;
      if (statusFilter === 'pending') {
        if (task.status === 'Completed') return false;
        if (task.isRecurring) {
          return isRecurrenceDate(todayStr, task);
        }
        return true;
      }
      if (statusFilter === 'completed') return task.status === 'Completed';
      return true;
    })
    .filter(task => {
      if (categoryFilter === 'all') return true;
      return task.category === categoryFilter;
    })
    .filter(task => {
      if (pageView === 'inbox') return true;
      if (smartFilter === 'none') return true;
      switch (smartFilter) {
        case 'overdue': {
          if (task.status === 'Completed' || !task.dueDate) return false;
          const due = new Date(task.dueDate); due.setHours(0,0,0,0);
          return due < nowDate;
        }
        case 'due_today': {
          if (task.status === 'Completed' || !task.dueDate) return false;
          const due = new Date(task.dueDate); due.setHours(0,0,0,0);
          return due.getTime() === nowDate.getTime();
        }
        case 'due_week': {
          if (task.status === 'Completed' || !task.dueDate) return false;
          const due = new Date(task.dueDate); due.setHours(0,0,0,0);
          return due >= nowDate && due <= weekEnd;
        }
        case 'high_priority': return task.priority === 'High';
        case 'quick_wins': return task.priority === 'High' && task.effort === 'Low';
        case 'in_today': return getScheduledDate(task) === todayStr;
        case 'recurring': return task.isRecurring;
        default: return true;
      }
    })
    .sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const priorityOrder = { High: 0, Low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const effortOrder = { High: 0, Low: 1 };
      return effortOrder[a.effort] - effortOrder[b.effort];
    });

  const visibleTaskIds = useMemo(() => filteredTasks.map(t => t.id), [filteredTasks]);
  const selection = useBulkSelection(visibleTaskIds);

  const selectionProps = (taskId: string) => ({
    selectionMode: selection.active,
    isSelected: selection.isSelected(taskId),
    onSelectToggle: selection.toggle,
  });

  const handleBulkDelete = () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    const removed = deleteTasks(ids);
    selection.clear();
    pushUndo(
      `${pluralise(removed.length, 'task')} deleted`,
      () => restoreTasks(removed),
    );
  };

  const handleBulkEdit = (key: string, value: string | number | null) => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;

    const updates: Partial<Task> =
      key === 'dueDate'
        ? { dueDate: value === null ? undefined : parseDateInput(String(value)) }
        : ({ [key]: value } as Partial<Task>);

    const patches = updateTasks(ids, updates);
    if (patches.length === 0) return;
    // The selection stays so several fields can be applied in a row. Rows that
    // the edit filters out of view drop out of it on their own.
    pushUndo(
      `${pluralise(patches.length, 'task')} updated`,
      () => revertTasks(patches),
    );
  };

  // Group tasks by goal - with hierarchical structure for sub-goals
  const tasksGroupedByGoal = useMemo(() => {
    interface GoalGroup {
      goal: Goal | null;
      tasks: Task[];
      subGoalGroups: { goal: Goal; tasks: Task[] }[];
    }
    
    const groups: GoalGroup[] = [];
    const goalTaskMap = new Map<string, Task[]>();
    const unlinkedTasks: Task[] = [];

    // Create a set of valid goal IDs for quick lookup
    const validGoalIds = new Set(goals.map(g => g.id));

    // First, map all tasks to their goals
    // Tasks with goalId pointing to non-existent goals are treated as unlinked
    filteredTasks.forEach(task => {
      if (task.goalId && validGoalIds.has(task.goalId)) {
        const existing = goalTaskMap.get(task.goalId) || [];
        existing.push(task);
        goalTaskMap.set(task.goalId, existing);
      } else {
        // Task has no goalId OR goalId points to deleted goal
        unlinkedTasks.push(task);
      }
    });

    // Get top-level goals (no parent) that have tasks or have sub-goals with tasks
    const topLevelGoals = goals.filter(g => !g.parentGoalId);
    const subGoals = goals.filter(g => g.parentGoalId);

    topLevelGoals
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach(parentGoal => {
        const parentTasks = goalTaskMap.get(parentGoal.id) || [];
        const childGoals = subGoals.filter(sg => sg.parentGoalId === parentGoal.id);
        
        // Get sub-goal groups that have tasks
        const subGoalGroups = childGoals
          .filter(sg => goalTaskMap.has(sg.id))
          .map(sg => ({
            goal: sg,
            tasks: goalTaskMap.get(sg.id) || []
          }));
        
        // Only add if parent has tasks or sub-goals have tasks
        if (parentTasks.length > 0 || subGoalGroups.length > 0) {
          groups.push({
            goal: parentGoal,
            tasks: parentTasks,
            subGoalGroups
          });
        }
      });

    // Add sub-goals that don't have a parent in our list (orphaned sub-goals with valid parent reference)
    subGoals
      .filter(sg => {
        const parent = goals.find(g => g.id === sg.parentGoalId);
        return !parent && goalTaskMap.has(sg.id);
      })
      .forEach(sg => {
        groups.push({
          goal: sg,
          tasks: goalTaskMap.get(sg.id) || [],
          subGoalGroups: []
        });
      });

    // Add unlinked tasks at the end (includes tasks with deleted goals)
    if (unlinkedTasks.length > 0) {
      groups.push({ goal: null, tasks: unlinkedTasks, subGoalGroups: [] });
    }

    return groups;
  }, [filteredTasks, goals]);

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const handleCreateTask = (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceRule?: RecurrenceRule;
    specificDays?: number[];
    monthDay?: number;
    goalId?: string;
    dueDate?: Date;
    dueTime?: string;
    dueReminderOffsets?: ReminderOffsetMinutes[];
  }) => {
    const newTask = createTask(data.title, data.description, data.category, data.priority, data.effort, data.isRecurring, data.recurrencePattern, data.specificDays, data.goalId, data.dueDate, data.monthDay, data.dueTime, {
      recurrenceRule: data.recurrenceRule,
      dueReminderOffsets: data.dueReminderOffsets,
    });
    
    if (data.goalId) {
      linkTaskToGoal(data.goalId, newTask.id);
    }
    
    // Record task creation for gamification
    recordTaskCreated();
    setTimeout(() => checkAndUnlockAchievements(), 100);
    
    setIsTaskFormOpen(false);
  };

  const handleUpdateTask = (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceRule?: RecurrenceRule;
    specificDays?: number[];
    monthDay?: number;
    goalId?: string;
    dueDate?: Date;
    dueTime?: string;
    dueReminderOffsets?: ReminderOffsetMinutes[];
  }) => {
    if (!editingTask) return;

    const oldGoalId = editingTask.goalId;
    const newGoalId = data.goalId;

    if (oldGoalId && oldGoalId !== newGoalId) {
      unlinkTaskFromGoal(oldGoalId, editingTask.id);
    }

    if (newGoalId && newGoalId !== oldGoalId) {
      linkTaskToGoal(newGoalId, editingTask.id);
    }

    updateTask(editingTask.id, {
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      effort: data.effort,
      isRecurring: data.isRecurring,
      recurrencePattern: data.recurrencePattern,
      recurrenceRule: data.recurrenceRule,
      specificDays: data.specificDays,
      monthDay: data.monthDay,
      goalId: data.goalId,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      dueReminderOffsets: data.dueReminderOffsets,
    });
    
    setEditingTask(null);
    setIsTaskFormOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleClarify = (task: Task) => {
    setClarifyingTask(task);
  };

  const handleClarifySubmit = (action: ClarifyAction, data: ClarifyTaskData) => {
    if (!clarifyingTask) return;
    const oldGoalId = clarifyingTask.goalId;
    if (oldGoalId && oldGoalId !== data.goalId) unlinkTaskFromGoal(oldGoalId, clarifyingTask.id);
    if (data.goalId && data.goalId !== oldGoalId) linkTaskToGoal(data.goalId, clarifyingTask.id);

    updateTask(clarifyingTask.id, {
      title: data.title,
      category: data.category,
      priority: data.priority,
      effort: data.effort,
      goalId: data.goalId,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      durationMinutes: data.durationMinutes,
    });

    if (action === 'today') {
      scheduleTask(clarifyingTask.id, {
        date: getLocalDateString(),
        durationMinutes: data.durationMinutes,
      });
    } else if (action === 'schedule' && data.scheduledDate) {
      scheduleTask(clarifyingTask.id, {
        date: data.scheduledDate,
        time: data.scheduledTime,
        durationMinutes: data.durationMinutes,
      });
    } else {
      unscheduleTask(clarifyingTask.id);
      setTaskInbox(clarifyingTask.id, action === 'keep');
    }
    setClarifyingTask(null);
  };

  const handleCloseForm = () => {
    setEditingTask(null);
    setIsTaskFormOpen(false);
  };

  const handleDeleteWithUndo = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    deleteTask(taskId);
    pushUndo(`"${task.title}" deleted`, () => {
      createTask(task.title, task.description, task.category, task.priority, task.effort, task.isRecurring, task.recurrencePattern, task.specificDays, task.goalId, task.dueDate, task.monthDay, task.dueTime, {
        inbox: task.inbox,
        scheduledDate: task.scheduledDate,
        scheduledTime: task.scheduledTime,
        durationMinutes: task.durationMinutes,
        recurrenceRule: task.recurrenceRule,
      });
    });
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
    } else {
      hapticMedium();
      completeTask(taskId);
      if (task) {
        recordTaskCompletion(task.category, task.xpValue);
        updateStreak();
        if (task.goalId && !task.isRecurring) {
          addXPToGoal(task.goalId, task.xpValue || 10);
        }
        if (task.xpValue > 0 && task.category !== 'Professional') {
          toast({ message: `Task done! +${task.xpValue} XP`, type: 'success', duration: 2000 });
        }
        setTimeout(() => checkAndUnlockAchievements(), 100);
      }
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 [&_[aria-haspopup=true]]:!opacity-100">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />
      <header className="flex items-start justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">
            {pageView === 'inbox' ? 'Inbox desk' : 'Task desk'}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {pageView === 'inbox'
              ? `${inboxCount} ${inboxCount === 1 ? 'lead' : 'leads'} awaiting a decision`
              : `${inventoryCount} clarified ${inventoryCount === 1 ? 'assignment' : 'assignments'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SelectButton
            active={selection.active}
            onClick={() => selection.active ? selection.clear() : selection.start()}
            disabled={filteredTasks.length === 0}
          />
          <Button variant="primary" icon={Plus} onClick={() => setIsTaskFormOpen(true)}>Add task</Button>
        </div>
      </header>

      <div className="ui-page-tabs flex" role="tablist" aria-label="Task views">
        <button
          type="button"
          role="tab"
          aria-selected={pageView === 'all'}
          onClick={() => setPageView('all')}
          className="ui-page-tab flex flex-1 items-center justify-center gap-2 px-4 text-sm font-medium"
        >
          <LayoutList size={16} />
          Tasks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageView === 'inbox'}
          onClick={() => setPageView('inbox')}
          className="ui-page-tab flex flex-1 items-center justify-center gap-2 px-4 text-sm font-medium"
        >
          <Inbox size={16} />
          Inbox
          {inboxCount > 0 && (
            <span className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--ink-inverse)]">{inboxCount}</span>
          )}
        </button>
      </div>

      {/* Search — the page had only structured filters, so finding a known
          task among hundreds meant scrolling. */}
      <div className="relative border-b border-[var(--rule)] pb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-6 -translate-y-1/2 text-[var(--ink-muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tasks by title or description"
          aria-label="Search tasks"
          className="ui-field-control w-full py-3 pl-9 pr-10 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-6 -translate-y-1/2 rounded-[var(--radius-md)] p-2 text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter and layout controls do not apply to the clarification queue. */}
      {pageView === 'all' && (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            aria-controls="task-filter-panel"
            className={`ui-control flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
              filtersOpen || statusFilter !== 'all' || categoryFilter !== 'all' || smartFilter !== 'none'
                ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                : 'border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
            }`}
          >
            <ListFilter size={15} />
            <span>Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all' || smartFilter !== 'none') && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--action)] text-xs text-[var(--ink-inverse)]">
                {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (smartFilter !== 'none' ? 1 : 0)}
              </span>
            )}
          </button>
          {(statusFilter !== 'all' || categoryFilter !== 'all' || smartFilter !== 'none') && (
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSmartFilter('none'); }}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
            >
              Clear
            </button>
          )}
        </div>
        <span className="text-xs tabular-nums text-[var(--ink-muted)]">{filteredTasks.length} shown</span>
      </div>
      )}
      {pageView === 'all' && filtersOpen && (
        <div id="task-filter-panel" className="space-y-4 border-y border-[var(--rule)] bg-[var(--surface-subtle)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ink-muted)]">Status</span>
              <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)]">
                {(['all', 'pending', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium capitalize transition-all ${
                      statusFilter === status
                        ? 'bg-[var(--action-soft)] text-[var(--action)]'
                        : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ink-muted)]">Category</span>
              <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)]">
                {(['all', 'Personal', 'Financial', 'Professional'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs font-medium transition-all ${
                      categoryFilter === cat
                        ? 'bg-[var(--action-soft)] text-[var(--action)]'
                        : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--ink-muted)]">Smart filter</span>
            {([
              { id: 'none' as const, label: 'All' },
              { id: 'overdue' as const, label: 'Overdue' },
              { id: 'due_today' as const, label: 'Due Today' },
              { id: 'due_week' as const, label: 'Due This Week' },
              { id: 'high_priority' as const, label: 'High Priority' },
              { id: 'quick_wins' as const, label: 'Quick Wins' },
              { id: 'in_today' as const, label: "In Today's Plan" },
              { id: 'recurring' as const, label: 'Recurring' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSmartFilter(id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  smartFilter === id
                    ? id === 'overdue'
                      ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                      : 'bg-[var(--action-soft)] text-[var(--action)]'
                    : 'bg-[var(--surface)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--rule)] pt-3">
            <span className="text-xs font-medium text-[var(--ink-secondary)]">Layout</span>
            {([
              { mode: 'list' as const, icon: LayoutList, label: 'List' },
              { mode: 'grouped' as const, icon: FolderKanban, label: 'By goal' },
              { mode: 'matrix' as const, icon: Grid2X2, label: 'Matrix' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`ui-control flex items-center gap-1 border px-3 py-2 text-xs font-medium ${
                  viewMode === mode
                    ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                    : 'border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredTasks.length > 0 && (
        <GestureHint id="task_swipe">
          Swipe a task right to complete it, or left to delete it.
        </GestureHint>
      )}

      {filteredTasks.length === 0 ? (
        pageView === 'inbox' && !normalisedQuery ? (
          <div className="border-y border-[var(--rule)] bg-[var(--surface-subtle)] py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-[var(--success)]" />
            <p className="font-medium text-[var(--ink)]">Inbox is clear</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              New quick captures will wait here until you clarify them.
            </p>
            <button
              type="button"
              onClick={() => setPageView('all')}
              className="mt-4 text-sm font-medium text-[var(--action)] hover:underline"
            >
              View all tasks
            </button>
          </div>
        ) : inventoryCount === 0 && pageView === 'all' ? (
          /* Genuinely no data — offer to create, not to clear filters that
             were never set. */
          <div className="border-y border-[var(--rule)] bg-[var(--surface-subtle)] py-12 text-center">
            <LayoutList className="mx-auto mb-4 h-8 w-8 text-[var(--ink-muted)]" />
            <p className="font-medium text-[var(--ink)]">No clarified tasks yet</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Capture a task, then move it from Inbox to Backlog, Today, or a Calendar block.
            </p>
            <button onClick={() => setIsTaskFormOpen(true)} className="mt-4 text-sm font-medium text-[var(--action)] hover:underline">
              Create a task
            </button>
          </div>
        ) : (
          <div className="border-y border-[var(--rule)] bg-[var(--surface-subtle)] py-12 text-center">
            <ListFilter className="mx-auto mb-4 h-8 w-8 text-[var(--ink-muted)]" />
            <p className="text-[var(--ink-muted)]">
              {normalisedQuery
                ? `No tasks match "${searchQuery.trim()}".`
                : 'No tasks found matching your filters.'}
            </p>
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSmartFilter('none'); setSearchQuery(''); }}
              className="mt-3 text-sm font-medium text-[var(--action)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )
      ) : pageView === 'inbox' ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} data-focus-id={task.id} className="space-y-2">
              <TaskCard
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteWithUndo}
                onEdit={handleClarify}
                onMoveToProject={handleOpenMoveToProject}
                goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                {...selectionProps(task.id)}
              />
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        /* List View - Separate pending and completed */
        (() => {
          const pendingTasks = filteredTasks.filter(t => t.status !== 'Completed');
          const completedTasks = filteredTasks.filter(t => t.status === 'Completed');
          
          return (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 ? (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div key={task.id}>
                      <TaskCard
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDeleteWithUndo}
                        onEdit={handleEdit}
                        onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                        onScheduleTomorrow={scheduleTomorrow}
                        onRemoveFromToday={removeFromToday}
                        onMoveToProject={handleOpenMoveToProject}
                        showTodayActions={!todayTaskIds.has(task.id)}
                        goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                        onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined}
                        onPauseRecurring={task.isRecurring ? pauseRecurring : undefined}
                        onResumeRecurring={task.isRecurring ? resumeRecurring : undefined}
                        {...selectionProps(task.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : completedTasks.length > 0 ? (
                <div className="border-y border-[var(--rule)] py-8 text-center text-[var(--ink-muted)]">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[var(--success)]" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No pending tasks</p>
                </div>
              ) : null}
              
              {/* Completed Tasks - Collapsible */}
              {completedTasks.length > 0 && (
                <section className="overflow-hidden border-y border-[var(--rule)] bg-[var(--surface)]">
                  <button
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    className="flex w-full items-center justify-between p-4 transition-colors hover:bg-[var(--state-hover)]"
                  >
                    <div className="flex items-center space-x-3">
                      {isCompletedExpanded ? (
                        <ChevronDown className="h-5 w-5 text-[var(--success)]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[var(--success)]" />
                      )}
                      <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                      <div className="text-left">
                        <h3 className="font-semibold text-[var(--ink)]">
                          Completed Tasks
                        </h3>
                        <p className="text-sm text-[var(--ink-muted)]">
                          {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} done
                        </p>
                      </div>
                    </div>
                    <span className="border border-[var(--success)] bg-[var(--success-soft)] px-3 py-1 text-xs font-medium text-[var(--success)]">
                      {isCompletedExpanded ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  
                  {isCompletedExpanded && (
                    <div className="space-y-2 border-t border-[var(--rule)] p-4 pt-0">
                      <div className="pt-3 space-y-2">
                        {completedTasks.map((task) => (
                          <div key={task.id}>
                            <TaskCard 
                              task={task} 
                              onToggleComplete={handleToggleComplete} 
                              onDelete={handleDeleteWithUndo}
                              onEdit={handleEdit}
                              goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                              {...selectionProps(task.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          );
        })()
      ) : viewMode === 'matrix' ? (
        /* 2x2 Priority/Effort Matrix View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quadrant 1: High Priority, High Effort - DO FIRST (Important & Hard) */}
          <section className="overflow-hidden border border-[var(--danger)] bg-[var(--surface)]">
            <div className="border-b border-[var(--danger)] bg-[var(--danger-soft)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className="h-4 w-4 text-[var(--danger)]" />
                  <h3 className="font-semibold text-[var(--danger)]">Do First</h3>
                </div>
                <span className="text-xs text-[var(--danger)]">High Priority • High Effort</span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-secondary)]">Critical tasks that need focus time</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'High' && t.effort === 'High').length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'High' && t.effort === 'High').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onScheduleTomorrow={scheduleTomorrow} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} {...selectionProps(task.id)} />
                ))
              )}
            </div>
          </section>

          {/* Quadrant 2: High Priority, Low Effort - QUICK WINS */}
          <section className="overflow-hidden border border-[var(--success)] bg-[var(--surface)]">
            <div className="border-b border-[var(--success)] bg-[var(--success-soft)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-[var(--success)]" />
                  <h3 className="font-semibold text-[var(--success)]">Quick Wins</h3>
                </div>
                <span className="text-xs text-[var(--success)]">High Priority • Low Effort</span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-secondary)]">Do these first for momentum</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'High' && t.effort === 'Low').length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'High' && t.effort === 'Low').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onScheduleTomorrow={scheduleTomorrow} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} {...selectionProps(task.id)} />
                ))
              )}
            </div>
          </section>

          {/* Quadrant 3: Low Priority, High Effort - SCHEDULE */}
          <section className="overflow-hidden border border-[var(--warning)] bg-[var(--surface)]">
            <div className="border-b border-[var(--warning)] bg-[var(--warning-soft)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarClock className="h-4 w-4 text-[var(--warning)]" />
                  <h3 className="font-semibold text-[var(--warning)]">Schedule</h3>
                </div>
                <span className="text-xs text-[var(--warning)]">Low Priority • High Effort</span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-secondary)]">Plan dedicated time for these</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'High').length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'High').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onScheduleTomorrow={scheduleTomorrow} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} {...selectionProps(task.id)} />
                ))
              )}
            </div>
          </section>

          {/* Quadrant 4: Low Priority, Low Effort - FILL TIME */}
          <section className="overflow-hidden border border-[var(--info)] bg-[var(--surface)]">
            <div className="border-b border-[var(--info)] bg-[var(--info-soft)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-4 w-4 text-[var(--info)]" />
                  <h3 className="font-semibold text-[var(--info)]">Fill Time</h3>
                </div>
                <span className="text-xs text-[var(--info)]">Low Priority • Low Effort</span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-secondary)]">Do when you have spare moments</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'Low').length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'Low').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onScheduleTomorrow={scheduleTomorrow} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} {...selectionProps(task.id)} />
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Grouped by Goal View */
        <div className="space-y-4">
          {tasksGroupedByGoal.map((group) => {
            const goalId = group.goal?.id || 'unlinked';
            const isExpanded = expandedGoals.has(goalId);
            
            // Calculate totals including sub-goal tasks
            const parentTasksCompleted = group.tasks.filter(t => t.status === 'Completed').length;
            const parentTasksTotal = group.tasks.length;
            const subGoalTasksCompleted = group.subGoalGroups.reduce((sum, sg) => 
              sum + sg.tasks.filter(t => t.status === 'Completed').length, 0);
            const subGoalTasksTotal = group.subGoalGroups.reduce((sum, sg) => sum + sg.tasks.length, 0);
            const totalCompleted = parentTasksCompleted + subGoalTasksCompleted;
            const totalTasks = parentTasksTotal + subGoalTasksTotal;
            const hasSubGoals = group.subGoalGroups.length > 0;
            
            return (
              <section key={goalId} className="overflow-hidden border-y border-[var(--rule)] bg-[var(--surface)]">
                {/* Goal Header */}
                <button
                  onClick={() => toggleGoalExpanded(goalId)}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-[var(--state-hover)]"
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-[var(--ink-muted)]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-[var(--ink-muted)]" />
                    )}
                    <Target className={`h-5 w-5 ${group.goal ? 'text-[var(--action)]' : 'text-[var(--ink-muted)]'}`} />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--ink)]">
                          {group.goal?.title || 'Unlinked Tasks'}
                        </h3>
                        {/* Sub-goals badge - more visible */}
                        {hasSubGoals && (
                          <span className="flex items-center gap-2 border border-[var(--action)] bg-[var(--action-soft)] px-2 py-1 text-xs font-semibold text-[var(--action)]">
                            <Target size={12} />
                            {group.subGoalGroups.length} sub-goal{group.subGoalGroups.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--ink-muted)]">
                        {totalCompleted}/{totalTasks} tasks completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Progress indicator */}
                    {group.goal && (
                      <div className="flex items-center space-x-2">
                        <div className="h-1.5 w-24 overflow-hidden bg-[var(--surface-inset)]">
                          <div 
                            className="h-full bg-[var(--action)] transition-all"
                            style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[var(--action)]">
                          {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%
                        </span>
                      </div>
                    )}
                    {group.goal && (
                      <span className={`badge ${
                        group.goal.category === 'Personal' ? 'badge-blue' :
                        group.goal.category === 'Financial' ? 'badge-green' : 'badge-gray'
                      }`}>
                        {group.goal.category}
                      </span>
                    )}
                  </div>
                </button>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-[var(--rule)]">
                    {/* Parent Goal's Direct Tasks */}
                    {group.tasks.length > 0 && (
                      <div className="p-3 space-y-2">
                        {hasSubGoals && (
                          <p className="px-2 py-1 text-xs font-medium text-[var(--ink-muted)]">
                            Direct tasks ({group.tasks.length})
                          </p>
                        )}
                        {group.tasks.map((task) => (
                          <div key={task.id}>
                            <TaskCard 
                              task={task} 
                              onToggleComplete={handleToggleComplete} 
                              onDelete={handleDeleteWithUndo}
                              onEdit={handleEdit}
                              onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                              onScheduleTomorrow={scheduleTomorrow}
                              onRemoveFromToday={removeFromToday}
                              onMoveToProject={handleOpenMoveToProject}
                              showTodayActions={!todayTaskIds.has(task.id)}
                              goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                              {...selectionProps(task.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Sub-goal Tasks */}
                    {group.subGoalGroups.map((subGroup) => {
                      const subGoalId = subGroup.goal.id;
                      const isSubExpanded = expandedGoals.has(subGoalId);
                      const subCompleted = subGroup.tasks.filter(t => t.status === 'Completed').length;
                      const subTotal = subGroup.tasks.length;
                      
                      return (
                        <div 
                          key={subGoalId}
                          className="border-t border-[var(--rule)]"
                        >
                          {/* Sub-goal Header */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGoalExpanded(subGoalId); }}
                            className="flex w-full items-center justify-between bg-[var(--surface-subtle)] px-4 py-3 transition-colors hover:bg-[var(--state-hover)]"
                          >
                            <div className="flex items-center space-x-3 pl-6">
                              {isSubExpanded ? (
                                <ChevronDown className="h-4 w-4 text-[var(--ink-muted)]" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-[var(--ink-muted)]" />
                              )}
                              <Target className="h-4 w-4 text-[var(--action)]" />
                              <div className="text-left">
                                <h4 className="text-sm font-medium text-[var(--ink)]">
                                  {subGroup.goal.title}
                                </h4>
                                <p className="text-xs text-[var(--ink-muted)]">
                                  {subCompleted}/{subTotal} tasks
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="h-1.5 w-16 overflow-hidden bg-[var(--surface-inset)]">
                                <div 
                                  className="h-full bg-[var(--action)] transition-all"
                                  style={{ width: `${subTotal > 0 ? (subCompleted / subTotal) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-[var(--ink-muted)]">
                                {subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0}%
                              </span>
                            </div>
                          </button>
                          
                          {/* Sub-goal Tasks */}
                          {isSubExpanded && (
                            <div className="space-y-2 bg-[var(--surface-subtle)] px-4 py-2 pl-16">
                              {subGroup.tasks.map((task) => (
                                <div key={task.id}>
                                  <TaskCard 
                                    task={task} 
                                    onToggleComplete={handleToggleComplete} 
                                    onDelete={handleDeleteWithUndo}
                                    onEdit={handleEdit}
                                    onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                                    onScheduleTomorrow={scheduleTomorrow}
                                    onRemoveFromToday={removeFromToday}
                                    onMoveToProject={handleOpenMoveToProject}
                                    goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                                    showTodayActions={!todayTaskIds.has(task.id)}
                                    {...selectionProps(task.id)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <TaskForm 
        isOpen={isTaskFormOpen} 
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask} 
        onCancel={handleCloseForm} 
        goals={goals}
        editingTask={editingTask}
      />

      {clarifyingTask && (
        <ClarifyTaskSheet
          key={clarifyingTask.id}
          task={clarifyingTask}
          goals={goals}
          onClose={() => setClarifyingTask(null)}
          onSubmit={handleClarifySubmit}
        />
      )}

      <ExpandableModal
        isOpen={isMoveToProjectOpen && Boolean(taskToMove)}
        onClose={() => setIsMoveToProjectOpen(false)}
        title="Move to Project"
        icon={<FolderKanban className="h-5 w-5 text-[var(--action)]" />}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsMoveToProjectOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleMoveToProject}
              disabled={!selectedProjectId || !selectedSubProjectId}
            >
              Move Task
            </Button>
          </div>
        }
      >
        {() => taskToMove ? (
          <div className="space-y-4 p-6">
            {/* Task being moved */}
            <div className="border-y border-[var(--rule)] bg-[var(--surface-subtle)] p-3">
              <p className="text-sm font-medium text-[var(--ink)]">
                {taskToMove.title}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {taskToMove.category} • {taskToMove.priority} Priority
              </p>
            </div>

            {activeProjects.length === 0 ? (
              <div className="py-8 text-center text-[var(--ink-muted)]">
                <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active projects</p>
                <p className="text-xs mt-1">Create a project first to move tasks</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--ink-secondary)]">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedSubProjectId('');
                    }}
                    className="ui-field-control w-full px-4 py-3"
                  >
                    <option value="">Choose a project...</option>
                    {activeProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Project Selection */}
                {selectedProjectId && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--ink-secondary)]">
                      Select Sub-Project
                    </label>
                    {availableSubProjects.length === 0 ? (
                      <p className="text-sm text-[var(--ink-muted)]">
                        No sub-projects in this project. Create one first.
                      </p>
                    ) : (
                      <select
                        value={selectedSubProjectId}
                        onChange={(e) => setSelectedSubProjectId(e.target.value)}
                        className="ui-field-control w-full px-4 py-3"
                      >
                        <option value="">Choose a sub-project...</option>
                        {availableSubProjects.map(sp => (
                          <option key={sp.id} value={sp.id}>
                            {sp.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        ) : null}
      </ExpandableModal>

      <BulkActionBar
        count={selection.count}
        itemLabel="task"
        allSelected={selection.allSelected}
        onSelectAll={selection.selectAll}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
      >
        <BulkEditMenu fields={TASK_BULK_FIELDS} onApply={handleBulkEdit} />
      </BulkActionBar>
    </div>
  );
}
