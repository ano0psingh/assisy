import { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useTheme } from '../context/ThemeContext';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { Plus, ListFilter } from 'lucide-react';
import type { TaskCategory } from '../types';

type FilterStatus = 'all' | 'pending' | 'completed';

export function Tasks() {
  const { tasks, createTask, completeTask, uncompleteTask, deleteTask } = useTaskContext();
  const { goals, linkTaskToGoal } = useGoalContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  const filteredTasks = tasks
    .filter(task => {
      if (statusFilter === 'pending') return task.status !== 'Completed';
      if (statusFilter === 'completed') return task.status === 'Completed';
      return true;
    })
    .filter(task => {
      if (categoryFilter === 'all') return true;
      return task.category === categoryFilter;
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

  const handleCreateTask = (data: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: 'High' | 'Low';
    effort: 'High' | 'Low';
    isRecurring: boolean;
    recurrencePattern?: 'daily' | 'weekly';
    goalId?: string;
  }) => {
    const newTask = createTask(data.title, data.description, data.category, data.priority, data.effort, data.isRecurring, data.recurrencePattern, undefined, data.goalId);
    
    if (data.goalId) {
      linkTaskToGoal(data.goalId, newTask.id);
    }
    
    setIsTaskFormOpen(false);
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'Completed') {
      uncompleteTask(taskId);
    } else {
      completeTask(taskId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>All Tasks</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setIsTaskFormOpen(true)} className="btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2">
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center space-x-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <ListFilter size={18} />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className={`h-6 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className="flex items-center space-x-2">
            <label className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Status:</label>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'pending', 'completed'] as const).map((status) => (
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
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

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
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
            <div key={task.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
              <TaskCard task={task} onToggleComplete={handleToggleComplete} onDelete={deleteTask} />
            </div>
          ))}
        </div>
      )}

      <TaskForm isOpen={isTaskFormOpen} onSubmit={handleCreateTask} onCancel={() => setIsTaskFormOpen(false)} goals={goals} />
    </div>
  );
}
