import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { CheckSquare, Plus, Zap, Sparkles, Quote, Flame, ListPlus, Calendar, RotateCcw, CheckCircle2, ListTodo, Circle, Play, Pencil, Trophy, Crown, AlertTriangle } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { PlanYourDay } from '../components/tasks/PlanYourDay';
import { NotesEditor } from '../components/common/NotesEditor';
import { ExpandableModal } from '../components/common/ExpandableModal';
import { useUndo } from '../components/common/UndoToast';
import { getQuoteOfTheDay } from '../data/quotes';
import type { Task, ProjectTask, WorkItemStatus, RecurrencePattern } from '../types';

// XP Animation Component
function XPAnimation({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-xp-float text-3xl font-bold text-amber-400 drop-shadow-lg flex items-center gap-2">
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
  const { goals, linkTaskToGoal, unlinkTaskFromGoal } = useGoalContext();
  const { habits } = useHabitContext();
  const { 
    getTodaysProjectTasks, 
    updateTaskStatus, 
    updateProjectTask,
    removeTaskFromToday: removeProjectTaskFromToday,
    getProject,
    getSubProject,
  } = useProjectContext();
  const { theme } = useTheme();
  const { pushUndo } = useUndo();
  const { 
    recordTaskCompletion, 
    updateStreak, 
    checkAndUnlockAchievements,
    recentUnlocks,
    clearRecentUnlocks,
    getTotalLevel,
    getTitle,
    userStats,
    getUnlockedAchievements,
    recordDailyLogin,
    recordTaskCreated,
    hasClaimedDailyLogin,
  } = useGamification();
  const isDark = theme === 'dark';
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hasCarriedForward, setHasCarriedForward] = useState(false);
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; xp: number }>({ show: false, xp: 0 });
  const [isPlanYourDayOpen, setIsPlanYourDayOpen] = useState(false);
  const [dailyBonusResult, setDailyBonusResult] = useState<{ show: boolean; xp: number; streak: number; multiplier: number } | null>(null);
  const [editingProjectTask, setEditingProjectTask] = useState<ProjectTask | null>(null);
  const [projectTaskForm, setProjectTaskForm] = useState({ title: '', description: '' });

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

  // Get top habit streaks for the widget
  const topStreaks = habits
    .filter(h => h.streakCount > 0)
    .sort((a, b) => b.streakCount - a.streakCount)
    .slice(0, 3);

  // All hooks must be called before any early returns
  const handleToggleComplete = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
      return;
    }
    // Show XP animation for non-Professional tasks
    if (task && task.category !== 'Professional' && task.xpValue > 0) {
      setXpAnimation({ show: true, xp: task.xpValue });
    }
    completeTask(taskId);
    
    // Record in gamification system
    if (task) {
      recordTaskCompletion(task.category, task.xpValue);
      updateStreak();
      // Check for new achievements after a small delay
      setTimeout(() => {
        checkAndUnlockAchievements();
      }, 100);
    }
  }, [tasks, completeTask, uncompleteTask, recordTaskCompletion, updateStreak, checkAndUnlockAchievements]);

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
  const weeklyProfessionalReview = useMemo(() => {
    const { monday, sunday } = getWeekBounds();
    
    const completedThisWeek = tasks.filter(t => {
      if (t.status !== 'Completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return completedDate >= monday && completedDate <= sunday;
    });
    
    const backlog = tasks.filter(t => 
      t.status === 'Pending' || t.status === 'Carried Forward'
    );
    
    const carriedForward = tasks.filter(t => 
      t.status === 'Carried Forward'
    );
    
    return {
      completed: completedThisWeek,
      backlog,
      carriedForward,
      weekStart: monday,
      weekEnd: sunday,
    };
  }, [tasks, getWeekBounds]);

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
  
  // Early return AFTER all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todaysTasks = getTodaysTasks();
  const carriedForwardCount = todaysTasks.filter(t => t.status === 'Carried Forward').length;
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

  const greetingEmoji = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  })();

  return (
    <div className="space-y-5">
      {/* ── HERO BANNER: greeting + quote + actions ──── */}
      <div className={`relative overflow-hidden rounded-2xl ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border border-violet-500/15'
          : 'bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50 border border-violet-100'
      }`}>
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-200/40'}`} />
          <div className={`absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-3xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-200/30'}`} />
        </div>

        <div className="relative px-6 py-5">
          {/* Top: greeting + actions */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Kage {greetingEmoji}
              </h1>
              <p className={`mt-0.5 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {todaysTasks.length > 0 && (
                  <span className={isDark ? 'text-violet-400' : 'text-violet-600'}> · {allTodayCompleted.length}/{todaysTasks.length} done</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Quote of the day */}
          <div className={`flex items-start gap-3 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
              isDark ? 'bg-violet-500/20' : 'bg-violet-100'
            }`}>
              <Quote className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <div>
              <p className={`text-sm leading-relaxed italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                "{quote.text}"
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>— {quote.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW: colorful, compact ────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <div className={`rounded-xl px-4 py-3 ${isDark ? 'bg-violet-500/10 border border-violet-500/15' : 'bg-violet-50 border border-violet-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Crown className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className={`text-xs ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>Level</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{getTotalLevel()}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-violet-400/50' : 'text-violet-500/60'}`}>{getTitle()}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-xs ${isDark ? 'text-blue-400/70' : 'text-blue-500/80'}`}>Tasks</span>
          </div>
          <div className={`text-xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{todaysTasks.length}</div>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-blue-400/50' : 'text-blue-500/60'}`}>{carriedForwardCount ? `${carriedForwardCount} carried` : 'today'}</p>
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

      {/* ── HABIT STREAKS (compact inline, only if present) ── */}
      {topStreaks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Flame className={`w-3.5 h-3.5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
          {topStreaks.map((habit) => (
            <span
              key={habit.id}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                isDark ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15' : 'bg-orange-50 text-orange-600 border border-orange-100'
              }`}
            >
              {habit.name} <strong>{habit.streakCount}d</strong>
            </span>
          ))}
        </div>
      )}

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

      {/* ── TODAY'S TASKS — the hero section ───────────────── */}
      {todaysTasks.length === 0 && todaysProjectTasks.length === 0 ? (
        <div className={`card rounded-2xl p-10 text-center`}>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                    {project?.title}{subProject ? ` → ${subProject.title}` : ''}
                  </span>
                  {task.priority === 'High' && <Flame size={14} className="flex-shrink-0 text-red-500" />}
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

      {/* ── COMPACT STATS ROW ────────────────────────────── */}
      <div className={`grid grid-cols-4 gap-3`}>
        {[
          { label: 'Level', value: `${getTotalLevel()}`, sub: getTitle(), color: 'violet' },
          { label: 'Tasks', value: `${todaysTasks.length}`, sub: `${carriedForwardCount ? `${carriedForwardCount} carried` : 'today'}`, color: 'blue' },
          { label: 'Streak', value: `${userStats.currentStreak}`, sub: 'days', color: 'orange' },
          { label: 'Achievements', value: `${getUnlockedAchievements().length}`, sub: 'unlocked', color: 'amber' },
        ].map(({ label, value, sub }) => (
          <div key={label} className={`card rounded-xl px-4 py-3`}>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{sub}</p>
          </div>
        ))}
      </div>


      {/* ── WEEKLY REVIEW (compact summary) ──────────── */}
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
        isDark ? 'bg-slate-500/5 border border-white/5' : 'bg-slate-50 border border-slate-100'
      }`}>
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
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className={`flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <CheckCircle2 size={12} /> {weeklyProfessionalReview.completed.length}
          </span>
          <span className={`flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
            <ListTodo size={12} /> {weeklyProfessionalReview.backlog.length}
          </span>
          {weeklyProfessionalReview.carriedForward.length > 0 && (
            <span className={`flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
              <RotateCcw size={12} /> {weeklyProfessionalReview.carriedForward.length}
            </span>
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

      {/* XP Animation */}
      {xpAnimation.show && (
        <XPAnimation 
          xp={xpAnimation.xp} 
          onComplete={() => setXpAnimation({ show: false, xp: 0 })} 
        />
      )}

      {/* Daily Login Bonus Notification */}
      {dailyBonusResult?.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div 
            className={`flex items-center space-x-4 p-5 rounded-2xl shadow-elevated max-w-md ${
              isDark 
                ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30' 
                : 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200'
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
              isDark ? 'bg-violet-500/20' : 'bg-violet-100'
            }`}>
              🌅
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                Welcome Back! Daily Bonus
              </p>
              <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                +{dailyBonusResult.xp} XP
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  🔥 {dailyBonusResult.streak} day streak
                </span>
                {dailyBonusResult.multiplier > 1 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
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
        <div className="fixed bottom-4 right-4 z-50 space-y-2 animate-slide-up">
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
              <NotesEditor value={projectTaskForm.description} onChange={(val) => setProjectTaskForm(prev => ({ ...prev, description: val }))} placeholder={'Add notes, checklists, or details...\n\nTip: Type "- " for bullets, "[] " for checklists'} minRows={isFS ? 12 : 4} maxRows={isFS ? 26 : 12} />
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
