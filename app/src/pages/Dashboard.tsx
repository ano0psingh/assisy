import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { CheckSquare, Plus, Zap, Sparkles, Quote, Flame, ListPlus, Calendar, CheckCircle2, ListTodo, Circle, Play, Pencil, Trophy, Crown, AlertTriangle, CalendarMinus, Target, RefreshCw, Bot } from 'lucide-react';
import { askAI, isAIConfigured } from '../lib/ai';
import { formatAIText } from '../lib/formatAIText';
import { isOnboardingComplete } from '../lib/onboarding';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { PlanYourDay } from '../components/tasks/PlanYourDay';
import { TiptapEditor } from '../components/common/TiptapEditor';
import { isNotificationSupported, requestPermission, sendNotification, startDailyPlanningReminder, getPermissionStatus } from '../lib/notifications';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { subscribeToPush } from '../lib/pushSubscription';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { ExpandableModal } from '../components/common/ExpandableModal';
import { hapticMedium } from '../lib/haptics';
import { useUndo } from '../components/common/UndoToast';
import { useToast } from '../components/common/Toast';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { getQuoteOfTheDay } from '../data/quotes';
import { DailyCheckIn } from '../components/habits/DailyCheckIn';
import type { Task, ProjectTask, WorkItemStatus, RecurrencePattern } from '../types';

// XP Animation Component
function XPAnimation({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-xp-float text-2xl sm:text-3xl font-bold text-amber-400 drop-shadow-lg flex items-center gap-2">
        <Zap className="w-8 h-8" />
        +{xp} XP
      </div>
    </div>
  );
}

