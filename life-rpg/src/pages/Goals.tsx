import { useState, useEffect } from 'react';
import { Target, Plus, Filter } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGoalContext } from '../context/GoalContext';
import { useTaskContext } from '../context/TaskContext';
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
    updateGoalProgress
  } = useGoalContext();
  const { tasks } = useTaskContext();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  // Update goal progress whenever tasks change
  useEffect(() => {
    const completedTaskIds = tasks
      .filter(t => t.status === 'Completed')
      .map(t => t.id);
    
    goals.forEach(goal => {
      if (goal.linkedTaskIds.length > 0) {
        updateGoalProgress(goal.id, completedTaskIds);
      }
    });
  }, [tasks, goals, updateGoalProgress]);

  const filteredGoals = goals
    .filter(goal => {
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

  const handleCreateGoal = (data: { title: string; description: string; category: TaskCategory }) => {
    createGoal(data.title, data.description, data.category);
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

  const activeGoalsCount = goals.filter(g => g.status === 'Active').length;
  const completedGoalsCount = goals.filter(g => g.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Goals</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {activeGoalsCount} active • {completedGoalsCount} completed
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{goals.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Total Goals</p>
        </div>

        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              <Target className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{activeGoalsCount}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Active Goals</p>
        </div>

        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
              <Target className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{completedGoalsCount}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center space-x-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <Filter size={18} />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className={`h-6 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          
          <div className="flex items-center space-x-2">
            <label className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Status:</label>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'Active', 'Completed', 'Archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${
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
          
          <div className="flex items-center space-x-2">
            <label className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Category:</label>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'Personal', 'Financial', 'Professional'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? cat === 'Personal' 
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                        : cat === 'Financial'
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        : cat === 'Professional'
                        ? isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-slate-200 text-slate-600'
                        : isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                      : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
          
          <span className={`text-sm ml-auto ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center">
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
          {filteredGoals.map((goal, index) => (
            <div 
              key={goal.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <GoalCard
                goal={goal}
                linkedTasksCount={goal.linkedTaskIds.length}
                completedTasksCount={getCompletedTasksCount(goal)}
                onComplete={completeGoal}
                onArchive={archiveGoal}
                onReactivate={reactivateGoal}
                onDelete={deleteGoal}
                onClick={setSelectedGoal}
              />
            </div>
          ))}
        </div>
      )}

      {/* Goal Form Modal */}
      <GoalForm
        isOpen={isFormOpen}
        onSubmit={handleCreateGoal}
        onCancel={() => setIsFormOpen(false)}
      />

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetail
          isOpen={!!selectedGoal}
          goal={selectedGoal}
          allTasks={tasks}
          linkedTasks={getLinkedTasks(selectedGoal)}
          onClose={() => setSelectedGoal(null)}
          onLinkTask={linkTaskToGoal}
          onUnlinkTask={unlinkTaskFromGoal}
          onUpdateGoal={updateGoal}
        />
      )}
    </div>
  );
}
