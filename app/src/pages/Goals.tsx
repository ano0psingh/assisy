import { useState, useMemo, useCallback } from 'react';
import { Target, Plus, Filter, LayoutGrid, List, Pencil, CheckCircle, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGoalContext } from '../context/GoalContext';
import { useTaskContext } from '../context/TaskContext';
import { useHabitContext } from '../context/HabitContext';
import { useGamification } from '../context/GamificationContext';
import { useDataVersion } from '../context/DataVersionContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalDetail } from '../components/goals/GoalDetail';
import { GoalTree, GoalTreeThumbnail } from '../components/goals/GoalTree';
import { useUndo } from '../components/common/UndoToast';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkEditMenu, type BulkEditField } from '../components/common/BulkEditMenu';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import { usePersistentSet, usePersistentState } from '../hooks/usePersistentState';
import { staggerDelay } from '../lib/animation';
import { pluralise } from '../lib/bulkUpdate';

const GOAL_BULK_FIELDS: BulkEditField[] = [
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
    key: 'theme',
    label: 'Tree theme',
    kind: 'choice',
    options: [
      { label: 'Forest', value: 'forest' },
      { label: 'Mountain', value: 'mountain' },
      { label: 'Ocean', value: 'ocean' },
      { label: 'Space', value: 'space' },
      { label: 'Garden', value: 'garden' },
    ],
  },
];
import { SelectButton, SelectionCheckbox, SelectionIndicator } from '../components/common/SelectionControls';
import type { Goal, TaskCategory, GoalStatus, GoalTheme } from '../types';
import { IconButton } from '../components/ui';

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
    updateGoals,
    revertGoals,
    deleteGoal, 
    deleteGoals,
    restoreGoals,
    completeGoal, 
    archiveGoal, 
    reactivateGoal,
    linkTaskToGoal,
    unlinkTaskFromGoal,
    calculateGoalProgress,
    getSubGoals,
    addXPToGoal,
  } = useGoalContext();
  const { tasks, deleteTask, completeTask, uncompleteTask, updateTask, updateTasks, revertTasks } = useTaskContext();
  const { habits, updateHabits, revertHabits } = useHabitContext();
  const { recordGoalCompletion, recordTaskCompletion, updateStreak, checkAndUnlockAchievements } = useGamification();
  const { pushUndo } = useUndo();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = usePersistentState<FilterStatus>('assisy_goals_status', 'all');
  const [categoryFilter, setCategoryFilter] = usePersistentState<TaskCategory | 'all'>('assisy_goals_category', 'all');
  const [expandedGoals, setExpandedGoals] = usePersistentSet('assisy_goals_expanded');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = usePersistentState<'garden' | 'list'>('assisy_goals_view', 'garden');
  const { refresh } = useDataVersion();
  const onRefresh = useCallback(async () => { refresh(); }, [refresh]);
  const { pullDistance, isRefreshing: pullRefreshing, containerRef } = usePullToRefresh({ onRefresh });

  // Arriving from global search: show the list view and drop filters, so the
  // goal we are scrolling to is actually on screen.
  const handleSearchFocus = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setViewMode('list');
    setSelectedGoalId(null);
  }, [setStatusFilter, setCategoryFilter, setViewMode]);
  useFocusHighlight(handleSearchFocus);

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

  // Sub-goals are only on screen in list view under an expanded parent, but
  // they are selectable there, so they have to count as visible.
  const visibleGoalIds = useMemo(() => {
    const ids = filteredGoals.map(g => g.id);
    if (viewMode === 'list') {
      filteredGoals.forEach(g => {
        if (expandedGoals.has(g.id)) getSubGoals(g.id).forEach(sg => ids.push(sg.id));
      });
    }
    return ids;
  }, [filteredGoals, viewMode, expandedGoals, getSubGoals]);
  const selection = useBulkSelection(visibleGoalIds);

  const selectionProps = (goalId: string) => ({
    selectionMode: selection.active,
    isSelected: selection.isSelected(goalId),
    onSelectToggle: selection.toggle,
  });

  const handleBulkDelete = () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    const removed = deleteGoals(ids);
    if (removed.length === 0) return;
    selection.clear();

    // Tasks and habits keep a goalId, so unlink them rather than leaving
    // references to goals that no longer exist. The tasks themselves survive.
    const goneIds = new Set(removed.map(g => g.id));
    const orphanedTaskIds = tasks.filter(t => t.goalId && goneIds.has(t.goalId)).map(t => t.id);
    const orphanedHabitIds = habits.filter(h => h.goalId && goneIds.has(h.goalId)).map(h => h.id);
    const taskPatches = updateTasks(orphanedTaskIds, { goalId: undefined });
    const habitPatches = updateHabits(orphanedHabitIds, { goalId: undefined });

    // `removed` can exceed the selection, since deleting a goal takes its
    // sub-goals with it — report what actually went.
    const extra = removed.length - ids.length;
    const label = extra > 0
      ? `${pluralise(ids.length, 'goal')} + ${pluralise(extra, 'sub-goal')} deleted`
      : `${pluralise(removed.length, 'goal')} deleted`;
    pushUndo(label, () => {
      restoreGoals(removed);
      revertTasks(taskPatches);
      revertHabits(habitPatches);
    });
  };

  const handleBulkEdit = (key: string, value: string | number | null) => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    const patches = updateGoals(ids, { [key]: value } as Partial<Goal>);
    if (patches.length === 0) return;
    // Selection stays so several fields can be applied in a row.
    pushUndo(
      `${pluralise(patches.length, 'goal')} updated`,
      () => revertGoals(patches),
    );
  };

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
    return calculateGoalProgress(goal, completedTaskIds, goals, tasks);
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
    if (!goalTheme) return 'bg-violet-50 dark:bg-violet-500/8';
    const t = THEME_BG[goalTheme];
    return isDark ? t.dark : t.light;
  };

  return (
    <div ref={containerRef} className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold text-slate-800 dark:text-white`}>Goals</h1>
          <p className={`mt-1 text-slate-500 dark:text-gray-500`}>
            {activeGoalsCount} active • {completedGoalsCount} completed • {totalLevels} total levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg overflow-hidden border border-slate-200 dark:border-white/10`}>
            <button
              onClick={() => setViewMode('garden')}
              className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-all ${
                viewMode === 'garden'
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
              title="Garden View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Garden</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
              title="List View"
            >
              <List size={15} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary px-4 py-2 sm:px-6 sm:py-3 rounded-xl flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Goal</span>
          </button>
          <SelectButton
            active={selection.active}
            onClick={() => selection.active ? selection.clear() : selection.start()}
            disabled={filteredGoals.length === 0}
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
              filtersOpen || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            <Filter size={15} />
            <span>Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all') && (
              <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center bg-violet-500 text-white">
                {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          {(statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
              className={`text-xs px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300`}
            >
              Clear
            </button>
          )}
        </div>
        <span className={`text-xs text-slate-400 dark:text-gray-600`}>
          {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
        </span>
      </div>
      {filtersOpen && (
        <div className={`card rounded-xl p-3 flex flex-wrap items-center gap-3 animate-fade-in`}>
          <div className="flex items-center gap-2">
            <label className={`text-xs text-slate-500 dark:text-gray-500`}>Status</label>
            <div className={`flex rounded-lg overflow-hidden border border-slate-200 dark:border-white/10`}>
              {(['all', 'Active', 'Completed', 'Archived'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1 text-xs font-medium capitalize transition-all ${statusFilter === status ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-xs text-slate-500 dark:text-gray-500`}>Category</label>
            <div className={`flex rounded-lg overflow-hidden border border-slate-200 dark:border-white/10`}>
              {(['all', 'Personal', 'Financial', 'Professional'] as const).map((cat) => (
                <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1 text-xs font-medium transition-all ${categoryFilter === cat ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'}`}>
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
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-violet-50 dark:bg-violet-500/20`}>
            <Target className={`w-8 h-8 text-violet-500 dark:text-violet-400`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 text-slate-800 dark:text-white`}>
            {goals.length === 0 ? 'No goals yet' : 'No goals match filters'}
          </h3>
          <p className={`mb-4 text-slate-500 dark:text-gray-500`}>
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

            const isSelected = selection.isSelected(goal.id);

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => selection.active ? selection.toggle(goal.id) : setSelectedGoalId(goal.id)}
                {...(selection.active
                  ? { role: 'checkbox' as const, 'aria-checked': isSelected, 'aria-label': `Select "${goal.title}"` }
                  : {})}
                className={`relative rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer
                  hover:scale-[1.02] active:scale-[0.98] animate-fade-in
                  ${getThemeBg(goal.theme)}
                  ${isSelected
                    ? 'border-2 border-violet-500'
                    : isDark
                      ? 'border border-white/[0.07] hover:border-white/[0.14]'
                      : 'border border-neutral-200 hover:shadow-medium hover:border-neutral-300'}
                  ${goal.status !== 'Active' && !isSelected ? 'opacity-60' : ''}
                `}
                style={{ animationDelay: staggerDelay(index, 40) }}
              >
                {selection.active && (
                  <span className="absolute top-2 right-2 z-10">
                    <SelectionIndicator selected={isSelected} />
                  </span>
                )}

                {/* Tree */}
                <div className="flex justify-center mb-2">
                  <GoalTree level={goal.level || 1} theme={goal.theme} size="md" animate />
                </div>

                {/* Title */}
                <h3 className={`font-semibold text-sm leading-tight line-clamp-2 mb-2 ${
                  'text-slate-800 dark:text-white'
                }`}>
                  {goal.title}
                </h3>

                {/* Level badge */}
                <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-2 ${
                  'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-gray-300'
                }`}>
                  Lv.&nbsp;{goal.level || 1}
                </span>

                {/* XP progress bar */}
                <div className={`h-1.5 rounded-full overflow-hidden mb-2 bg-slate-200 dark:bg-white/10`}>
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <p className={`text-xs text-slate-400 dark:text-gray-500`}>
                  {goal.currentLevelXP}/{goal.xpToNextLevel} XP
                </p>

                {/* Milestones */}
                {ms.total > 0 && (
                  <p className={`text-xs mt-1 text-slate-400 dark:text-gray-500`}>
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
                style={{ animationDelay: staggerDelay(index, 50) }}
              >
                {/* Augmented Goal Card wrapper */}
                <div
                  className={`group rounded-xl p-6 transition-all duration-200 ease-spring cursor-pointer active:scale-[0.99] ${
                    selection.isSelected(goal.id)
                      ? 'bg-violet-50/60 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30'
                      : isDark
                        ? `bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] ${goal.status !== 'Active' ? 'opacity-60' : ''}`
                        : `bg-white border border-neutral-200 hover:shadow-medium hover:border-neutral-300 ${goal.status !== 'Active' ? 'opacity-60 bg-neutral-50' : ''}`
                  }`}
                  onClick={() => selection.active ? selection.toggle(goal.id) : setSelectedGoalId(goal.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Tree thumbnail — replaced by a checkbox while selecting */}
                    <div className="flex-shrink-0">
                      {selection.active ? (
                        <SelectionCheckbox
                          selected={selection.isSelected(goal.id)}
                          onToggle={() => selection.toggle(goal.id)}
                          label={`Select "${goal.title}"`}
                          className="w-12 h-12 flex items-center justify-center"
                        />
                      ) : (
                        <GoalTreeThumbnail level={goal.level || 1} theme={goal.theme} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-lg ${
                          goal.status !== 'Active'
                            ? 'text-slate-400 dark:text-gray-500'
                            : 'text-slate-800 dark:text-white'
                        }`}>
                          {goal.title}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                          Lv.&nbsp;{goal.level || 1}
                        </span>
                        {hasChildren && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGoalExpanded(goal.id); }}
                            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
                              'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 dark:bg-violet-500/25 dark:text-violet-300 dark:border-violet-500/40 dark:hover:bg-violet-500/35'
                            }`}
                          >
                            {subGoals.length} sub-goal{subGoals.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      {goal.description && (
                        <p className={`text-sm mt-1 line-clamp-2 text-slate-500 dark:text-gray-500`}>
                          {goal.description}
                        </p>
                      )}

                      {/* XP bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={'text-slate-500 dark:text-gray-400'}>
                            {goal.currentLevelXP}/{goal.xpToNextLevel} XP
                          </span>
                          <span className={`font-medium text-violet-600 dark:text-violet-400`}>
                            {getGoalProgress(goal)}%
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              getGoalProgress(goal) === 100
                                ? 'bg-emerald-500'
                                : 'bg-violet-500'
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
                        <span className={`text-xs text-slate-500 dark:text-gray-500`}>
                          {getCompletedTasksCount(goal)}/{hasChildren ? subGoals.length : getLinkedTasks(goal).length} tasks
                        </span>
                      </div>
                    </div>

                    {/* Actions — hidden while selecting */}
                    <div
                      className={`flex items-center space-x-1 flex-shrink-0 ${selection.active ? 'hidden' : ''}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <IconButton
                        icon={Pencil}
                        label="Edit"
                        size="sm"
                        tone="primary"
                        onClick={() => handleEdit(goal)}
                        title="Edit"
                      />
                      {goal.status === 'Active' && (
                        <>
                          <IconButton
                            icon={CheckCircle}
                            label="Complete"
                            size="sm"
                            tone="success"
                            onClick={() => handleCompleteGoal(goal.id)}
                            title="Complete"
                          />
                          <IconButton
                            icon={Archive}
                            label="Archive"
                            size="sm"
                            tone="warning"
                            onClick={() => archiveGoal(goal.id)}
                            title="Archive"
                          />
                        </>
                      )}
                      {(goal.status === 'Completed' || goal.status === 'Archived') && (
                        <IconButton
                          icon={RotateCcw}
                          label="Reactivate"
                          size="sm"
                          tone="info"
                          onClick={() => reactivateGoal(goal.id)}
                          title="Reactivate"
                        />
                      )}
                      <IconButton
                        icon={Trash2}
                        label="Delete"
                        size="sm"
                        tone="danger"
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Delete"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sub-goals (expanded) */}
                {hasChildren && isExpanded && (
                  <div className={`ml-8 mt-2 space-y-2 pl-4 border-l-2 ${
                    'border-violet-200 dark:border-violet-500/30'
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
                          {...selectionProps(subGoal.id)}
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
          linkedHabits={habits.filter(h => h.goalId === selectedGoal.id)}
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
              if (task) {
                recordTaskCompletion(task.category, task.xpValue);
                updateStreak();
                if (task.goalId && !task.isRecurring) {
                  addXPToGoal(task.goalId, task.xpValue || 10);
                }
                setTimeout(() => checkAndUnlockAchievements(), 100);
              }
            }
          }}
        />
      )}

      <BulkActionBar
        count={selection.count}
        itemLabel="goal"
        allSelected={selection.allSelected}
        onSelectAll={selection.selectAll}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
      >
        <BulkEditMenu fields={GOAL_BULK_FIELDS} onApply={handleBulkEdit} />
      </BulkActionBar>
    </div>
  );
}
