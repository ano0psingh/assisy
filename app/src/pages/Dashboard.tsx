import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Inbox,
  ListPlus,
  Pencil,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataVersion } from '../context/DataVersionContext';
import { useGamification } from '../context/GamificationContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTaskContext } from '../context/TaskContext';
import { ProjectAssignmentRow } from '../components/dashboard/ProjectAssignmentRow';
import { ExpandableModal } from '../components/common/ExpandableModal';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { TiptapEditor } from '../components/common/TiptapEditor';
import { useToast } from '../components/common/Toast';
import { useUndo } from '../components/common/UndoToast';
import { PlanYourDay } from '../components/tasks/PlanYourDay';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { Button } from '../components/ui';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { getProjectTaskId, useUnifiedTaskActions } from '../hooks/useUnifiedTaskActions';
import { addLocalDays, getLocalDateString, getScheduledDate, getScheduledStartMinute } from '../lib/dateUtils';
import { hapticMedium } from '../lib/haptics';
import {
  getPermissionStatus,
  isNotificationSupported,
  requestPermission,
  sendNotification,
  startDailyPlanningReminder,
} from '../lib/notifications';
import { isOnboardingComplete } from '../lib/onboarding';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { subscribeToPush } from '../lib/pushSubscription';
import type {
  ProjectTask,
  RecurrencePattern,
  RecurrenceRule,
  ReminderOffsetMinutes,
  Task,
} from '../types';

