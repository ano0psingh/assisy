import { useState, useMemo } from 'react';
import { Target, Plus, Filter } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGoalContext } from '../context/GoalContext';
import { useTaskContext } from '../context/TaskContext';
import { useGamification } from '../context/GamificationContext';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalDetail } from '../components/goals/GoalDetail';
import type { Goal, TaskCategory, GoalStatus } from '../types';

type FilterStatus = 'all' | 'Active' | 'Completed' | 'Archived';

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

  // Always get fresh goal data from goals array (fixes stale state issues)
  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) || null : null;

  // Get completed task IDs for progress calculation
  const completedTaskIds = tasks
    .filter(t => t.status === 'Completed')
    .map(t => t.id);

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

  const activeGoalsCount = goals.filter(g => g.status === 'Active').length;
  const completedGoalsCount = goals.filter(g => g.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Goals</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {activeGoalsCount} active • {completedGoalsCount} completed
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Goal</span>
        </button>
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

      {/* Goals List */}
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
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal, index) => {
            const subGoals = getSubGoals(goal.id);
            const isExpanded = expandedGoals.has(goal.id);
            const hasChildren = subGoals.length > 0;
            
            return (
              <div 
                key={goal.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Parent Goal Card */}
                <GoalCard
                  goal={goal}
                  progress={getGoalProgress(goal)}
                  linkedTasksCount={hasChildren ? subGoals.length : goal.linkedTaskIds.length}
                  completedTasksCount={hasChildren 
                    ? subGoals.filter(sg => sg.status === 'Completed').length 
                    : getCompletedTasksCount(goal)
                  }
                  subGoalsCount={subGoals.length}
                  onComplete={handleCompleteGoal}
                  onArchive={archiveGoal}
                  onReactivate={reactivateGoal}
                  onDelete={handleDeleteGoal}
                  onClick={(goal) => setSelectedGoalId(goal.id)}
                  onEdit={handleEdit}
                  onToggleExpand={() => toggleGoalExpanded(goal.id)}
                  isExpanded={isExpanded}
                />
                
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
                          linkedTasksCount={subGoal.linkedTaskIds.length}
                          completedTasksCount={getCompletedTasksCount(subGoal)}
                          onComplete={handleCompleteGoal}
                          onArchive={archiveGoal}
                          onReactivate={reactivateGoal}
                          onDelete={handleDeleteGoal}
                          onClick={(goal) => setSelectedGoalId(goal.id)}
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