function BacklogPicker({ tasks, onAdd }: { tasks: Task[]; onAdd: (id: string) => void; }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  if (tasks.length === 0) return null;

  const filtered = search.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;
  const visible = expanded ? filtered : filtered.slice(0, 4);

  return (
    <div className={`mt-3 pt-3 border-t border-slate-100 dark:border-white/5`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs text-slate-400 dark:text-gray-500`}>
          Add from backlog ({tasks.length})
        </p>
        {tasks.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300`}
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
      {expanded && tasks.length > 6 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search backlog..."
          className={`w-full px-3 py-2 mb-2 rounded-lg text-xs outline-none ${
            'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-600'
          }`}
        />
      )}
      <div className={`space-y-1 ${expanded ? 'max-h-60 overflow-y-auto' : ''}`}>
        {visible.map(task => (
          <button
            key={task.id}
            onClick={() => onAdd(task.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
              'text-slate-500 hover:bg-violet-50 hover:text-violet-600 dark:text-gray-400 dark:hover:bg-violet-500/10 dark:hover:text-violet-400'
            }`}
          >
            <Plus size={12} className="flex-shrink-0" />
            <span className="truncate flex-1">{task.title}</span>
            <span className={`text-xs flex-shrink-0 text-slate-400 dark:text-gray-600`}>{task.category}</span>
          </button>
        ))}
        {expanded && filtered.length === 0 && search && (
          <p className={`text-xs py-2 text-center text-slate-400 dark:text-gray-600`}>No tasks match "{search}"</p>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
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
    addToToday,
    removeFromToday,
    getSuggestedTasks,
    hasSeenPlanYourDay,
    markPlanYourDaySeen,
  } = useTaskContext();
  const { goals, linkTaskToGoal, unlinkTaskFromGoal, addXPToGoal } = useGoalContext();
  const { habits, getTodaysLog: getTodaysHabitLog } = useHabitContext();
  const { getTodaysLog: getTodaysDailyLog, createOrUpdateLog, getRecentLogs } = useDailyLogContext();
  const { 
    getTodaysProjectTasks, 
    updateTaskStatus, 
    updateProjectTask,
    removeTaskFromToday: removeProjectTaskFromToday,
    getProject,
    getSubProject,
    subProjects,
    projects,
    getTasksBySubProject,
  } = useProjectContext();
  const { theme } = useTheme();
  const { pushUndo } = useUndo();
  const { toast } = useToast();
  const {
    recordTaskCompletion,
    updateStreak, 
    checkAndUnlockAchievements,
    recentUnlocks,
    clearRecentUnlocks,
    getTotalLevel,
    getLevelProgress,
    getTitle,
    userStats,
    getUnlockedAchievements,
    recordDailyLogin,
    recordTaskCreated,
    hasClaimedDailyLogin,
  } = useGamification();
  const isDark = theme === 'dark';
  const levelProgress = getLevelProgress();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hasCarriedForward, setHasCarriedForward] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  useEffect(() => {
    const status = getPermissionStatus();
    if (status === 'granted') {
      startDailyPlanningReminder(9);
    } else if (isNotificationSupported() && status !== 'unsupported') {
      const timer = setTimeout(() => setShowNotifBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; xp: number }>({ show: false, xp: 0 });
  const [isPlanYourDayOpen, setIsPlanYourDayOpen] = useState(false);
  const [dailyBonusResult, setDailyBonusResult] = useState<{ show: boolean; xp: number; streak: number; multiplier: number } | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [editingProjectTask, setEditingProjectTask] = useState<ProjectTask | null>(null);
  const [projectTaskForm, setProjectTaskForm] = useState({ title: '', description: '' });
  const [morningBriefing, setMorningBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const handlePullRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  // Get today's project tasks
  const todaysProjectTasks = getTodaysProjectTasks();

  // Handle editing project task
  const handleEditProjectTask = (task: ProjectTask) => {
    setEditingProjectTask(task);
    setProjectTaskForm({ title: task.title, description: task.description || '' });
  };

  const handleSaveProjectTask = () => {
    if (!editingProjectTask || !projectTaskForm.title.trim()) return;
    updateProjectTask(editingProjectTask.id, {
      title: projectTaskForm.title,
      description: projectTaskForm.description,
    });
    setEditingProjectTask(null);
  };

  const habitCheckInStats = useMemo(() => {
    const todayCompletedCount = habits.filter(h => getTodaysHabitLog(h.id) > 0).length;
    return { todayCompletedCount, totalHabits: habits.length };
  }, [habits, getTodaysHabitLog]);

  const generateBriefing = useCallback(async (force = false) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const cacheKey = `assisy_morning_briefing_${todayStr}`;

    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setMorningBriefing(cached);
        return;
      }
    }

    if (!isAIConfigured()) return;

    setBriefingLoading(true);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const overdueTasks = tasks.filter(t => {
        if (t.status === 'Completed' || !t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < now;
      });

      const todayTasks = getTodaysTasks();
      const highPriority = todayTasks.filter(t => t.priority === 'High' && t.status !== 'Completed');

      const recentLogs = getRecentLogs(3);
      const energyLevels = recentLogs
        .filter(l => l.energyLevel != null)
        .map(l => ({ date: l.date, energy: l.energyLevel }));

      const streaksAtRisk = habits
        .filter(h => h.streakCount > 0)
        .map(h => ({ name: h.name, streak: h.streakCount }));

      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const upcomingDeadlines = tasks
        .filter(t => {
          if (t.status === 'Completed' || !t.dueDate) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due >= now && due <= threeDaysFromNow;
        })
        .map(t => ({ title: t.title, dueDate: t.dueDate, priority: t.priority }));

      const activeGoals = goals
        .filter(g => g.status === 'Active')
        .map(g => ({ title: g.title, progress: g.progress }));

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[new Date().getDay()];
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      const yesterdayCompleted = tasks.filter(t => {
        if (t.status !== 'Completed' || !t.completedAt) return false;
        const comp = new Date(t.completedAt);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        comp.setHours(0, 0, 0, 0);
        return comp.getTime() === yesterday.getTime();
      }).length;

      const briefingData = {
        dayOfWeek: dayName,
        timeOfDay,
        overdueTasks: overdueTasks.length,
        overdueTaskTitles: overdueTasks.slice(0, 3).map(t => t.title),
        todayTasksCount: todayTasks.length,
        todayPending: todayTasks.filter(t => t.status !== 'Completed').length,
        highPriorityTasks: highPriority.map(t => t.title),
        recentEnergyLevels: energyLevels,
        streaksAtRisk,
        upcomingDeadlines,
        activeGoals,
        yesterdayCompleted,
        currentStreak: userStats.currentStreak,
        totalLevel: getTotalLevel(),
      };

      const result = await askAI(JSON.stringify(briefingData), {
        systemPrompt: `You are a sharp productivity strategist (not a cheerleader). Today is ${dayName}, ${timeOfDay}.

RULES:
- Synthesize patterns, don't list stats back. Connect dots the user might miss.
- Each point must contain a SPECIFIC action with a time estimate or deadline.
- Use implementation intentions for at least one point: "When [trigger], do [action]" format.
- If energy data exists, match task difficulty to energy levels (hard tasks when energy peaks).
- NEVER say "Great job!", "Keep it up!", "You've got this!", or any generic encouragement. Be direct and tactical.
- If there's nothing urgent, suggest one proactive move toward a goal.
- If it's ${dayName === 'Monday' ? 'Monday — set the tone for the week' : dayName === 'Friday' ? 'Friday — focus on closing out the week' : 'midweek — maintain momentum'}.
- Max 4 bullets. Under 120 words total. No greetings, no sign-offs, no filler.`,
        temperature: 0.8,
      });

      setMorningBriefing(result);
      localStorage.setItem(cacheKey, result);
    } catch {
      setMorningBriefing(null);
    } finally {
      setBriefingLoading(false);
    }
  }, [tasks, getTodaysTasks, getRecentLogs, habits, goals]);

  useEffect(() => {
    if (!loading) {
      generateBriefing();
    }
  }, [loading, generateBriefing]);

  // All hooks must be called before any early returns
  const handleToggleComplete = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
      return;
    }
    hapticMedium();
    if (task && task.category !== 'Professional' && task.xpValue > 0) {
      setXpAnimation({ show: true, xp: task.xpValue });
    }
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
      setTimeout(() => {
        checkAndUnlockAchievements();
      }, 100);
    }
  }, [tasks, completeTask, uncompleteTask, recordTaskCompletion, updateStreak, checkAndUnlockAchievements, addXPToGoal, toast]);

  // Get week boundaries for weekly review
  const getWeekBounds = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
  }, []);

  // Weekly review — all tasks, not just Professional
  const allTasksForStats = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );

  const weeklyProfessionalReview = useMemo(() => {
    const { monday, sunday } = getWeekBounds();
    
    const completedThisWeek = allTasksForStats.filter(t => {
      if (t.status !== 'Completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return completedDate >= monday && completedDate <= sunday;
    });
    
    const backlog = allTasksForStats.filter(t => 
      t.status === 'Pending' || t.status === 'Carried Forward'
    );
    
    const carriedForward = allTasksForStats.filter(t => 
      t.status === 'Carried Forward'
    );
    
    return {
      completed: completedThisWeek,
      backlog,
      carriedForward,
      weekStart: monday,
      weekEnd: sunday,
    };
  }, [allTasksForStats, getWeekBounds]);

  useEffect(() => {
    if (!loading && !hasCarriedForward) {
      carryForwardTasks();
      setHasCarriedForward(true);
      
      // Claim daily login bonus
      if (!hasClaimedDailyLogin()) {
        const result = recordDailyLogin();
        if (result.isNewDay && result.xpEarned > 0) {
          setDailyBonusResult({
            show: true,
            xp: result.xpEarned,
            streak: userStats.dailyLoginStreak + 1,
            multiplier: result.streakMultiplier,
          });
          // Auto-dismiss after 4s
          setTimeout(() => setDailyBonusResult(null), 4000);
          // Check achievements after login
          setTimeout(() => checkAndUnlockAchievements(), 200);
        }
      }
      
      // Show Plan Your Day modal if not seen today. Not while the onboarding
      // tour is still up, or a first-time user meets two modals at once.
      if (!hasSeenPlanYourDay() && isOnboardingComplete()) {
        // Delay slightly so daily bonus shows first
        setTimeout(() => setIsPlanYourDayOpen(true), 500);
      }
    }
  }, [loading, hasCarriedForward, carryForwardTasks, hasSeenPlanYourDay, hasClaimedDailyLogin, recordDailyLogin, userStats.dailyLoginStreak, checkAndUnlockAchievements]);

  const handleDeleteWithUndo = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    deleteTask(taskId);
    pushUndo(`"${task.title}" deleted`, () => {
      createTask(task.title, task.description, task.category, task.priority, task.effort, task.isRecurring, task.recurrencePattern, task.specificDays, task.goalId, task.dueDate, task.monthDay, task.dueTime);
    });
  }, [tasks, deleteTask, createTask, pushUndo]);

  const todayTaskIds = useMemo(() => new Set(getTodaysTasks().map(t => t.id)), [getTodaysTasks, tasks]);
  const activeGoalIds = useMemo(() => new Set(goals.filter(g => g.status === 'Active').map(g => g.id)), [goals]);
  const suggestionGroups = useMemo(() => {
    const notToday = (t: Task) => !todayTaskIds.has(t.id) && t.status !== 'Completed';
    const notRecurring = (t: Task) => !t.isRecurring; // recurring tasks auto-appear on their scheduled day
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter(t => notToday(t) && notRecurring(t) && t.dueDate && new Date(t.dueDate) < now);
    const fromGoals = tasks.filter(t => notToday(t) && notRecurring(t) && t.goalId && activeGoalIds.has(t.goalId));
    const fromGoalsExcludingOverdue = fromGoals.filter(t => !overdue.includes(t));
    const suggested = getSuggestedTasks();
    const otherTasks = suggested.filter(t => !overdue.some(o => o.id === t.id) && !fromGoalsExcludingOverdue.some(f => f.id === t.id));
    return [
      { label: 'Overdue', tasks: overdue, icon: AlertTriangle },
      { label: 'From your goals', tasks: fromGoalsExcludingOverdue, icon: Target },
      { label: 'Other tasks', tasks: otherTasks, icon: ListTodo },
    ].filter(g => g.tasks.length > 0);
  }, [tasks, todayTaskIds, activeGoalIds, getSuggestedTasks]);
  
  if (loading) {
    return <DashboardSkeleton />;
  }

  const todaysTasks = getTodaysTasks();
  const quote = getQuoteOfTheDay();

  const handleCreateTask = (data: {
    title: string;
    description: string;
    category: 'Personal' | 'Financial' | 'Professional';
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    goalId?: string;
    dueDate?: Date;
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
      undefined,
      data.goalId,
      data.dueDate
    );
    
    if (data.goalId) {
      linkTaskToGoal(data.goalId, newTask.id);
    }

    if (data.addToToday) {
      addToToday(newTask.id);
    }
    
    recordTaskCreated();
    setTimeout(() => checkAndUnlockAchievements(), 100);
    
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
    goalId?: string;
    dueDate?: Date;
    dueTime?: string;
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
      goalId: data.goalId,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
    });
    
    setEditingTask(null);
    setIsTaskFormOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTask(null);
    setIsTaskFormOpen(false);
  };

  const handleClosePlanYourDay = () => {
    markPlanYourDaySeen();
    setIsPlanYourDayOpen(false);
  };

  const handleOpenPlanYourDay = () => {
    setIsPlanYourDayOpen(true);
  };

  // All today's tasks as a flat list sorted by priority
  const allTodayPending = todaysTasks.filter(t => t.status !== 'Completed');
  const allTodayCompleted = todaysTasks.filter(t => t.status === 'Completed');
  const projectTasksDone = todaysProjectTasks.filter(t => t.status === 'Done').length;
  const totalTodayTasks = todaysTasks.length + todaysProjectTasks.length;
  const totalTodayDone = allTodayCompleted.length + projectTasksDone;

  const greetingEmoji = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  })();

  return (
    <div ref={containerRef} className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Notification status */}
      {(() => {
        const status = getPermissionStatus();
        if (status === 'unsupported') return null;
        if (status === 'granted' && !showNotifBanner) return null;
        return (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
            status === 'denied'
              ? 'bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
              : 'bg-violet-50 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20'
          }`}>
            <div>
              <p className={`text-sm font-medium ${
                status === 'denied'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-violet-700 dark:text-violet-300'
              }`}>
                {status === 'denied'
                  ? 'Notifications blocked'
                  : 'Enable notifications for habit reminders'}
              </p>
              {status === 'denied' && (
                <p className={`text-xs mt-1 text-red-500/60 dark:text-red-400/60`}>
                  Open browser settings → Site settings → Notifications → Allow for this site
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {status === 'default' && (
                <>
                  <button
                    onClick={async () => {
                      const granted = await requestPermission();
                      if (granted) {
                        startDailyPlanningReminder(9);
                        const reminders = habits.filter(h => h.reminderTime).map(h => ({ name: h.name, time: h.reminderTime! }));
                        await subscribeToPush('local', reminders);
                        await sendNotification('Notifications enabled!', { body: 'You\'ll receive habit reminders even when the app is closed.' });
                      }
                      setShowNotifBanner(false);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowNotifBanner(false)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10`}
                  >
                    Later
                  </button>
                </>
              )}
              {status === 'granted' && (
                <button
                  onClick={async () => {
                    await sendNotification('Test notification', { body: 'Notifications are working!' });
                    setShowNotifBanner(false);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Test
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── OVERDUE WARNING ───────────────────────────── */}
      {(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const overdueTasks = tasks.filter(t => {
          if (t.status === 'Completed' || !t.dueDate) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due < now;
        });
        if (overdueTasks.length === 0) return null;
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
            'bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
          }`}>
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 text-red-500 dark:text-red-400`} />
            <div className="flex-1">
              <span className={`text-sm font-medium text-red-600 dark:text-red-400`}>
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs ml-2 text-red-500/60 dark:text-red-400/60`}>
                {overdueTasks.slice(0, 3).map(t => t.title).join(', ')}{overdueTasks.length > 3 ? ` +${overdueTasks.length - 3} more` : ''}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── GREETING: date, progress, actions ───────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold text-slate-800 dark:text-white`}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Kage {greetingEmoji}
          </h1>
          <p className={`mt-1 text-sm text-slate-500 dark:text-gray-400`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {totalTodayTasks > 0 && (
              <span className={'text-violet-600 dark:text-violet-400'}> · {totalTodayDone} of {totalTodayTasks} done</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenPlanYourDay}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-colors ${
              isDark
                ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ListPlus size={16} />
            <span>Plan Day</span>
            {getSuggestedTasks().length > 0 && (
              <span className={`ml-1 px-2 py-1 text-xs font-bold rounded-full ${
                'bg-violet-200 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300'
              }`}>{getSuggestedTasks().length}</span>
            )}
          </button>
          <button
            onClick={() => setIsTaskFormOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl flex items-center space-x-2 text-sm"
          >
            <Plus size={16} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* ── TODAY'S TASKS — the hero section ───────────────── */}
      {todaysTasks.length === 0 && todaysProjectTasks.length === 0 ? (
        <div className={`card rounded-2xl p-6 sm:p-8 text-center`}>
          <Sparkles className={`w-10 h-10 mx-auto mb-3 text-emerald-500 dark:text-emerald-400`} />
          <h3 className={`font-semibold mb-1 text-slate-800 dark:text-white`}>All clear!</h3>
          <p className={`text-sm mb-4 text-slate-500 dark:text-gray-400`}>No tasks for today.</p>
          <button
            onClick={() => setIsTaskFormOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Project tasks — compact inline */}
          {todaysProjectTasks.filter(t => t.status !== 'Done').map((task) => {
            const project = getProject(task.projectId);
            const subProject = getSubProject(task.subProjectId);
            return (
              <div
                key={task.id}
                className={`group rounded-xl px-4 py-3 transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const statusOrder: WorkItemStatus[] = ['Backlog', 'In Progress', 'Done'];
                      const currentIndex = statusOrder.indexOf(task.status);
                      updateTaskStatus(task.id, statusOrder[(currentIndex + 1) % statusOrder.length]);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'bg-slate-200 text-slate-400 dark:bg-gray-500/20 dark:text-gray-500'
                    }`}
                    title={task.status}
                  >
                    {task.status === 'In Progress' ? <Play size={8} fill="currentColor" /> : <Circle size={12} />}
                  </button>
                  <h3
                    onClick={() => handleEditProjectTask(task)}
                    className={`flex-1 font-medium truncate cursor-pointer hover:opacity-80 text-slate-800 dark:text-white`}
                  >
                    {task.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/projects'); }}
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 cursor-pointer hover:ring-1 transition-all bg-violet-50 text-violet-600 hover:ring-violet-300 dark:bg-violet-500/15 dark:text-violet-400 dark:hover:ring-violet-500/40`}
                    title="Go to Projects"
                  >
                    {project?.title}{subProject ? ` → ${subProject.title}` : ''}
                  </button>
                  {task.priority === 'High' && <Flame size={14} className="flex-shrink-0 text-red-500" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProjectTaskFromToday(task.id); }}
                    className={`p-3 rounded-lg transition-all flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
                      'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-500/20'
                    }`}
                    title="Remove from Today"
                    aria-label={`Remove "${task.title}" from Today`}
                  >
                    <CalendarMinus size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Regular tasks — flat list, no category grouping */}
          {allTodayPending.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteWithUndo}
              onEdit={handleEdit}
              onRemoveFromToday={removeFromToday}
              isInTodayView={true}
            />
          ))}

          {/* Quick add from backlog — expandable */}
          <BacklogPicker
            tasks={getSuggestedTasks()}
            onAdd={addToToday}
          />

          {/* Completed tasks — subtle, at bottom */}
          {(allTodayCompleted.length > 0 || todaysProjectTasks.filter(t => t.status === 'Done').length > 0) && (
            <p className={`text-xs pt-2 text-slate-400 dark:text-gray-600`}>
              {allTodayCompleted.length + todaysProjectTasks.filter(t => t.status === 'Done').length} completed today
            </p>
          )}
        </div>
      )}

      {/* ── STATS STRIP: compact on mobile, detailed on md+ ── */}
      <div className={`rounded-2xl border p-3 bg-white border-slate-200 dark:bg-white/[0.04] dark:border-white/[0.08]`}>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <div
            className="flex flex-col items-center gap-1 text-center"
            title={`You earn XP by completing tasks, logging habits and progressing goals. Every ${levelProgress.xpPerLevel} XP is one level.`}
          >
            <Crown className={`w-4 h-4 text-violet-500 dark:text-violet-400`} />
            <span className={`text-lg font-bold text-violet-700 dark:text-violet-300`}>{getTotalLevel()}</span>
            <span className={`text-xs text-slate-500 dark:text-gray-500`}>Level</span>
            <div className={`w-full ${statsExpanded ? '' : 'hidden'} md:block`}>
              <div
                className={`mt-1 h-1 rounded-full overflow-hidden bg-violet-200 dark:bg-violet-500/20`}
                role="progressbar"
                aria-valuenow={Math.round(levelProgress.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${levelProgress.xpToNextLevel} XP to level ${getTotalLevel() + 1}`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 bg-violet-500 dark:bg-violet-400`}
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <p className={`text-xs mt-1 text-violet-500/60 dark:text-violet-400/50`}>{getTitle()}</p>
              <p className={`text-xs text-violet-500/60 dark:text-violet-400/50`}>
                {levelProgress.xpToNextLevel} XP to level {getTotalLevel() + 1}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <CheckSquare className={`w-4 h-4 text-blue-500 dark:text-blue-400`} />
            <span className={`text-lg font-bold text-blue-700 dark:text-blue-300`}>{totalTodayDone}/{totalTodayTasks}</span>
            <span className={`text-xs text-slate-500 dark:text-gray-500`}>Tasks</span>
            <p className={`text-xs ${statsExpanded ? '' : 'hidden'} md:block text-blue-500/60 dark:text-blue-400/50`}>done today</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Flame className={`w-4 h-4 text-orange-500 dark:text-orange-400`} />
            <span className={`text-lg font-bold text-orange-700 dark:text-orange-300`}>{userStats.currentStreak}</span>
            <span className={`text-xs text-slate-500 dark:text-gray-500`}>Streak</span>
            <p className={`text-xs ${statsExpanded ? '' : 'hidden'} md:block text-orange-500/60 dark:text-orange-400/50`}>days</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Trophy className={`w-4 h-4 text-amber-500 dark:text-amber-400`} />
            <span className={`text-lg font-bold text-amber-700 dark:text-amber-300`}>{getUnlockedAchievements().length}</span>
            <span className={`text-xs text-slate-500 dark:text-gray-500`}>Badges</span>
            <p className={`text-xs ${statsExpanded ? '' : 'hidden'} md:block text-amber-500/60 dark:text-amber-400/50`}>unlocked</p>
          </div>
        </div>
        {habitCheckInStats.totalHabits > 0 && (
          <p className={`mt-3 text-center text-xs text-slate-500 dark:text-gray-500`}>
            {habitCheckInStats.todayCompletedCount}/{habitCheckInStats.totalHabits} habits done today
          </p>
        )}
        <button
          type="button"
          onClick={() => setStatsExpanded(prev => !prev)}
          className={`md:hidden w-full mt-2 text-xs font-medium text-slate-500 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-400`}
        >
          {statsExpanded ? '▲ Less' : '▼ More'}
        </button>
      </div>

      {/* ── SUGGESTED FOR YOU (pattern-based) ───────────────── */}
      {suggestionGroups.length > 0 && (
        <div className={`rounded-xl border overflow-hidden bg-white border-slate-200 dark:bg-white/[0.03] dark:border-white/10`}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Sparkles size={18} className={'text-amber-500 dark:text-amber-400'} />
            <span className={`text-sm font-semibold text-slate-800 dark:text-white`}>Suggested for you</span>
          </div>
          <div className="divide-y divide-white/5">
            {suggestionGroups.map((group) => (
              <div key={group.label} className="p-3">
                <p className={`text-xs font-medium mb-2 flex items-center gap-2 text-slate-500 dark:text-gray-500`}>
                  <group.icon size={12} />
                  {group.label} ({group.tasks.length})
                </p>
                <div className="space-y-2">
                  {group.tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-slate-50 dark:bg-white/5`}
                    >
                      <span className={`text-sm truncate flex-1 text-slate-700 dark:text-gray-300`}>{task.title}</span>
                      <button
                        type="button"
                        onClick={() => addToToday(task.id)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg flex-shrink-0 transition-colors ${
                          'bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
                        }`}
                      >
                        Add to Today
                      </button>
                    </div>
                  ))}
                  {group.tasks.length > 4 && (
                    <p className={`text-xs pl-3 text-slate-400 dark:text-gray-600`}>+{group.tasks.length - 4} more in backlog</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WEEKLY REVIEW (richer summary) ──────────── */}
      <div
        onClick={() => navigate('/review')}
        className={`rounded-xl px-4 py-3 cursor-pointer transition-all ${
          isDark ? 'bg-slate-500/5 border border-white/5 hover:border-white/10 hover:bg-slate-500/10' : 'bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-slate-200/70 dark:bg-slate-500/15`}>
              <Calendar className={`w-3.5 h-3.5 text-slate-500 dark:text-gray-400`} />
            </div>
            <div>
              <span className={`text-sm font-medium text-slate-700 dark:text-gray-300`}>This Week</span>
              <span className={`text-xs ml-2 text-slate-400 dark:text-gray-600`}>
                {weeklyProfessionalReview.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weeklyProfessionalReview.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-slate-200/70 text-slate-500 dark:bg-white/5 dark:text-gray-500`}>View full review →</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className={'text-emerald-500 dark:text-emerald-400'} />
            <span className={'text-slate-600 dark:text-gray-400'}>
              <span className={`font-semibold text-emerald-600 dark:text-emerald-400`}>{weeklyProfessionalReview.completed.length}</span> completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ListTodo size={12} className={'text-blue-500 dark:text-blue-400'} />
            <span className={'text-slate-600 dark:text-gray-400'}>
              <span className={`font-semibold text-blue-600 dark:text-blue-400`}>{weeklyProfessionalReview.backlog.length}</span> pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={12} className={'text-orange-500 dark:text-orange-400'} />
            <span className={'text-slate-600 dark:text-gray-400'}>
              <span className={`font-semibold text-orange-600 dark:text-orange-400`}>{userStats.currentStreak}</span> day streak
            </span>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <Zap size={12} className={'text-violet-500 dark:text-violet-400'} />
              <span className={`truncate text-slate-600 dark:text-gray-400`}>
                {projects.filter(p => p.status === 'Active').length} active project{projects.filter(p => p.status === 'Active').length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── BRIEFING / QUOTE OF THE DAY — quiet closing line ── */}
      <div className={`flex items-start gap-3 text-slate-600 dark:text-gray-300`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${
          'bg-violet-50 dark:bg-violet-500/10'
        }`}>
          {morningBriefing || briefingLoading
            ? <Bot className={`w-4 h-4 text-violet-500 dark:text-violet-400`} />
            : <Quote className={`w-4 h-4 text-violet-500 dark:text-violet-400`} />
          }
        </div>
        <div className="flex-1 min-w-0">
          {briefingLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm text-slate-500 dark:text-gray-400`}>Generating your morning briefing...</p>
            </div>
          ) : morningBriefing ? (
            <>
              <div
                className={`text-sm leading-relaxed space-y-1 text-slate-600 dark:text-gray-300`}
                dangerouslySetInnerHTML={{ __html: formatAIText(morningBriefing) }}
              />
              <div className="flex items-center gap-3 mt-2">
                <p className={`text-xs text-violet-500/80 dark:text-violet-400/70`}>— AI Coach</p>
                <button
                  onClick={() => generateBriefing(true)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                    'text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:text-gray-500 dark:hover:text-violet-400 dark:hover:bg-violet-500/10'
                  }`}
                >
                  <RefreshCw size={10} />
                  Regenerate
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={`text-sm leading-relaxed italic text-slate-600 dark:text-gray-300`}>
                "{quote.text}"
              </p>
              <p className={`text-xs mt-1 text-violet-500/80 dark:text-violet-400/70`}>— {quote.author}</p>
            </>
          )}
        </div>
      </div>

      <TaskForm
        isOpen={isTaskFormOpen}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        onCancel={handleCloseForm}
        goals={goals}
        editingTask={editingTask}
        defaultAddToToday={true}
      />

      <DailyCheckIn
        isOpen={isCheckInOpen}
        existingLog={getTodaysDailyLog()}
        onSubmit={(data) => {
          createOrUpdateLog(new Date(), data);
          setIsCheckInOpen(false);
        }}
        onCancel={() => setIsCheckInOpen(false)}
      />

      {/* XP Animation */}
      {xpAnimation.show && (
        <XPAnimation 
          xp={xpAnimation.xp} 
          onComplete={() => setXpAnimation({ show: false, xp: 0 })} 
        />
      )}

      {/* Daily Login Bonus Notification */}
      {dailyBonusResult?.show && (
        <div
          className="fixed below-header inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[70] animate-slide-down"
          onClick={() => setDailyBonusResult(null)}
        >
          <div 
            className={`flex items-center space-x-3 p-4 rounded-2xl shadow-elevated max-w-sm mx-auto ${
              'bg-white/95 backdrop-blur border border-violet-200 dark:bg-[#1a1a2e]/95 dark:border-violet-500/30'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
              'bg-violet-100 dark:bg-violet-500/20'
            }`}>
              🌅
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium text-violet-600 dark:text-violet-400`}>
                Welcome Back! Daily Bonus
              </p>
              <h4 className={`text-lg font-bold text-slate-800 dark:text-white`}>
                +{dailyBonusResult.xp} XP
              </h4>
              <div className="flex items-center space-x-2">
                <span className={`text-xs text-slate-500 dark:text-gray-400`}>
                  🔥 {dailyBonusResult.streak} day streak
                </span>
                {dailyBonusResult.multiplier > 1 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                  }`}>
                    {dailyBonusResult.multiplier}x bonus
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setDailyBonusResult(null)}
              className={`p-2 rounded-lg transition-colors ${
                'hover:bg-slate-100 text-slate-400 dark:hover:bg-white/10 dark:text-gray-400'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Achievement Unlock Notification */}
      {recentUnlocks.length > 0 && (
        <div className="fixed bottom-24 right-4 md:bottom-4 z-50 space-y-2 animate-slide-up">
          {recentUnlocks.map((achievement) => (
            <div 
              key={achievement.id}
              className={`flex items-center space-x-3 p-4 rounded-2xl shadow-elevated max-w-sm ${
                'bg-amber-50 border border-amber-200 dark:bg-amber-500/20 dark:border-amber-500/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                'bg-amber-100 dark:bg-amber-500/20'
              }`}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium text-amber-600 dark:text-amber-400`}>
                  🎉 Achievement Unlocked!
                </p>
                <h4 className={`font-semibold text-slate-800 dark:text-white`}>
                  {achievement.name}
                </h4>
                <p className={`text-xs text-slate-500 dark:text-gray-400`}>
                  +{achievement.xpReward} XP
                </p>
              </div>
              <button
                onClick={clearRecentUnlocks}
                className={`p-2 rounded-lg transition-colors ${
                  'hover:bg-slate-100 text-slate-400 dark:hover:bg-white/10 dark:text-gray-400'
                }`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Plan Your Day Modal */}
      <PlanYourDay
        isOpen={isPlanYourDayOpen}
        onClose={handleClosePlanYourDay}
        todaysTasks={todaysTasks}
        suggestedTasks={getSuggestedTasks()}
        onAddToToday={addToToday}
        onRemoveFromToday={removeFromToday}
        todaysProjectTasks={todaysProjectTasks}
        onRemoveProjectTaskFromToday={removeProjectTaskFromToday}
      />

      {/* Edit Project Task Modal */}
      <ExpandableModal
        isOpen={!!editingProjectTask}
        onClose={() => setEditingProjectTask(null)}
        title="Edit Task"
        icon={<Pencil className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setEditingProjectTask(null)}
              className={`px-4 py-2 rounded-xl transition-colors text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10`}
            >
              Cancel
            </button>
            <button onClick={handleSaveProjectTask} className="btn-primary px-4 py-2 rounded-xl">Save</button>
          </div>
        }
      >
        {(isFS) => {
          if (!editingProjectTask) return null;
          const inputCls = `w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
            'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 dark:text-white'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-slate-600 dark:text-gray-400`}>Title</label>
              <input type="text" value={projectTaskForm.title} onChange={(e) => setProjectTaskForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 text-slate-600 dark:text-gray-400`}>Notes</label>
              <TiptapEditor content={projectTaskForm.description} onChange={(val) => setProjectTaskForm(prev => ({ ...prev, description: val }))} placeholder="Add notes, checklists, or details..." />
            </div>
          );
          const statusSelector = (
            <div>
              <label className={`block text-sm font-medium mb-2 text-slate-600 dark:text-gray-400`}>Status</label>
              <div className={`flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10`}>
                {(['Backlog', 'In Progress', 'Done'] as const).map((status) => (
                  <button key={status} onClick={() => updateTaskStatus(editingProjectTask.id, status)} className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${editingProjectTask.status === status ? status === 'Done' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : status === 'In Progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-700 dark:bg-gray-500/20 dark:text-gray-300' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'}`}>{status}</button>
                ))}
              </div>
            </div>
          );
          const projectInfo = (
            <div className={`p-3 rounded-xl bg-slate-50 dark:bg-white/5`}>
              <p className={`text-xs text-slate-500 dark:text-gray-500`}>Project</p>
              <p className={`text-sm font-medium text-slate-700 dark:text-gray-300`}>
                {getProject(editingProjectTask.projectId)?.title} → {getSubProject(editingProjectTask.subProjectId)?.title}
              </p>
            </div>
          );

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r border-slate-200 dark:border-white/10`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-6 bg-white dark:bg-white/[0.02]`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-slate-400 dark:text-gray-500`}>Details</h3>
                {statusSelector}
                {projectInfo}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {titleInput}
              {notesInput}
              {statusSelector}
              {projectInfo}
            </div>
          );
        }}
      </ExpandableModal>
    </div>
  );
}
