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
import { WeeklyChallenges } from '../components/gamification/WeeklyChallenges';
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

function BacklogPicker({ tasks, onAdd, isDark }: { tasks: Task[]; onAdd: (id: string) => void; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  if (tasks.length === 0) return null;

  const filtered = search.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;
  const visible = expanded ? filtered : filtered.slice(0, 4);

  return (
    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          Add from backlog ({tasks.length})
        </p>
        {tasks.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-600'}`}
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
          className={`w-full px-3 py-1.5 mb-2 rounded-lg text-xs outline-none ${
            isDark ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600' : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
          }`}
        />
      )}
      <div className={`space-y-1 ${expanded ? 'max-h-60 overflow-y-auto' : ''}`}>
        {visible.map(task => (
          <button
            key={task.id}
            onClick={() => onAdd(task.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
              isDark
                ? 'text-gray-400 hover:bg-violet-500/10 hover:text-violet-400'
                : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'
            }`}
          >
            <Plus size={12} className="flex-shrink-0" />
            <span className="truncate flex-1">{task.title}</span>
            <span className={`text-[10px] flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{task.category}</span>
          </button>
        ))}
        {expanded && filtered.length === 0 && search && (
          <p className={`text-xs py-2 text-center ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks match "{search}"</p>
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
      
      // Show Plan Your Day modal if not seen today
      if (!hasSeenPlanYourDay()) {
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
      createTask(task.title, task.description, task.category, task.priority, task.effort, task.isRecurring, task.recurrencePattern, task.specificDays, task.goalId, task.dueDate);
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
    <div ref={containerRef} className="space-y-5">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Notification status */}
      {(() => {
        const status = getPermissionStatus();
        if (status === 'unsupported') return null;
        if (status === 'granted' && !showNotifBanner) return null;
        return (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
            status === 'denied'
              ? isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
              : isDark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'
          }`}>
            <div>
              <p className={`text-sm font-medium ${
                status === 'denied'
                  ? isDark ? 'text-red-300' : 'text-red-700'
                  : isDark ? 'text-violet-300' : 'text-violet-700'
              }`}>
                {status === 'denied'
                  ? 'Notifications blocked'
                  : 'Enable notifications for habit reminders'}
              </p>
              {status === 'denied' && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400/60' : 'text-red-500/60'}`}>
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
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowNotifBanner(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Test
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── HERO BANNER: greeting + quote + actions ──── */}
      <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/[0.12] via-purple-500/[0.06] to-indigo-500/[0.12] border border-violet-500/20'
          : 'bg-gradient-to-br from-violet-100/60 via-white/70 to-indigo-50/60 border border-white/80'
      }`} style={{ boxShadow: isDark ? '0 4px 24px rgba(139, 92, 246, 0.08), inset 0 0 0 0.5px rgba(255,255,255,0.06)' : '0 4px 24px rgba(139, 92, 246, 0.06), inset 0 0 0 0.5px rgba(255,255,255,0.8)' }}>
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-300/30'}`} />
          <div className={`absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl ${isDark ? 'bg-indigo-500/12' : 'bg-indigo-300/25'}`} />
        </div>

        <div className="relative px-4 py-4 sm:px-6 sm:py-5">
          {/* Top: greeting + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Kage {greetingEmoji}
              </h1>
              <p className={`mt-0.5 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {totalTodayTasks > 0 && (
                  <span className={isDark ? 'text-violet-400' : 'text-violet-600'}> · {totalTodayDone} of {totalTodayTasks} done</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenPlanYourDay}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isDark
                    ? 'bg-white/10 text-gray-300 hover:bg-white/15'
                    : 'bg-white/70 text-slate-600 hover:bg-white'
                }`}
              >
                <ListPlus size={16} />
                <span>Plan Day</span>
                {getSuggestedTasks().length > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-200 text-violet-700'
                  }`}>{getSuggestedTasks().length}</span>
                )}
              </button>
              <button
                onClick={() => setIsTaskFormOpen(true)}
                className="btn-primary px-4 py-2 rounded-xl flex items-center space-x-1.5 text-sm"
              >
                <Plus size={16} />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Morning Briefing / Quote of the day */}
          <div className={`flex items-start gap-3 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
              isDark ? 'bg-violet-500/20' : 'bg-violet-100'
            }`}>
              {morningBriefing || briefingLoading
                ? <Bot className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                : <Quote className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              }
            </div>
            <div className="flex-1 min-w-0">
              {briefingLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Generating your morning briefing...</p>
                </div>
              ) : morningBriefing ? (
                <>
                  <div className={`text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                    {morningBriefing}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className={`text-xs ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>— AI Coach</p>
                    <button
                      onClick={() => generateBriefing(true)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-colors ${
                        isDark ? 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/10' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                      }`}
                    >
                      <RefreshCw size={10} />
                      Regenerate
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={`text-sm leading-relaxed italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                    "{quote.text}"
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>— {quote.author}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE HERO CARD: at-a-glance summary ── */}
      <div className={`md:hidden rounded-2xl p-4 backdrop-blur-xl ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/[0.12] via-purple-500/[0.08] to-indigo-500/[0.12] border border-violet-500/20'
          : 'bg-gradient-to-br from-violet-100/50 via-white/60 to-indigo-50/50 border border-white/70'
      }`} style={{ boxShadow: isDark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.06)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.8)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className={`w-6 h-6 ${userStats.currentStreak > 7 ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            <div>
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.currentStreak}</span>
              <span className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>day streak</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Circular progress ring */}
            <div className="relative flex items-center justify-center">
              <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" className={isDark ? 'stroke-white/10' : 'stroke-slate-200'} />
                <circle
                  cx="22" cy="22" r="18" fill="none" strokeWidth="3" strokeLinecap="round"
                  className={isDark ? 'stroke-violet-400' : 'stroke-violet-500'}
                  strokeDasharray={`${totalTodayTasks > 0 ? (totalTodayDone / totalTodayTasks) * 113.1 : 0} 113.1`}
                />
              </svg>
              <span className={`absolute text-[10px] font-bold ${isDark ? 'text-violet-300' : 'text-violet-600'}`}>
                {totalTodayDone}/{totalTodayTasks}
              </span>
            </div>
            <div className="text-right">
              <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {totalTodayDone}/{totalTodayTasks} <span className={isDark ? 'text-gray-500' : 'text-slate-500'}>done</span>
              </p>
              {habitCheckInStats.totalHabits > 0 && (
                <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  {habitCheckInStats.todayCompletedCount}/{habitCheckInStats.totalHabits} habits
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW: collapsible on mobile, full on md+ ────────────── */}
      {/* Mobile: compact row when collapsed, tap to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setStatsExpanded(prev => !prev)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setStatsExpanded(prev => !prev); }}
        className={`md:hidden ${statsExpanded ? 'hidden' : ''} grid grid-cols-4 gap-2 rounded-2xl border p-2.5 transition-colors backdrop-blur-xl ${
          isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/60 border-white/70'
        }`}
        style={{ boxShadow: isDark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.05)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.7)' }}
      >
        <div className="flex flex-col items-center gap-0.5 py-1">
          <Crown className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          <span className={`text-sm font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{getTotalLevel()}</span>
          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Level</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-1">
          <CheckSquare className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <span className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{totalTodayDone}/{totalTodayTasks}</span>
          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Tasks</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-1">
          <Flame className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
          <span className={`text-sm font-bold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>{userStats.currentStreak}</span>
          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Streak</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-1">
          <Trophy className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <span className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{getUnlockedAchievements().length}</span>
          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Badges</span>
        </div>
      </div>
      {/* Desktop: always full cards. Mobile: full cards only when expanded */}
      {statsExpanded && (
        <button
          type="button"
          onClick={() => setStatsExpanded(false)}
          className={`md:hidden text-xs font-medium mb-1 ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-slate-500 hover:text-slate-600'}`}
        >
          ▼ Collapse stats
        </button>
      )}
      <div className={`gap-3 ${statsExpanded ? 'grid' : 'hidden md:grid'} grid-cols-2 sm:grid-cols-4`}>
        {/* The level number meant nothing on its own: nothing said where XP
            comes from or how close the next level was. */}
        <div
          className={`rounded-xl px-4 py-3 ${isDark ? 'bg-violet-500/10 border border-violet-500/15' : 'bg-violet-50 border border-violet-100'}`}
          title={`You earn XP by completing tasks, logging habits and progressing goals. Every ${levelProgress.xpPerLevel} XP is one level.`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Crown className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className={`text-xs ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>Level</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{getTotalLevel()}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-violet-400/50' : 'text-violet-500/60'}`}>{getTitle()}</p>
          <div
            className={`mt-2 h-1 rounded-full overflow-hidden ${isDark ? 'bg-violet-500/20' : 'bg-violet-200'}`}
            role="progressbar"
            aria-valuenow={Math.round(levelProgress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${levelProgress.xpToNextLevel} XP to level ${getTotalLevel() + 1}`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${isDark ? 'bg-violet-400' : 'bg-violet-500'}`}
              style={{ width: `${levelProgress.percent}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-violet-400/50' : 'text-violet-500/60'}`}>
            {levelProgress.xpToNextLevel} XP to level {getTotalLevel() + 1}
          </p>
        </div>
        <div className={`rounded-xl px-4 py-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-xs ${isDark ? 'text-blue-400/70' : 'text-blue-500/80'}`}>Tasks</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{totalTodayDone}/{totalTodayTasks}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-blue-400/50' : 'text-blue-500/60'}`}>done today</p>
        </div>
        <div className={`rounded-xl px-4 py-3 ${isDark ? 'bg-orange-500/10 border border-orange-500/15' : 'bg-orange-50 border border-orange-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            <span className={`text-xs ${isDark ? 'text-orange-400/70' : 'text-orange-500/80'}`}>Streak</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>{userStats.currentStreak}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-orange-400/50' : 'text-orange-500/60'}`}>days</p>
        </div>
        <div className={`rounded-xl px-4 py-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/15' : 'bg-amber-50 border border-amber-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-500/80'}`}>Badges</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{getUnlockedAchievements().length}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-amber-400/50' : 'text-amber-500/60'}`}>unlocked</p>
        </div>
      </div>

      {/* ── WEEKLY CHALLENGES ── */}
      <WeeklyChallenges />

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
            isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            <div className="flex-1">
              <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs ml-2 ${isDark ? 'text-red-400/60' : 'text-red-500/60'}`}>
                {overdueTasks.slice(0, 3).map(t => t.title).join(', ')}{overdueTasks.length > 3 ? ` +${overdueTasks.length - 3} more` : ''}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── SUGGESTED FOR YOU (pattern-based) ───────────────── */}
      {suggestionGroups.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Sparkles size={18} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Suggested for you</span>
          </div>
          <div className="divide-y divide-white/5">
            {suggestionGroups.map((group) => (
              <div key={group.label} className="p-3">
                <p className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  <group.icon size={12} />
                  {group.label} ({group.tasks.length})
                </p>
                <div className="space-y-1.5">
                  {group.tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}
                    >
                      <span className={`text-sm truncate flex-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{task.title}</span>
                      <button
                        type="button"
                        onClick={() => addToToday(task.id)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors ${
                          isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        }`}
                      >
                        Add to Today
                      </button>
                    </div>
                  ))}
                  {group.tasks.length > 4 && (
                    <p className={`text-[10px] pl-3 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>+{group.tasks.length - 4} more in backlog</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TODAY'S TASKS — the hero section ───────────────── */}
      {todaysTasks.length === 0 && todaysProjectTasks.length === 0 ? (
        <div className={`card rounded-2xl p-6 sm:p-10 text-center`}>
          <Sparkles className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>All clear!</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No tasks for today.</p>
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
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500'
                        : isDark ? 'bg-gray-500/20 text-gray-500' : 'bg-slate-200 text-slate-400'
                    }`}
                    title={task.status}
                  >
                    {task.status === 'In Progress' ? <Play size={8} fill="currentColor" /> : <Circle size={12} />}
                  </button>
                  <h3
                    onClick={() => handleEditProjectTask(task)}
                    className={`flex-1 font-medium truncate cursor-pointer hover:opacity-80 ${isDark ? 'text-white' : 'text-slate-800'}`}
                  >
                    {task.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/projects'); }}
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 cursor-pointer hover:ring-1 transition-all ${isDark ? 'bg-violet-500/15 text-violet-400 hover:ring-violet-500/40' : 'bg-violet-50 text-violet-600 hover:ring-violet-300'}`}
                    title="Go to Projects"
                  >
                    {project?.title}{subProject ? ` → ${subProject.title}` : ''}
                  </button>
                  {task.priority === 'High' && <Flame size={14} className="flex-shrink-0 text-red-500" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProjectTaskFromToday(task.id); }}
                    className={`p-2.5 rounded-lg transition-all flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
                      isDark
                        ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
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
            isDark={isDark}
          />

          {/* Completed tasks — subtle, at bottom */}
          {(allTodayCompleted.length > 0 || todaysProjectTasks.filter(t => t.status === 'Done').length > 0) && (
            <p className={`text-xs pt-2 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
              {allTodayCompleted.length + todaysProjectTasks.filter(t => t.status === 'Done').length} completed today
            </p>
          )}
        </div>
      )}

      {/* ── WEEKLY REVIEW (richer summary) ──────────── */}
      <div
        onClick={() => navigate('/review')}
        className={`rounded-xl px-4 py-3 cursor-pointer transition-all ${
          isDark ? 'bg-slate-500/5 border border-white/5 hover:border-white/10 hover:bg-slate-500/10' : 'bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-500/15' : 'bg-slate-200/70'}`}>
              <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>This Week</span>
              <span className={`text-xs ml-2 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                {weeklyProfessionalReview.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weeklyProfessionalReview.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-200/70 text-slate-500'}`}>View full review →</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
            <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>
              <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{weeklyProfessionalReview.completed.length}</span> completed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ListTodo size={12} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
            <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>
              <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{weeklyProfessionalReview.backlog.length}</span> pending
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={12} className={isDark ? 'text-orange-400' : 'text-orange-500'} />
            <span className={isDark ? 'text-gray-400' : 'text-slate-600'}>
              <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{userStats.currentStreak}</span> day streak
            </span>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap size={12} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
              <span className={`truncate ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                {projects.filter(p => p.status === 'Active').length} active project{projects.filter(p => p.status === 'Active').length !== 1 ? 's' : ''}
              </span>
            </div>
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
          className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[70] animate-slide-down"
          onClick={() => setDailyBonusResult(null)}
        >
          <div 
            className={`flex items-center space-x-3 p-4 rounded-2xl shadow-elevated max-w-sm mx-auto ${
              isDark 
                ? 'bg-[#1a1a2e]/95 backdrop-blur border border-violet-500/30' 
                : 'bg-white/95 backdrop-blur border border-violet-200'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
              isDark ? 'bg-violet-500/20' : 'bg-violet-100'
            }`}>
              🌅
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                Welcome Back! Daily Bonus
              </p>
              <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                +{dailyBonusResult.xp} XP
              </h4>
              <div className="flex items-center space-x-2">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  🔥 {dailyBonusResult.streak} day streak
                </span>
                {dailyBonusResult.multiplier > 1 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {dailyBonusResult.multiplier}x bonus
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setDailyBonusResult(null)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
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
                isDark 
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30' 
                  : 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                isDark ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  🎉 Achievement Unlocked!
                </p>
                <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {achievement.name}
                </h4>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  +{achievement.xpReward} XP
                </p>
              </div>
              <button
                onClick={clearRecentUnlocks}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
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
        icon={<Pencil className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setEditingProjectTask(null)}
              className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Cancel
            </button>
            <button onClick={handleSaveProjectTask} className="btn-primary px-4 py-2 rounded-xl">Save</button>
          </div>
        }
      >
        {(isFS) => {
          if (!editingProjectTask) return null;
          const inputCls = `w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
            isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
              <input type="text" value={projectTaskForm.title} onChange={(e) => setProjectTaskForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Notes</label>
              <TiptapEditor content={projectTaskForm.description} onChange={(val) => setProjectTaskForm(prev => ({ ...prev, description: val }))} placeholder="Add notes, checklists, or details..." />
            </div>
          );
          const statusSelector = (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status</label>
              <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['Backlog', 'In Progress', 'Done'] as const).map((status) => (
                  <button key={status} onClick={() => updateTaskStatus(editingProjectTask.id, status)} className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${editingProjectTask.status === status ? status === 'Done' ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600' : status === 'In Progress' ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600' : isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-slate-100 text-slate-700' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>{status}</button>
                ))}
              </div>
            </div>
          );
          const projectInfo = (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Project</p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {getProject(editingProjectTask.projectId)?.title} → {getSubProject(editingProjectTask.subProjectId)?.title}
              </p>
            </div>
          );

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Details</h3>
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
