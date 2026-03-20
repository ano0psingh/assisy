import { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { useUndo } from '../components/common/UndoToast';
import { Plus, ListFilter, LayoutList, FolderKanban, Target, ChevronDown, ChevronRight, Grid2X2, Flame, Zap, CalendarClock, Coffee, CheckCircle2, X } from 'lucide-react';
import type { Task, TaskCategory, Goal, RecurrencePattern } from '../types';

type FilterStatus = 'all' | 'pending' | 'completed';
type ViewMode = 'list' | 'grouped' | 'matrix';
type SmartFilter = 'none' | 'overdue' | 'due_today' | 'due_week' | 'high_priority' | 'quick_wins' | 'in_today' | 'recurring';

export function Tasks() {
  const { tasks, createTask, updateTask, completeTask, uncompleteTask, deleteTask, addToToday, removeFromToday, getTodaysTasks, skipOccurrence, pauseRecurring, resumeRecurring } = useTaskContext();
  const { goals, linkTaskToGoal, unlinkTaskFromGoal } = useGoalContext();
  const { projects, createProjectTask, getSubProjectsByProject } = useProjectContext();
  const { recordTaskCompletion, updateStreak, checkAndUnlockAchievements, recordTaskCreated } = useGamification();
  
  // Get tasks already in today to determine which show the "Add to Today" button
  const todaysTasks = getTodaysTasks();
  const todayTaskIds = new Set(todaysTasks.map(t => t.id));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { pushUndo } = useUndo();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('none');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set(['unlinked']));
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Move to Project modal state
  const [isMoveToProjectOpen, setIsMoveToProjectOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSubProjectId, setSelectedSubProjectId] = useState<string>('');

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

  const todayStr = new Date().toISOString().split('T')[0];
  const nowDate = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const weekEnd = (() => { const d = new Date(nowDate); d.setDate(d.getDate() + 7); return d; })();

  const filteredTasks = tasks
    .filter(task => {
      if (statusFilter === 'pending') {
        if (task.status === 'Completed') return false;
        if (task.isRecurring) {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const dayOfMonth = today.getDate();
          if (task.pausedUntil && todayStr <= task.pausedUntil) return false;
          if (task.skippedDates?.includes(todayStr)) return false;
          if (task.recurrencePattern === 'daily') return true;
          if (task.recurrencePattern === 'weekly' || task.recurrencePattern === 'specific_days') {
            return task.specificDays?.includes(dayOfWeek) || false;
          }
          if (task.recurrencePattern === 'monthly') return dayOfMonth === (task.monthDay ?? 1);
          return false;
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
        case 'in_today': return !!(task.isFocusedToday && task.focusedDate === todayStr);
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
    specificDays?: number[];
    monthDay?: number;
    goalId?: string;
    dueDate?: Date;
  }) => {
    const newTask = createTask(data.title, data.description, data.category, data.priority, data.effort, data.isRecurring, data.recurrencePattern, data.specificDays, data.goalId, data.dueDate, data.monthDay);
    
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
    specificDays?: number[];
    monthDay?: number;
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
      specificDays: data.specificDays,
      monthDay: data.monthDay,
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

  const handleDeleteWithUndo = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    deleteTask(taskId);
    pushUndo(`"${task.title}" deleted`, () => {
      createTask(task.title, task.description, task.category, task.priority, task.effort, task.isRecurring, task.recurrencePattern, undefined, task.goalId, task.dueDate);
    });
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
    } else {
      completeTask(taskId);
      // Record in gamification system
      if (task) {
        recordTaskCompletion(task.category, task.xpValue);
        updateStreak();
        setTimeout(() => checkAndUnlockAchievements(), 100);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>All Tasks</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setIsTaskFormOpen(true)} className="btn-primary px-4 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center space-x-2 text-sm md:text-base">
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              filtersOpen || statusFilter !== 'all' || categoryFilter !== 'all'
                ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <ListFilter size={15} />
            <span>Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all' || smartFilter !== 'none') && (
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-violet-500 text-white`}>
                {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (smartFilter !== 'none' ? 1 : 0)}
              </span>
            )}
          </button>
          {(statusFilter !== 'all' || categoryFilter !== 'all' || smartFilter !== 'none') && (
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSmartFilter('none'); }}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {([
              { mode: 'list' as const, icon: LayoutList, label: 'List' },
              { mode: 'grouped' as const, icon: FolderKanban, label: 'By Goal' },
              { mode: 'matrix' as const, icon: Grid2X2, label: 'Matrix' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-all ${
                  viewMode === mode
                    ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            {filteredTasks.length}
          </span>
        </div>
      </div>
      {filtersOpen && (
        <div className={`card rounded-xl p-3 space-y-3 animate-fade-in`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Status</label>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['all', 'pending', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                      statusFilter === status
                        ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                        : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Category</label>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['all', 'Personal', 'Financial', 'Professional'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium transition-all ${
                      categoryFilter === cat
                        ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                        : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Quick</label>
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
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  smartFilter === id
                    ? id === 'overdue'
                      ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                      : isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5 bg-white/[0.02]' : 'text-slate-500 hover:bg-slate-50 bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            <ListFilter className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
          </div>
          <p className={isDark ? 'text-gray-500' : 'text-slate-500'}>No tasks found matching your filters.</p>
          <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }} className="mt-3 text-violet-500 hover:text-violet-400 text-sm font-medium">
            Clear filters
          </button>
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
                  {pendingTasks.map((task, index) => (
                    <div key={task.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                      <TaskCard
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDeleteWithUndo}
                        onEdit={handleEdit}
                        onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                        onRemoveFromToday={removeFromToday}
                        onMoveToProject={handleOpenMoveToProject}
                        showTodayActions={!todayTaskIds.has(task.id)}
                        goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                        onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined}
                        onPauseRecurring={task.isRecurring ? pauseRecurring : undefined}
                        onResumeRecurring={task.isRecurring ? resumeRecurring : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : completedTasks.length > 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No pending tasks</p>
                </div>
              ) : null}
              
              {/* Completed Tasks - Collapsible */}
              {completedTasks.length > 0 && (
                <div className={`card rounded-2xl overflow-hidden ${isDark ? 'border-emerald-500/20' : 'border-emerald-200'}`}>
                  <button
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    className={`w-full p-4 flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompletedExpanded ? (
                        <ChevronDown className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      ) : (
                        <ChevronRight className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'
                      }`}>
                        <CheckCircle2 className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Completed Tasks
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                          {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} done
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {isCompletedExpanded ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  
                  {isCompletedExpanded && (
                    <div className={`p-4 pt-0 space-y-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <div className="pt-3 space-y-2">
                        {completedTasks.map((task, index) => (
                          <div 
                            key={task.id} 
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 20}ms` }}
                          >
                            <TaskCard 
                              task={task} 
                              onToggleComplete={handleToggleComplete} 
                              onDelete={handleDeleteWithUndo}
                              onEdit={handleEdit}
                              goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : viewMode === 'matrix' ? (
        /* 2x2 Priority/Effort Matrix View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quadrant 1: High Priority, High Effort - DO FIRST (Important & Hard) */}
          <div className={`card rounded-2xl overflow-hidden ${isDark ? 'border-red-500/30' : 'border-red-200'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                    <Flame className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Do First</h3>
                </div>
                <span className={`text-xs ${isDark ? 'text-red-400/70' : 'text-red-600'}`}>High Priority • High Effort</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-red-600/70'}`}>Critical tasks that need focus time</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'High' && t.effort === 'High').length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'High' && t.effort === 'High').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} />
                ))
              )}
            </div>
          </div>

          {/* Quadrant 2: High Priority, Low Effort - QUICK WINS */}
          <div className={`card rounded-2xl overflow-hidden ${isDark ? 'border-emerald-500/30' : 'border-emerald-200'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <Zap className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Quick Wins</h3>
                </div>
                <span className={`text-xs ${isDark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>High Priority • Low Effort</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-emerald-600/70'}`}>Do these first for momentum!</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'High' && t.effort === 'Low').length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'High' && t.effort === 'Low').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} />
                ))
              )}
            </div>
          </div>

          {/* Quadrant 3: Low Priority, High Effort - SCHEDULE */}
          <div className={`card rounded-2xl overflow-hidden ${isDark ? 'border-amber-500/30' : 'border-amber-200'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                    <CalendarClock className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Schedule</h3>
                </div>
                <span className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>Low Priority • High Effort</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-amber-600/70'}`}>Plan dedicated time for these</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'High').length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'High').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} />
                ))
              )}
            </div>
          </div>

          {/* Quadrant 4: Low Priority, Low Effort - FILL TIME */}
          <div className={`card rounded-2xl overflow-hidden ${isDark ? 'border-blue-500/30' : 'border-blue-200'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <Coffee className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Fill Time</h3>
                </div>
                <span className={`text-xs ${isDark ? 'text-blue-400/70' : 'text-blue-600'}`}>Low Priority • Low Effort</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-blue-600/70'}`}>Do when you have spare moments</p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'Low').length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks</p>
              ) : (
                filteredTasks.filter(t => t.priority === 'Low' && t.effort === 'Low').map(task => (
                  <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} onDelete={handleDeleteWithUndo} onEdit={handleEdit} onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined} onRemoveFromToday={removeFromToday} onMoveToProject={handleOpenMoveToProject} showTodayActions={!todayTaskIds.has(task.id)} goalName={task.goalId ? goalMap.get(task.goalId) : undefined} onSkipOccurrence={task.isRecurring ? skipOccurrence : undefined} onPauseRecurring={task.isRecurring ? pauseRecurring : undefined} onResumeRecurring={task.isRecurring ? resumeRecurring : undefined} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Grouped by Goal View */
        <div className="space-y-4">
          {tasksGroupedByGoal.map((group, groupIndex) => {
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
              <div 
                key={goalId} 
                className={`card rounded-2xl overflow-hidden animate-fade-in`}
                style={{ animationDelay: `${groupIndex * 50}ms` }}
              >
                {/* Goal Header */}
                <button
                  onClick={() => toggleGoalExpanded(goalId)}
                  className={`w-full p-4 flex items-center justify-between transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      group.goal 
                        ? isDark ? 'bg-violet-500/20' : 'bg-violet-100'
                        : isDark ? 'bg-gray-500/20' : 'bg-slate-100'
                    }`}>
                      <Target className={`w-5 h-5 ${
                        group.goal 
                          ? isDark ? 'text-violet-400' : 'text-violet-500'
                          : isDark ? 'text-gray-400' : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {group.goal?.title || 'Unlinked Tasks'}
                        </h3>
                        {/* Sub-goals badge - more visible */}
                        {hasSubGoals && (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' 
                              : 'bg-violet-100 text-violet-700 border border-violet-200'
                          }`}>
                            <Target size={12} />
                            {group.subGoalGroups.length} sub-goal{group.subGoalGroups.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                        {totalCompleted}/{totalTasks} tasks completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Progress indicator */}
                    {group.goal && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-24 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                            style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
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
                  <div className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                    {/* Parent Goal's Direct Tasks */}
                    {group.tasks.length > 0 && (
                      <div className="p-3 space-y-2">
                        {hasSubGoals && (
                          <p className={`text-xs font-medium px-2 py-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                            Direct tasks ({group.tasks.length})
                          </p>
                        )}
                        {group.tasks.map((task, taskIndex) => (
                          <div 
                            key={task.id} 
                            className="animate-fade-in"
                            style={{ animationDelay: `${taskIndex * 20}ms` }}
                          >
                            <TaskCard 
                              task={task} 
                              onToggleComplete={handleToggleComplete} 
                              onDelete={handleDeleteWithUndo}
                              onEdit={handleEdit}
                              onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                              onRemoveFromToday={removeFromToday}
                              onMoveToProject={handleOpenMoveToProject}
                              showTodayActions={!todayTaskIds.has(task.id)}
                              goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
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
                          className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}
                        >
                          {/* Sub-goal Header */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGoalExpanded(subGoalId); }}
                            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                              isDark ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3 pl-6">
                              {isSubExpanded ? (
                                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
                              ) : (
                                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isDark ? 'bg-violet-500/15' : 'bg-violet-50'
                              }`}>
                                <Target className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                              </div>
                              <div className="text-left">
                                <h4 className={`font-medium text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                  {subGroup.goal.title}
                                </h4>
                                <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                                  {subCompleted}/{subTotal} tasks
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-400 transition-all"
                                  style={{ width: `${subTotal > 0 ? (subCompleted / subTotal) * 100 : 0}%` }}
                                />
                              </div>
                              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                {subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0}%
                              </span>
                            </div>
                          </button>
                          
                          {/* Sub-goal Tasks */}
                          {isSubExpanded && (
                            <div className={`px-4 py-2 pl-16 space-y-2 ${
                              isDark ? 'bg-white/[0.01]' : 'bg-slate-50/30'
                            }`}>
                              {subGroup.tasks.map((task, taskIndex) => (
                                <div 
                                  key={task.id} 
                                  className="animate-fade-in"
                                  style={{ animationDelay: `${taskIndex * 20}ms` }}
                                >
                                  <TaskCard 
                                    task={task} 
                                    onToggleComplete={handleToggleComplete} 
                                    onDelete={handleDeleteWithUndo}
                                    onEdit={handleEdit}
                                    onAddToToday={!todayTaskIds.has(task.id) ? addToToday : undefined}
                                    onRemoveFromToday={removeFromToday}
                                    onMoveToProject={handleOpenMoveToProject}
                                    goalName={task.goalId ? goalMap.get(task.goalId) : undefined}
                                    showTodayActions={!todayTaskIds.has(task.id)}
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
              </div>
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

      {/* Move to Project Modal */}
      {isMoveToProjectOpen && taskToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#12121a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Move to Project
              </h2>
              <button
                onClick={() => setIsMoveToProjectOpen(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Task being moved */}
            <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {taskToMove.title}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {taskToMove.category} • {taskToMove.priority} Priority
              </p>
            </div>

            {activeProjects.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active projects</p>
                <p className="text-xs mt-1">Create a project first to move tasks</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedSubProjectId('');
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                      isDark 
                        ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                    }`}
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
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                      Select Sub-Project
                    </label>
                    {availableSubProjects.length === 0 ? (
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                        No sub-projects in this project. Create one first.
                      </p>
                    ) : (
                      <select
                        value={selectedSubProjectId}
                        onChange={(e) => setSelectedSubProjectId(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                          isDark 
                            ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                        }`}
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

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsMoveToProjectOpen(false)}
                className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToProject}
                disabled={!selectedProjectId || !selectedSubProjectId}
                className={`btn-primary px-4 py-2 rounded-xl ${
                  (!selectedProjectId || !selectedSubProjectId) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Move Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
