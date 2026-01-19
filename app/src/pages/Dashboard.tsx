import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { CheckSquare, Plus, Zap, TrendingUp, Clock, Sparkles, Quote, Flame, Gamepad2, Coffee, ListPlus, Briefcase, User, DollarSign, ChevronDown, ChevronRight, Calendar, RotateCcw, CheckCircle2, ListTodo, FolderKanban, Circle, Play, Pencil, Trash2, CalendarMinus, ExternalLink } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { PlanYourDay } from '../components/tasks/PlanYourDay';
import { getQuoteOfTheDay } from '../data/quotes';
import type { Task, TaskCategory, ProjectTask, WorkItemStatus } from '../types';

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
    getTotalXP,
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
    deleteProjectTask,
    removeTaskFromToday: removeProjectTaskFromToday,
    getProject,
    getSubProject,
  } = useProjectContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hasCarriedForward, setHasCarriedForward] = useState(false);
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; xp: number }>({ show: false, xp: 0 });
  const [isPlanYourDayOpen, setIsPlanYourDayOpen] = useState(false);
  // Collapsed state for task categories - Professional expanded by default
  const [collapsedCategories, setCollapsedCategories] = useState<Set<TaskCategory>>(
    new Set(['Personal', 'Financial'])
  );
  const [isProjectTasksCollapsed, setIsProjectTasksCollapsed] = useState(false);
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

  // Toggle category collapse
  const toggleCategoryCollapse = useCallback((category: TaskCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

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
  }, [tasks, completeTask, uncompleteTask]);

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

  // Weekly professional tasks review
  const weeklyProfessionalReview = useMemo(() => {
    const { monday, sunday } = getWeekBounds();
    
    const professionalTasks = tasks.filter(t => t.category === 'Professional');
    
    const completedThisWeek = professionalTasks.filter(t => {
      if (t.status !== 'Completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return completedDate >= monday && completedDate <= sunday;
    });
    
    const backlog = professionalTasks.filter(t => 
      t.status === 'Pending' || t.status === 'Carried Forward'
    );
    
    const carriedForward = professionalTasks.filter(t => 
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
      
      // Show Plan Your Day modal if not seen today
      if (!hasSeenPlanYourDay()) {
        setIsPlanYourDayOpen(true);
      }
    }
  }, [loading, hasCarriedForward, carryForwardTasks, hasSeenPlanYourDay]);
  
  // Early return AFTER all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todaysTasks = getTodaysTasks();
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const totalXP = getTotalXP();
  const carriedForwardCount = todaysTasks.filter(t => t.status === 'Carried Forward').length;
  const quote = getQuoteOfTheDay();

  const handleCreateTask = (data: {
    title: string;
    description: string;
    category: 'Personal' | 'Financial' | 'Professional';
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: 'daily' | 'weekly';
    goalId?: string;
    dueDate?: Date;
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
    
    setIsTaskFormOpen(false);
  };

  const handleUpdateTask = (data: {
    title: string;
    description: string;
    category: 'Personal' | 'Financial' | 'Professional';
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: 'daily' | 'weekly';
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Welcome back, Kage! 👋</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button 
          onClick={() => setIsTaskFormOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Task</span>
        </button>
      </div>

      {/* Quote of the Day Card */}
      <div className={`card rounded-2xl p-5 relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-violet-500/10 to-pink-500/10 border-violet-500/20' : 'bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200'}`}>
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
            <Quote className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>Quote of the Day</p>
            <p className={`text-base leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>"{quote.text}"</p>
            <p className={`text-sm mt-2 ${isDark ? 'text-violet-400/70' : 'text-violet-500'}`}>— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Tasks */}
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              <CheckSquare className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            {carriedForwardCount > 0 && (
              <span className="badge badge-orange">{carriedForwardCount} carried</span>
            )}
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{todaysTasks.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Tasks for today</p>
        </div>

        {/* Total XP */}
        <div className={`card card-hover rounded-2xl p-6 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </div>
            <span className="badge badge-yellow">+{todaysTasks.reduce((sum, t) => sum + t.xpValue, 0)} potential</span>
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{totalXP.toLocaleString()}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-amber-400/60' : 'text-amber-600/70'}`}>Experience points</p>
        </div>

        {/* Completed */}
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
              <TrendingUp className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{completedTasks.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Tasks completed</p>
        </div>
      </div>

      {/* Habit Streaks Widget */}
      {topStreaks.length > 0 && (
        <div className={`card rounded-2xl p-5 ${isDark ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20' : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                <Flame className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Active Streaks</h3>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Keep the momentum going!</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {topStreaks.map((habit) => (
              <div 
                key={habit.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'
                }`}
              >
                <Flame className={`w-4 h-4 ${
                  habit.streakCount >= 7 ? 'text-orange-500' : 
                  habit.streakCount >= 3 ? 'text-amber-500' : 'text-yellow-500'
                }`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>{habit.name}</span>
                <span className={`text-sm font-bold ${
                  habit.streakCount >= 7 ? 'text-orange-500' : 
                  habit.streakCount >= 3 ? 'text-amber-500' : 'text-yellow-500'
                }`}>{habit.streakCount}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Tasks Section - Work Focused */}
      <div className="card rounded-2xl overflow-hidden">
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <Clock className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Today's Tasks</h2>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{todaysTasks.length} tasks remaining</p>
            </div>
          </div>
          <button
            onClick={handleOpenPlanYourDay}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${
              isDark 
                ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' 
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
            }`}
          >
            <ListPlus size={18} />
            <span className="text-sm font-medium">Plan Day</span>
          </button>
        </div>
        
        <div className="p-6">
          {todaysTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                <Sparkles className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>All clear!</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                No tasks for today. Add a new task or take a well-deserved break!
              </p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setIsTaskFormOpen(true)}
                  className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Task
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'}`}>
                  <Gamepad2 size={16} />
                  <span className="text-sm">or relax</span>
                  <Coffee size={16} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Professional/Work Tasks - Always first and expanded */}
              {/* Project Tasks Section */}
              {todaysProjectTasks.length > 0 && (
                <div>
                  {/* Project Tasks Header */}
                  <button
                    onClick={() => setIsProjectTasksCollapsed(!isProjectTasksCollapsed)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors mb-2 ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isProjectTasksCollapsed ? (
                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                      )}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                        <FolderKanban className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                      </div>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Projects
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                        {todaysProjectTasks.length}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {todaysProjectTasks.filter(t => t.status === 'Done').length}/{todaysProjectTasks.length} done
                    </span>
                  </button>
                  
                  {/* Project Tasks List */}
                  {!isProjectTasksCollapsed && (
                    <div className="space-y-2 ml-7">
                      {todaysProjectTasks.map((task, index) => {
                        const project = getProject(task.projectId);
                        const subProject = getSubProject(task.subProjectId);
                        
                        return (
                          <div 
                            key={task.id} 
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <div className={`group p-4 rounded-xl transition-all ${
                              isDark 
                                ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                            } ${task.status === 'Done' ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                  {/* Status Toggle */}
                                  <button
                                    onClick={() => {
                                      const statusOrder: WorkItemStatus[] = ['Backlog', 'In Progress', 'Done'];
                                      const currentIndex = statusOrder.indexOf(task.status);
                                      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
                                      updateTaskStatus(task.id, nextStatus);
                                    }}
                                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                      task.status === 'Done' 
                                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-500'
                                        : task.status === 'In Progress'
                                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500'
                                        : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-slate-200 text-slate-500'
                                    }`}
                                    title={`Status: ${task.status} (click to change)`}
                                  >
                                    {task.status === 'Done' ? (
                                      <CheckCircle2 size={14} />
                                    ) : task.status === 'In Progress' ? (
                                      <Play size={10} fill="currentColor" />
                                    ) : (
                                      <Circle size={14} />
                                    )}
                                  </button>
                                  
                                  <div className="flex-1 min-w-0">
                                    {/* Title - clickable to edit */}
                                    <h3 
                                      onClick={() => handleEditProjectTask(task)}
                                      className={`font-medium cursor-pointer hover:opacity-80 ${
                                        task.status === 'Done' 
                                          ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                                          : isDark ? 'text-white' : 'text-slate-800'
                                      }`}
                                    >
                                      {task.title}
                                    </h3>
                                    
                                    {/* Description */}
                                    {task.description && (
                                      <p className={`text-sm mt-1 line-clamp-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                        {task.description}
                                      </p>
                                    )}
                                    
                                    {/* Tags and Info */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {/* Project path */}
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                                        {project?.title} → {subProject?.title}
                                      </span>
                                      
                                      {/* Status badge */}
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        task.status === 'Done' 
                                          ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                          : task.status === 'In Progress'
                                          ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                          : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {task.status}
                                      </span>
                                      
                                      {/* Priority badge */}
                                      {task.priority === 'High' && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                          <Flame size={10} className="inline mr-1" />
                                          High
                                        </span>
                                      )}
                                      
                                      {/* Tags */}
                                      {task.tags?.slice(0, 2).map(tag => (
                                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-400' : 'bg-slate-100 text-slate-500'}`}>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  {/* Remove from Today */}
                                  <button
                                    onClick={() => removeProjectTaskFromToday(task.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark 
                                        ? 'text-gray-400 hover:text-orange-400 hover:bg-orange-500/20' 
                                        : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                                    }`}
                                    title="Remove from Today"
                                  >
                                    <CalendarMinus size={18} />
                                  </button>
                                  
                                  {/* Edit */}
                                  <button
                                    onClick={() => handleEditProjectTask(task)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark 
                                        ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/20' 
                                        : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
                                    }`}
                                    title="Edit task"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  
                                  {/* Delete */}
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this task?')) {
                                        deleteProjectTask(task.id);
                                      }
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark 
                                        ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' 
                                        : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                    title="Delete task"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Regular Task Categories */}
              {(() => {
                const workTasks = todaysTasks.filter(t => t.category === 'Professional');
                const personalTasks = todaysTasks.filter(t => t.category === 'Personal');
                const financialTasks = todaysTasks.filter(t => t.category === 'Financial');
                
                const categoryConfig: { category: TaskCategory; tasks: Task[]; icon: typeof Briefcase; label: string; color: string }[] = [
                  { category: 'Professional', tasks: workTasks, icon: Briefcase, label: 'Work', color: 'gray' },
                  { category: 'Personal', tasks: personalTasks, icon: User, label: 'Personal', color: 'blue' },
                  { category: 'Financial', tasks: financialTasks, icon: DollarSign, label: 'Financial', color: 'green' },
                ];
                
                return categoryConfig.map(({ category, tasks: categoryTasks, icon: Icon, label, color }) => {
                  if (categoryTasks.length === 0) return null;
                  const isCollapsed = collapsedCategories.has(category);
                  
                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategoryCollapse(category)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors mb-2 ${
                          isDark 
                            ? 'hover:bg-white/5' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {isCollapsed ? (
                            <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                          ) : (
                            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                          )}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            color === 'gray' ? isDark ? 'bg-slate-500/20' : 'bg-slate-100' :
                            color === 'blue' ? isDark ? 'bg-blue-500/20' : 'bg-blue-50' :
                            isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              color === 'gray' ? isDark ? 'text-slate-400' : 'text-slate-500' :
                              color === 'blue' ? isDark ? 'text-blue-400' : 'text-blue-500' :
                              isDark ? 'text-emerald-400' : 'text-emerald-500'
                            }`} />
                          </div>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-white/10 text-gray-400' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {categoryTasks.length}
                          </span>
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                          {categoryTasks.filter(t => t.status === 'Completed').length}/{categoryTasks.length} done
                        </span>
                      </button>
                      
                      {/* Category Tasks */}
                      {!isCollapsed && (
                        <div className="space-y-2 ml-7">
                          {categoryTasks.map((task, index) => (
                            <div 
                              key={task.id} 
                              className="animate-fade-in"
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              <TaskCard
                                task={task}
                                onToggleComplete={handleToggleComplete}
                                onDelete={deleteTask}
                                onEdit={handleEdit}
                                onRemoveFromToday={removeFromToday}
                                isInTodayView={true}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Professional Review */}
      <div className="card rounded-2xl overflow-hidden">
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-500/20' : 'bg-slate-100'}`}>
              <Calendar className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Weekly Work Review</h2>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {weeklyProfessionalReview.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weeklyProfessionalReview.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Completed */}
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
              <CheckCircle2 className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {weeklyProfessionalReview.completed.length}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>Done</p>
            </div>
            
            {/* Backlog */}
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <ListTodo className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {weeklyProfessionalReview.backlog.length}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>Backlog</p>
            </div>
            
            {/* Carried Forward */}
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-100'}`}>
              <RotateCcw className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
              <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                {weeklyProfessionalReview.carriedForward.length}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-orange-400/70' : 'text-orange-600/70'}`}>Carried</p>
            </div>
          </div>
          
          {/* Completed This Week */}
          {weeklyProfessionalReview.completed.length > 0 && (
            <div className="mb-4">
              <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Completed This Week</span>
              </h3>
              <div className="space-y-2">
                {weeklyProfessionalReview.completed.slice(0, 5).map(task => (
                  <div 
                    key={task.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}
                  >
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    <span className={`text-sm line-through ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      {task.title}
                    </span>
                    {task.completedAt && (
                      <span className={`text-xs ml-auto ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                        {new Date(task.completedAt).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
                {weeklyProfessionalReview.completed.length > 5 && (
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    +{weeklyProfessionalReview.completed.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Backlog/In Progress */}
          {weeklyProfessionalReview.backlog.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <ListTodo size={14} className="text-blue-500" />
                <span>Backlog / In Progress</span>
              </h3>
              <div className="space-y-2">
                {weeklyProfessionalReview.backlog.slice(0, 5).map(task => (
                  <div 
                    key={task.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                      task.status === 'Carried Forward' 
                        ? 'border-orange-500' 
                        : isDark ? 'border-gray-600' : 'border-slate-300'
                    }`} />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                      {task.title}
                    </span>
                    {task.status === 'Carried Forward' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        carried
                      </span>
                    )}
                  </div>
                ))}
                {weeklyProfessionalReview.backlog.length > 5 && (
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    +{weeklyProfessionalReview.backlog.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {weeklyProfessionalReview.completed.length === 0 && weeklyProfessionalReview.backlog.length === 0 && (
            <div className="text-center py-6">
              <Briefcase className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                No professional tasks this week
              </p>
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
      />

      {/* XP Animation */}
      {xpAnimation.show && (
        <XPAnimation 
          xp={xpAnimation.xp} 
          onComplete={() => setXpAnimation({ show: false, xp: 0 })} 
        />
      )}

      {/* Plan Your Day Modal */}
      <PlanYourDay
        isOpen={isPlanYourDayOpen}
        onClose={handleClosePlanYourDay}
        todaysTasks={todaysTasks}
        suggestedTasks={getSuggestedTasks()}
        onAddToToday={addToToday}
        onRemoveFromToday={removeFromToday}
      />

      {/* Edit Project Task Modal */}
      {editingProjectTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#12121a]' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Edit Task
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={projectTaskForm.title}
                  onChange={(e) => setProjectTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Description / Notes
                </label>
                <textarea
                  value={projectTaskForm.description}
                  onChange={(e) => setProjectTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Add notes..."
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Status
                </label>
                <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  {(['Backlog', 'In Progress', 'Done'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateTaskStatus(editingProjectTask.id, status)}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                        editingProjectTask.status === status
                          ? status === 'Done'
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                            : status === 'In Progress'
                            ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                            : isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-slate-100 text-slate-700'
                          : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Info (read-only) */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Project</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                  {getProject(editingProjectTask.projectId)?.title} → {getSubProject(editingProjectTask.subProjectId)?.title}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingProjectTask(null)}
                className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProjectTask}
                className="btn-primary px-4 py-2 rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
