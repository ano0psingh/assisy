import { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useTheme } from '../context/ThemeContext';
import { CheckSquare, Plus, Zap, TrendingUp, Clock, Sparkles, Quote } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { getQuoteOfTheDay } from '../data/quotes';

export function Dashboard() {
  const { tasks, getTodaysTasks, loading, createTask, completeTask, uncompleteTask, deleteTask, carryForwardTasks, getTotalXP } = useTaskContext();
  const { goals, linkTaskToGoal } = useGoalContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [hasCarriedForward, setHasCarriedForward] = useState(false);

  useEffect(() => {
    if (!loading && !hasCarriedForward) {
      carryForwardTasks();
      setHasCarriedForward(true);
    }
  }, [loading, hasCarriedForward, carryForwardTasks]);
  
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
      data.goalId
    );
    
    // Also link the task to the goal in GoalContext
    if (data.goalId) {
      linkTaskToGoal(data.goalId, newTask.id);
    }
    
    setIsTaskFormOpen(false);
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
      return;
    }
    completeTask(taskId);
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

      {/* Today's Tasks Section */}
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
        </div>
        
        <div className="p-6">
          {todaysTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <Sparkles className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
              </div>
              <h3 className={`font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>All clear!</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks for today. Add one to get started!</p>
              <button 
                onClick={() => setIsTaskFormOpen(true)}
                className="text-violet-500 hover:text-violet-400 text-sm font-medium"
              >
                + Create your first task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TaskCard
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={deleteTask}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskForm
        isOpen={isTaskFormOpen}
        onSubmit={handleCreateTask}
        onCancel={() => setIsTaskFormOpen(false)}
        goals={goals}
      />
    </div>
  );
}