function BacklogPicker({ tasks, onAdd }: { tasks: Task[]; onAdd: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, 4);

  if (tasks.length === 0) return null;

  return (
    <details className="border-t border-[var(--rule)] bg-[var(--surface)]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-[var(--ink-secondary)]">
        <span>Add an assignment from the desk ({tasks.length})</span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="border-t border-[var(--rule)] px-3 py-2">
        {visible.map((task) => (
          <div key={task.id} className="flex min-h-11 items-center gap-3 border-b border-[var(--rule)] py-2 last:border-0">
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">{task.title}</span>
            <button
              type="button"
              onClick={() => onAdd(task.id)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[var(--action)] hover:bg-[var(--action-soft)]"
            >
              <Plus size={13} />
              Run today
            </button>
          </div>
        ))}
        {tasks.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 min-h-10 text-xs font-semibold text-[var(--action)]"
          >
            {expanded ? 'Show fewer assignments' : `Show ${tasks.length - 4} more`}
          </button>
        )}
      </div>
    </details>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useDataVersion();
  const {
    tasks,
    getTodaysTasks,
    loading,
    createTask,
    updateTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    carryForwardTasks,
    getSuggestedTasks,
    hasSeenPlanYourDay,
    markPlanYourDaySeen,
  } = useTaskContext();
  const { goals, linkTaskToGoal, unlinkTaskFromGoal, addXPToGoal } = useGoalContext();
  const { habits } = useHabitContext();
  const {
    getTodaysProjectTasks,
    updateTaskStatus,
    updateProjectTask,
    getProject,
    getSubProject,
    subProjects,
    projects,
    getTasksBySubProject,
  } = useProjectContext();
  const { schedule: scheduleUnifiedTask, unschedule: unscheduleUnifiedTask } = useUnifiedTaskActions();
  const { pushUndo } = useUndo();
  const { toast } = useToast();
  const {
    recordTaskCompletion,
    updateStreak,
    checkAndUnlockAchievements,
    recordDailyLogin,
    recordTaskCreated,
    hasClaimedDailyLogin,
  } = useGamification();

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isPlanYourDayOpen, setIsPlanYourDayOpen] = useState(false);
  const hasCarriedForward = useRef(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [editingProjectTask, setEditingProjectTask] = useState<ProjectTask | null>(null);
  const [projectTaskForm, setProjectTaskForm] = useState({ title: '', description: '' });

  useEffect(() => {
    const status = getPermissionStatus();
    if (status === 'granted') {
      startDailyPlanningReminder(9);
      return;
    }
    if (isNotificationSupported() && status !== 'unsupported') {
      const timer = window.setTimeout(() => setShowNotifBanner(true), 3000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (loading || hasCarriedForward.current) return;
    const initializationTimer = window.setTimeout(() => {
      if (hasCarriedForward.current) return;
      hasCarriedForward.current = true;
      carryForwardTasks();

      if (!hasClaimedDailyLogin()) {
        const result = recordDailyLogin();
        if (result.isNewDay && result.xpEarned > 0) {
          window.setTimeout(() => checkAndUnlockAchievements(), 200);
        }
      }

      if (!hasSeenPlanYourDay() && isOnboardingComplete()) {
        window.setTimeout(() => setIsPlanYourDayOpen(true), 500);
      }
    }, 0);
    return () => window.clearTimeout(initializationTimer);
  }, [
    loading,
    carryForwardTasks,
    hasClaimedDailyLogin,
    recordDailyLogin,
    checkAndUnlockAchievements,
    hasSeenPlanYourDay,
  ]);

  const handlePullRefresh = useCallback(async () => {
    refresh();
  }, [refresh]);
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({ onRefresh: handlePullRefresh });

  const allProjectTasks = useMemo(
    () => subProjects.flatMap((subProject) => getTasksBySubProject(subProject.id)),
    [subProjects, getTasksBySubProject],
  );
  const allUnifiedTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  const todaysProjectTasks = getTodaysProjectTasks();
  const todaysTasks = getTodaysTasks();
  const todayString = getLocalDateString();

  const completedToday = useMemo(
    () => tasks.filter((task) => task.status === 'Completed'
      && task.completedAt
      && getLocalDateString(new Date(task.completedAt)) === todayString),
    [tasks, todayString],
  );
  const completedProjectToday = useMemo(
    () => allProjectTasks.filter((task) => task.status === 'Done'
      && task.completedAt
      && getLocalDateString(new Date(task.completedAt)) === todayString),
    [allProjectTasks, todayString],
  );

  const pendingRegular = todaysTasks.filter((task) => task.status !== 'Completed');
  const projectTaskById = new Map(todaysProjectTasks.map((task) => [task.id, task]));
  const projectTodayAsTasks = allUnifiedTasks.filter(
    (task) => task.id.startsWith('pt-') && projectTaskById.has(getProjectTaskId(task.id)),
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const pendingRundown = [...pendingRegular, ...projectTodayAsTasks].sort((a, b) => {
    const aStart = getScheduledStartMinute(a);
    const bStart = getScheduledStartMinute(b);
    if (aStart !== null && bStart !== null) return aStart - bStart;
    if (aStart !== null) return -1;
    if (bStart !== null) return 1;
    const aOverdue = a.dueDate ? new Date(a.dueDate) < todayStart : false;
    const bOverdue = b.dueDate ? new Date(b.dueDate) < todayStart : false;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (a.priority !== b.priority) return a.priority === 'High' ? -1 : 1;
    return a.effort === 'High' ? -1 : 1;
  });

  const pendingIds = new Set(pendingRundown.map((task) => task.id));
  const planBacklogTasks = allUnifiedTasks.filter((task) =>
    task.status !== 'Completed'
    && task.inbox !== true
    && !task.isRecurring
    && !getScheduledDate(task)
    && !pendingIds.has(task.id));
  const suggestedTasks = getSuggestedTasks();
  const inboxCount = tasks.filter((task) => task.inbox === true && task.status !== 'Completed').length;
  const overdueCount = allUnifiedTasks.filter((task) => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < todayStart;
  }).length;
  const completedCount = completedToday.length + completedProjectToday.length;
  const totalToday = pendingRundown.length + completedCount;
  const progress = totalToday === 0 ? 0 : Math.round((completedCount / totalToday) * 100);
  const activeAssignment = pendingRundown[0];
  const remainingAssignments = pendingRundown.slice(1);

  const profileName = (
    user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || ''
  ).trim().split(/\s+/)[0];

  const handleToggleComplete = useCallback((taskId: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
      return;
    }
    hapticMedium();
    completeTask(taskId);
    if (!task) return;

    recordTaskCompletion(task.category, task.xpValue);
    updateStreak();
    if (task.goalId && !task.isRecurring) addXPToGoal(task.goalId, task.xpValue || 10);
    toast({ message: `Completed: ${task.title}`, type: 'success', duration: 1800 });
    window.setTimeout(() => checkAndUnlockAchievements(), 100);
  }, [
    tasks,
    uncompleteTask,
    completeTask,
    recordTaskCompletion,
    updateStreak,
    addXPToGoal,
    toast,
    checkAndUnlockAchievements,
  ]);

  const handleProjectTaskStatus = useCallback((task: ProjectTask, status: ProjectTask['status']) => {
    hapticMedium();
    updateTaskStatus(task.id, status);
    if (status === 'Done') {
      toast({ message: `Completed: ${task.title}`, type: 'success', duration: 1800 });
    }
  }, [toast, updateTaskStatus]);

  const handleDeleteWithUndo = useCallback((taskId: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    deleteTask(taskId);
    pushUndo(`"${task.title}" deleted`, () => {
      createTask(
        task.title,
        task.description,
        task.category,
        task.priority,
        task.effort,
        task.isRecurring,
        task.recurrencePattern,
        task.specificDays,
        task.goalId,
        task.dueDate,
        task.monthDay,
        task.dueTime,
      );
    });
  }, [tasks, deleteTask, pushUndo, createTask]);

  const handleCreateTask = (data: {
    title: string;
    description: string;
    category: 'Personal' | 'Financial' | 'Professional';
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
    addToToday?: boolean;
  }) => {
    const newTask = createTask(
      data.title,
      data.description,
      data.category,
      data.priority,
      data.effort,
      data.isRecurring,
      data.recurrencePattern,
      data.specificDays,
      data.goalId,
      data.dueDate,
      data.monthDay,
      data.dueTime,
      { recurrenceRule: data.recurrenceRule, dueReminderOffsets: data.dueReminderOffsets },
    );
    if (data.goalId) linkTaskToGoal(data.goalId, newTask.id);
    if (data.addToToday) scheduleUnifiedTask(newTask.id, { date: todayString });
    recordTaskCreated();
    window.setTimeout(() => checkAndUnlockAchievements(), 100);
    setIsTaskFormOpen(false);
  };

  const handleUpdateTask = (data: {
    title: string;
    description: string;
    category: 'Personal' | 'Financial' | 'Professional';
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
    if (editingTask.goalId && editingTask.goalId !== data.goalId) {
      unlinkTaskFromGoal(editingTask.goalId, editingTask.id);
    }
    if (data.goalId && data.goalId !== editingTask.goalId) {
      linkTaskToGoal(data.goalId, editingTask.id);
    }
    updateTask(editingTask.id, data);
    setEditingTask(null);
    setIsTaskFormOpen(false);
  };

  const handleEditProjectTask = (task: ProjectTask) => {
    setEditingProjectTask(task);
    setProjectTaskForm({ title: task.title, description: task.description || '' });
  };
  const handleSaveProjectTask = () => {
    if (!editingProjectTask || !projectTaskForm.title.trim()) return;
    updateProjectTask(editingProjectTask.id, {
      title: projectTaskForm.title.trim(),
      description: projectTaskForm.description,
    });
    setEditingProjectTask(null);
  };
  const closePlanYourDay = () => {
    markPlanYourDaySeen();
    setIsPlanYourDayOpen(false);
  };

  if (loading) return <DashboardSkeleton />;

  const notificationStatus = getPermissionStatus();

  return (
    <div ref={containerRef} className="space-y-5">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {notificationStatus !== 'unsupported'
        && !(notificationStatus === 'granted' && !showNotifBanner)
        && showNotifBanner && (
          <aside className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
            notificationStatus === 'denied'
              ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
              : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink)]'
          }`}>
            <div>
              <p className="text-sm font-semibold">
                {notificationStatus === 'denied' ? 'Notifications are blocked' : 'Put reminders on the wire'}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {notificationStatus === 'denied'
                  ? 'Allow notifications in browser site settings.'
                  : 'Get habit and planning reminders when Assisy is closed.'}
              </p>
            </div>
            {notificationStatus === 'default' ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    const granted = await requestPermission();
                    if (granted) {
                      startDailyPlanningReminder(9);
                      const reminders = habits
                        .filter((habit) => habit.reminderTime)
                        .map((habit) => ({ name: habit.name, time: habit.reminderTime! }));
                      await subscribeToPush(reminders);
                      await sendNotification('Notifications enabled', { body: 'Your assignment reminders are ready.' });
                    }
                    setShowNotifBanner(false);
                  }}
                >
                  Enable
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNotifBanner(false)}>Later</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowNotifBanner(false)}>Dismiss</Button>
            )}
          </aside>
        )}

      <header className="border-y border-[var(--rule-strong)] py-4">
        <div>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">
              Today{profileName ? `, ${profileName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              <span className="tabular-nums">{completedCount} filed, {pendingRundown.length} on the desk</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden bg-[var(--surface-inset)]"
            role="progressbar"
            aria-label="Today's assignment progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-[var(--action)] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <span className="min-w-10 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">{progress}%</span>
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-7">
        <div className="min-w-0 space-y-7">
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => document.getElementById('rundown-title')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex min-h-14 w-full items-center gap-3 border-y border-[var(--danger)] bg-[var(--danger-soft)] px-4 text-left text-[var(--danger)] hover:brightness-95"
            >
              <AlertTriangle size={17} />
              <span className="flex-1 text-sm font-semibold">{overdueCount} overdue assignment{overdueCount === 1 ? '' : 's'}</span>
              <span className="text-xs font-semibold">Review rundown</span>
            </button>
          )}

          <section aria-labelledby="active-assignment-title">
            <div className="flex items-end justify-between border-b border-[var(--rule-strong)] pb-2">
              <div>
                <h2 id="active-assignment-title" className="text-xl font-bold tracking-[-0.015em] text-[var(--ink)]">
                  Active assignment
                </h2>
                <p className="text-xs text-[var(--ink-muted)]">The next commitment on today’s desk.</p>
              </div>
              {activeAssignment && (
                <span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">1 / {pendingRundown.length}</span>
              )}
            </div>

            {!activeAssignment ? (
              <div className="border-y-2 border-[var(--ink)] bg-[var(--surface-raised)] px-5 py-8 sm:px-7">
                <h3 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">The desk is clear.</h3>
                <p className="mt-2 max-w-xl text-sm text-[var(--ink-secondary)]">
                  Build today’s plan from the assignments already waiting in your workspace.
                </p>
                <Button className="mt-5" icon={ListPlus} onClick={() => setIsPlanYourDayOpen(true)}>Plan day</Button>
              </div>
            ) : activeAssignment.id.startsWith('pt-') ? (() => {
              const projectTask = projectTaskById.get(getProjectTaskId(activeAssignment.id));
              if (!projectTask) return null;
              return (
                <ProjectAssignmentRow
                  task={projectTask}
                  projectName={getProject(projectTask.projectId)?.title}
                  subProjectName={getSubProject(projectTask.subProjectId)?.title}
                  onAdvanceStatus={(status) => handleProjectTaskStatus(projectTask, status)}
                  onEdit={() => handleEditProjectTask(projectTask)}
                  onOpenProject={() => navigate('/projects')}
                  onRemoveFromToday={() => unscheduleUnifiedTask(activeAssignment.id)}
                  featured
                />
              );
            })() : (
              <article className="border-y-2 border-[var(--ink)] bg-[var(--surface-raised)] px-5 py-6 sm:px-7 sm:py-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[var(--ink-muted)]">
                      <span>{activeAssignment.category}</span>
                      {activeAssignment.priority === 'High' && <span className="text-[var(--danger)]">Urgent</span>}
                      {activeAssignment.goalId && (
                        <span>{goals.find((goal) => goal.id === activeAssignment.goalId)?.title || 'Goal-linked'}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(activeAssignment);
                        setIsTaskFormOpen(true);
                      }}
                      className="mt-3 max-w-3xl font-[var(--font-display)] text-left text-2xl font-bold leading-tight tracking-[-0.025em] text-[var(--ink)] hover:text-[var(--action)] sm:text-3xl"
                    >
                      {activeAssignment.title}
                    </button>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={15} className="text-[var(--action)]" />
                        {activeAssignment.scheduledTime
                          ? new Date(`2000-01-01T${activeAssignment.scheduledTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                          : 'Any time today'}
                        {activeAssignment.durationMinutes ? ` · ${activeAssignment.durationMinutes} min` : ''}
                      </span>
                      {activeAssignment.dueDate && (
                        <span>
                          Due {new Date(activeAssignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {activeAssignment.dueTime ? ` at ${activeAssignment.dueTime}` : ''}
                        </span>
                      )}
                      {activeAssignment.isRecurring && <span>Recurring assignment</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(activeAssignment.id)}
                    className="inline-flex min-h-12 items-center gap-2 bg-[var(--action)] px-5 text-sm font-bold text-[var(--ink-inverse)] hover:brightness-95"
                  >
                    <Check size={17} strokeWidth={2.5} />
                    Complete
                  </button>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--rule)] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(activeAssignment);
                      setIsTaskFormOpen(true);
                    }}
                    className="min-h-11 px-2 text-sm font-semibold text-[var(--action)] hover:underline"
                  >
                    Edit assignment
                  </button>
                  <button
                    type="button"
                    onClick={() => scheduleUnifiedTask(activeAssignment.id, {
                      date: getLocalDateString(addLocalDays(new Date(), 1)),
                    })}
                    className="hidden min-h-11 px-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--action)] sm:inline-flex sm:items-center"
                  >
                    Move to tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => unscheduleUnifiedTask(activeAssignment.id)}
                    className="hidden min-h-11 px-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--action)] sm:inline-flex sm:items-center"
                  >
                    Remove from Today
                  </button>
                  <details className="relative sm:hidden">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-2 text-sm font-medium text-[var(--ink-secondary)]">
                      More <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </summary>
                    <div className="absolute bottom-full left-0 z-20 mb-1 min-w-48 border border-[var(--rule-strong)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-elevated)]">
                      <button
                        type="button"
                        onClick={() => scheduleUnifiedTask(activeAssignment.id, {
                          date: getLocalDateString(addLocalDays(new Date(), 1)),
                        })}
                        className="flex min-h-11 w-full items-center px-3 text-left text-sm text-[var(--ink-secondary)] hover:bg-[var(--state-hover)] hover:text-[var(--action)]"
                      >
                        Move to tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => unscheduleUnifiedTask(activeAssignment.id)}
                        className="flex min-h-11 w-full items-center px-3 text-left text-sm text-[var(--ink-secondary)] hover:bg-[var(--state-hover)] hover:text-[var(--danger)]"
                      >
                        Remove from Today
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            )}
          </section>

          <section aria-labelledby="rundown-title">
            <div className="flex items-end justify-between border-b-2 border-[var(--ink)] pb-2">
              <div>
                <h2 id="rundown-title" className="text-xl font-bold tracking-[-0.015em] text-[var(--ink)]">Next in the rundown</h2>
                <p className="text-xs text-[var(--ink-muted)]">Timed work leads; urgent and high-effort work follows.</p>
              </div>
              <span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">{remainingAssignments.length} WAITING</span>
            </div>

            <div className="border-x border-b border-[var(--rule)] bg-[var(--surface-raised)]">
              {remainingAssignments.map((task) => {
                if (!task.id.startsWith('pt-')) {
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteWithUndo}
                      onEdit={(selected) => {
                        setEditingTask(selected);
                        setIsTaskFormOpen(true);
                      }}
                      onScheduleTomorrow={(taskId) => scheduleUnifiedTask(taskId, {
                        date: getLocalDateString(addLocalDays(new Date(), 1)),
                      })}
                      onRemoveFromToday={unscheduleUnifiedTask}
                      isInTodayView
                    />
                  );
                }

                const projectTask = projectTaskById.get(getProjectTaskId(task.id));
                if (!projectTask) return null;
                return (
                  <ProjectAssignmentRow
                    key={task.id}
                    task={projectTask}
                    projectName={getProject(projectTask.projectId)?.title}
                    subProjectName={getSubProject(projectTask.subProjectId)?.title}
                    onAdvanceStatus={(status) => handleProjectTaskStatus(projectTask, status)}
                    onEdit={() => handleEditProjectTask(projectTask)}
                    onOpenProject={() => navigate('/projects')}
                    onRemoveFromToday={() => unscheduleUnifiedTask(task.id)}
                  />
                );
              })}

              <BacklogPicker
                tasks={suggestedTasks}
                onAdd={(taskId) => scheduleUnifiedTask(taskId, { date: todayString })}
              />

              {completedCount > 0 && (
                <details className="border-t border-[var(--rule-strong)] bg-[var(--surface)]">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-[var(--success)]">
                    <span className="inline-flex items-center gap-2"><Check size={15} /> Completed today</span>
                    <span className="font-mono text-xs tabular-nums">{completedCount}</span>
                  </summary>
                  <div className="border-t border-[var(--rule)]">
                    {completedToday.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDeleteWithUndo}
                        onEdit={(selected) => {
                          setEditingTask(selected);
                          setIsTaskFormOpen(true);
                        }}
                        isInTodayView
                      />
                    ))}
                    {completedProjectToday.map((task) => (
                      <ProjectAssignmentRow
                        key={task.id}
                        task={task}
                        projectName={getProject(task.projectId)?.title}
                        subProjectName={getSubProject(task.subProjectId)?.title}
                        onAdvanceStatus={(status) => handleProjectTaskStatus(task, status)}
                        onEdit={() => handleEditProjectTask(task)}
                        onOpenProject={() => navigate('/projects')}
                        onRemoveFromToday={() => unscheduleUnifiedTask(`pt-${task.id}`)}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
        </div>

        <aside aria-labelledby="day-tools-title" className="border-t border-[var(--rule-strong)] pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-baseline justify-between border-b border-[var(--rule-strong)] pb-2">
            <h2 id="day-tools-title" className="text-sm font-bold text-[var(--ink)]">Day tools</h2>
            <span className="text-xs text-[var(--ink-muted)]">Utilities</span>
          </div>
          <nav aria-label="Today utilities" className="divide-y divide-[var(--rule)]">
            <button
              type="button"
              onClick={() => setIsPlanYourDayOpen(true)}
              className="flex min-h-16 w-full items-center gap-3 text-left text-sm font-semibold text-[var(--action)] hover:bg-[var(--action-soft)]"
            >
              <ListPlus size={17} />
              <span className="flex-1">Plan day</span>
              {suggestedTasks.length > 0 && <span className="font-mono text-xs tabular-nums">{suggestedTasks.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks/inbox')}
              className="flex min-h-16 w-full items-center gap-3 text-left text-sm font-semibold text-[var(--action)] hover:bg-[var(--action-soft)]"
            >
              <Inbox size={17} />
              <span className="flex-1">Inbox</span>
              <span className="font-mono text-xs tabular-nums">{inboxCount}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="flex min-h-16 w-full items-center gap-3 text-left text-sm font-semibold text-[var(--action)] hover:bg-[var(--action-soft)]"
            >
              <Calendar size={17} />
              <span className="flex-1">Calendar</span>
            </button>
          </nav>
        </aside>
      </div>

      <TaskForm
        isOpen={isTaskFormOpen}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        onCancel={() => {
          setEditingTask(null);
          setIsTaskFormOpen(false);
        }}
        goals={goals}
        editingTask={editingTask}
        defaultAddToToday
      />

      <PlanYourDay
        isOpen={isPlanYourDayOpen}
        onClose={closePlanYourDay}
        todaysTasks={[...pendingRegular, ...projectTodayAsTasks]}
        suggestedTasks={planBacklogTasks}
        onScheduleToday={(taskId) => scheduleUnifiedTask(taskId, { date: todayString })}
        onUnschedule={unscheduleUnifiedTask}
      />

      <ExpandableModal
        isOpen={!!editingProjectTask}
        onClose={() => setEditingProjectTask(null)}
        title="Edit project assignment"
        icon={<Pencil className="h-5 w-5 text-[var(--action)]" />}
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditingProjectTask(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveProjectTask}>Save assignment</Button>
          </div>
        )}
      >
        {(isFullscreen) => {
          if (!editingProjectTask) return null;
          const fields = (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--ink-secondary)]">Headline</span>
                <input
                  type="text"
                  value={projectTaskForm.title}
                  onChange={(event) => setProjectTaskForm((current) => ({ ...current, title: event.target.value }))}
                  className="input w-full rounded-md px-4 py-3"
                  autoFocus
                />
              </label>
              <div className={isFullscreen ? 'flex min-h-0 flex-1 flex-col' : ''}>
                <span className="mb-1 block text-sm font-medium text-[var(--ink-secondary)]">Notes</span>
                <TiptapEditor
                  content={projectTaskForm.description}
                  onChange={(description) => setProjectTaskForm((current) => ({ ...current, description }))}
                  placeholder="Add reporting notes, checklist items, or context…"
                />
              </div>
            </>
          );
          const desk = (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--ink-secondary)]">Desk status</p>
                <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--rule)]">
                  {(['Backlog', 'In Progress', 'Done'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateTaskStatus(editingProjectTask.id, status)}
                      className={`min-h-11 border-r border-[var(--rule)] px-2 text-xs font-semibold last:border-0 ${
                        editingProjectTask.status === status
                          ? 'bg-[var(--action-soft)] text-[var(--action)]'
                          : 'bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-[var(--rule)] pt-3 text-sm text-[var(--ink-secondary)]">
                <CalendarClock size={15} className="mr-2 inline text-[var(--action)]" />
                {getProject(editingProjectTask.projectId)?.title}
                {' / '}
                {getSubProject(editingProjectTask.subProjectId)?.title}
              </div>
            </div>
          );

          return isFullscreen ? (
            <div className="flex h-full">
              <div className="flex flex-1 flex-col gap-4 p-8">{fields}</div>
              <aside className="w-80 flex-shrink-0 border-l border-[var(--rule)] bg-[var(--surface)] p-6">{desk}</aside>
            </div>
          ) : (
            <div className="space-y-5 p-6">{fields}{desk}</div>
          );
        }}
      </ExpandableModal>
    </div>
  );
}
