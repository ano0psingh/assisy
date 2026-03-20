import { useState, useMemo } from 'react';
import { Target, Plus, Filter, LayoutGrid, List, Pencil, CheckCircle, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGoalContext } from '../context/GoalContext';
import { useTaskContext } from '../context/TaskContext';
import { useGamification } from '../context/GamificationContext';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalDetail } from '../components/goals/GoalDetail';
import { GoalTree, GoalTreeThumbnail } from '../components/goals/GoalTree';
import type { Goal, TaskCategory, GoalStatus, GoalTheme } from '../types';

type FilterStatus = 'all' | 'Active' | 'Completed' | 'Archived';

const THEME_BG: Record<GoalTheme, { dark: string; light: string }> = {
  forest:   { dark: 'bg-emerald-500/8',  light: 'bg-emerald-50' },
  mountain: { dark: 'bg-slate-400/8',    light: 'bg-slate-50' },
  ocean:    { dark: 'bg-cyan-500/8',     light: 'bg-cyan-50' },
  space:    { dark: 'bg-violet-500/8',   light: 'bg-violet-50' },
  garden:   { dark: 'bg-pink-500/8',     light: 'bg-pink-50' },
};

export function Goals() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    goals, 
    createGoal, 
    updateGoal,
    deleteGoal, 
    completeGoal, 
    archiveGoal, 
    reactivateGoal,
    linkTaskToGoal,
    unlinkTaskFromGoal,
    calculateGoalProgress,
    getSubGoals,
  } = useGoalContext();
  const { tasks, deleteTask, completeTask, uncompleteTask, updateTask } = useTaskContext();
  const { recordGoalCompletion, checkAndUnlockAchievements } = useGamification();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'garden' | 'list'>('garden');

  // Always get fresh goal data from goals array (fixes stale state issues)
  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) || null : null;

  // Get completed task IDs for progress calculation
  const completedTaskIds = tasks
    .filter(t => t.status === 'Completed')
    .map(t => t.id);

  // Clean up stale linkedTaskIds (references to tasks that no longer exist)
  const taskIdSet = useMemo(() => new Set(tasks.map(t => t.id)), [tasks]);
  useMemo(() => {
    goals.forEach(goal => {
      const valid = goal.linkedTaskIds.filter(id => taskIdSet.has(id));
      if (valid.length !== goal.linkedTaskIds.length) {
        updateGoal(goal.id, { linkedTaskIds: valid });
      }
    });
  // Run only when task set changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdSet]);

  // Filter and sort goals - only show top-level goals in main list
  const filteredGoals = useMemo(() => {
    return goals
      .filter(goal => {
        // Only show top-level goals (no parent)
        if (goal.parentGoalId) return false;
        if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && goal.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Active first, then by creation date
        const statusOrder: Record<GoalStatus, number> = { Active: 0, Completed: 1, Archived: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [goals, statusFilter, categoryFilter]);

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

  const handleCreateGoal = (data: { title: string; description: string; category: TaskCategory; parentGoalId?: string }) => {
    createGoal(data.title, data.description, data.category, data.parentGoalId);
    setIsFormOpen(false);
  };

  const handleUpdateGoal = (data: { title: string; description: string; category: TaskCategory; parentGoalId?: string }) => {
    if (!editingGoal) return;
    updateGoal(editingGoal.id, {
      title: data.title,
      description: data.description,
      category: data.category,
      parentGoalId: data.parentGoalId,
    });
    setEditingGoal(null);
    setIsFormOpen(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingGoal(null);
    setIsFormOpen(false);
  };

  const getLinkedTasks = (goal: Goal) => {
    return tasks.filter(task => goal.linkedTaskIds.includes(task.id));
  };

  const getCompletedTasksCount = (goal: Goal) => {
    return tasks.filter(task => 
      goal.linkedTaskIds.includes(task.id) && task.status === 'Completed'
    ).length;
  };

  // Calculate progress on-the-fly for display
  const getGoalProgress = (goal: Goal) => {
    if (goal.status === 'Completed') return 100;
    return calculateGoalProgress(goal, completedTaskIds, goals);
  };

  // Delete goal and all linked tasks (including sub-goals' tasks)
  const handleDeleteGoal = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete) return;

    // Collect all goal IDs to delete (this goal + sub-goals)
    const goalIdsToDelete = new Set<string>([goalId]);
    const subGoals = goals.filter(g => g.parentGoalId === goalId);
    subGoals.forEach(sg => goalIdsToDelete.add(sg.id));

    // Find ALL tasks that have goalId pointing to any of the goals being deleted
    const tasksToDelete = tasks.filter(task => 
      task.goalId && goalIdsToDelete.has(task.goalId)
    );

    // Delete all linked tasks
    tasksToDelete.forEach(task => {
      deleteTask(task.id);
    });

    // Delete the goal (this will also delete sub-goals via GoalContext)
    deleteGoal(goalId);
  };

  // Complete goal and all linked tasks (including sub-goals' tasks)
  const handleCompleteGoal = (goalId: string) => {
    const goalToComplete = goals.find(g => g.id === goalId);
    if (!goalToComplete) return;

    // Collect all goal IDs (this goal + sub-goals)
    const allGoalIds = new Set<string>([goalId]);
    const collectSubGoals = (parentId: string) => {
      goals.filter(g => g.parentGoalId === parentId).forEach(sg => {
        allGoalIds.add(sg.id);
        collectSubGoals(sg.id);
      });
    };
    collectSubGoals(goalId);

    // Complete all tasks linked to these goals
    tasks.forEach(task => {
      if (task.goalId && allGoalIds.has(task.goalId) && task.status !== 'Completed') {
        completeTask(task.id);
      }
    });

    // Complete all sub-goals first
    allGoalIds.forEach(gId => {
      if (gId !== goalId) {
        completeGoal(gId);
      }
    });

    // Complete the main goal
    completeGoal(goalId);
    
    // Record goal completion in gamification
    recordGoalCompletion();
    setTimeout(() => checkAndUnlockAchievements(), 100);
  };

  // Link task to goal - also updates task's goalId
  const handleLinkTask = (goalId: string, taskId: string) => {
    // Check if task is already linked to another goal
    const task = tasks.find(t => t.id === taskId);
    if (task?.goalId) {
      alert('This task is already linked to another goal. Unlink it first.');
      return;
    }
    
    // Update goal's linkedTaskIds
    linkTaskToGoal(goalId, taskId);
    // Update task's goalId
    updateTask(taskId, { goalId });
  };

  // Unlink task from goal - also clears task's goalId
  const handleUnlinkTask = (goalId: string, taskId: string) => {
    // Update goal's linkedTaskIds
    unlinkTaskFromGoal(goalId, taskId);
    // Clear task's goalId
    updateTask(taskId, { goalId: undefined });
  };

  const activeGoals = goals.filter(g => g.status === 'Active');
  const activeGoalsCount = activeGoals.length;
  const completedGoalsCount = goals.filter(g => g.status === 'Completed').length;
  const totalLevels = activeGoals.reduce((sum, g) => sum + (g.level || 1), 0);

  const getMilestoneStats = (goal: Goal) => {
    const ms = goal.milestones || [];
    return { completed: ms.filter(m => m.isCompleted).length, total: ms.length };
  };

  const getThemeBg = (goalTheme?: GoalTheme) => {
    if (!goalTheme) return isDark ? 'bg-violet-500/8' : 'bg-violet-50';
    const t = THEME_BG[goalTheme];
    return isDark ? t.dark : t.light;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Goals</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {activeGoalsCount} active • {completedGoalsCount} completed • {totalLevels} total levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              onClick={() => setViewMode('garden')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-all ${
                viewMode === 'garden'
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="Garden View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Garden</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="List View"
            >
              <List size={15} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              filtersOpen || statusFilter !== 'all' || categoryFilter !== 'all'
                ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Filter size={15} />
            <span>Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all') && (
              <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-violet-500 text-white">
                {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          {(statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
              className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Clear
            </button>
          )}
        </div>
        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
          {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
        </span>
      </div>
      {filtersOpen && (
        <div className={`card rounded-xl p-3 flex flex-wrap items-center gap-3 animate-fade-in`}>
          <div className="flex items-center gap-2">
            <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Status</label>
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'Active', 'Completed', 'Archived'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-2.5 py-1 text-xs font-medium capitalize transition-all ${statusFilter === status ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Category</label>
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'Personal', 'Financial', 'Professional'] as const).map((cat) => (
                <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2.5 py-1 text-xs font-medium transition-all ${categoryFilter === cat ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals */}
      {filteredGoals.length === 0 ? (
        <div className="card rounded-2xl p-6 sm:p-12 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <Target className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {goals.length === 0 ? 'No goals yet' : 'No goals match filters'}
          </h3>
          <p className={`mb-4 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {goals.length === 0 
              ? 'Create your first goal to start tracking your progress!'
              : 'Try adjusting your filters to see more goals.'
            }
          </p>
          {goals.length === 0 && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="text-violet-500 hover:text-violet-400 font-medium"
            >
              + Create your first goal
            </button>
          )}
        </div>
      ) : viewMode === 'garden' ? (
        /* ── Garden View ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGoals.map((goal, index) => {
            const ms = getMilestoneStats(goal);
            const xpPct = goal.xpToNextLevel > 0
              ? Math.round((goal.currentLevelXP / goal.xpToNextLevel) * 100)
              : 100;

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoalId(goal.id)}
                className={`relative rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer
                  hover:scale-[1.02] active:scale-[0.98] animate-fade-in
                  ${getThemeBg(goal.theme)}
                  ${isDark
                    ? 'border border-white/[0.07] hover:border-white/[0.14]'
                    : 'border border-neutral-200 hover:shadow-medium hover:border-neutral-300'}
                  ${goal.status !== 'Active' ? 'opacity-60' : ''}
                `}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Tree */}
                <div className="flex justify-center mb-2">
                  <GoalTree level={goal.level || 1} theme={goal.theme} size="md" animate />
                </div>

                {/* Title */}
                <h3 className={`font-semibold text-sm leading-tight line-clamp-2 mb-1.5 ${
                  isDark ? 'text-white' : 'text-slate-800'
                }`}>
                  {goal.title}
                </h3>

                {/* Level badge */}
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${
                  isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  Lv.&nbsp;{goal.level || 1}
                </span>

                {/* XP progress bar */}
                <div className={`h-1.5 rounded-full overflow-hidden mb-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {goal.currentLevelXP}/{goal.xpToNextLevel} XP
                </p>

                {/* Milestones */}
                {ms.total > 0 && (
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    {ms.completed}/{ms.total} milestones
                  </p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-4">
          {filteredGoals.map((goal, index) => {
            const subGoals = getSubGoals(goal.id);
            const isExpanded = expandedGoals.has(goal.id);
            const hasChildren = subGoals.length > 0;
            const xpPct = goal.xpToNextLevel > 0
              ? Math.round((goal.currentLevelXP / goal.xpToNextLevel) * 100)
              : 100;
            
            return (
              <div 
                key={goal.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Augmented Goal Card wrapper */}
                <div
                  className={`group rounded-xl p-5 transition-all duration-200 ease-spring cursor-pointer active:scale-[0.99] ${
                    isDark
                      ? `bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] ${goal.status !== 'Active' ? 'opacity-60' : ''}`
                      : `bg-white border border-neutral-200 hover:shadow-medium hover:border-neutral-300 ${goal.status !== 'Active' ? 'opacity-60 bg-neutral-50' : ''}`
                  }`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Tree thumbnail */}
                    <div className="flex-shrink-0">
                      <GoalTreeThumbnail level={goal.level || 1} theme={goal.theme} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-lg ${
                          goal.status !== 'Active'
                            ? isDark ? 'text-gray-500' : 'text-slate-400'
                            : isDark ? 'text-white' : 'text-slate-800'
                        }`}>
                          {goal.title}
                        </h3>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-600'
                        }`}>
                          Lv.&nbsp;{goal.level || 1}
                        </span>
                        {hasChildren && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGoalExpanded(goal.id); }}
                            className={`px-2 py-0.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
                              isDark 
                                ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40 hover:bg-violet-500/35' 
                                : 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200'
                            }`}
                          >
                            {subGoals.length} sub-goal{subGoals.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      {goal.description && (
                        <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                          {goal.description}
                        </p>
                      )}

                      {/* XP bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
                            {goal.currentLevelXP}/{goal.xpToNextLevel} XP
                          </span>
                          <span className={`font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                            {getGoalProgress(goal)}%
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              getGoalProgress(goal) === 100
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                : 'bg-gradient-to-r from-violet-500 to-purple-500'
                            }`}
                            style={{ width: `${xpPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`badge ${
                          goal.category === 'Personal' ? 'badge-blue'
                            : goal.category === 'Financial' ? 'badge-green' : 'badge-gray'
                        }`}>
                          {goal.category}
                        </span>
                        <span className={`badge ${
                          goal.status === 'Completed' ? 'badge-green'
                            : goal.status === 'Archived' ? 'badge-gray' : 'badge-purple'
                        }`}>
                          {goal.status}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                          {getCompletedTasksCount(goal)}/{hasChildren ? subGoals.length : getLinkedTasks(goal).length} tasks
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(goal)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/20' : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'}`} title="Edit">
                        <Pencil size={16} />
                      </button>
                      {goal.status === 'Active' && (
                        <>
                          <button onClick={() => handleCompleteGoal(goal.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`} title="Complete">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => archiveGoal(goal.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/20' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`} title="Archive">
                            <Archive size={16} />
                          </button>
                        </>
                      )}
                      {(goal.status === 'Completed' || goal.status === 'Archived') && (
                        <button onClick={() => reactivateGoal(goal.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/20' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`} title="Reactivate">
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteGoal(goal.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/20' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Sub-goals (expanded) */}
                {hasChildren && isExpanded && (
                  <div className={`ml-8 mt-2 space-y-2 pl-4 border-l-2 ${
                    isDark ? 'border-violet-500/30' : 'border-violet-200'
                  }`}>
                    {subGoals.map((subGoal, subIndex) => (
                      <div 
                        key={subGoal.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${subIndex * 30}ms` }}
                      >
                        <GoalCard
                          goal={subGoal}
                          progress={getGoalProgress(subGoal)}
                          linkedTasksCount={getLinkedTasks(subGoal).length}
                          completedTasksCount={getCompletedTasksCount(subGoal)}
                          onComplete={handleCompleteGoal}
                          onArchive={archiveGoal}
                          onReactivate={reactivateGoal}
                          onDelete={handleDeleteGoal}
                          onClick={(g) => setSelectedGoalId(g.id)}
                          onEdit={handleEdit}
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

      {/* Goal Form Modal */}
      <GoalForm
        isOpen={isFormOpen}
        onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
        onCancel={handleCloseForm}
        editingGoal={editingGoal}
        availableParentGoals={goals}
      />

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetail
          isOpen={!!selectedGoal}
          goal={selectedGoal}
          progress={getGoalProgress(selectedGoal)}
          allTasks={tasks}
          linkedTasks={getLinkedTasks(selectedGoal)}
          onClose={() => setSelectedGoalId(null)}
          onLinkTask={handleLinkTask}
          onUnlinkTask={handleUnlinkTask}
          onUpdateGoal={updateGoal}
          onToggleTaskComplete={(taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task?.status === 'Completed') {
              uncompleteTask(taskId);
            } else {
              completeTask(taskId);
            }
          }}
        />
      )}
    </div>
  );
}
