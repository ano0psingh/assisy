import { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { CheckSquare, Plus, TrendingUp } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';

export function Dashboard() {
  const { tasks, getTodaysTasks, loading, createTask, completeTask, uncompleteTask, deleteTask, carryForwardTasks, getTotalXP } = useTaskContext();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [hasCarriedForward, setHasCarriedForward] = useState(false);

  // Carry forward tasks when component mounts (only once)
  useEffect(() => {
    if (!loading && !hasCarriedForward) {
      carryForwardTasks();
      setHasCarriedForward(true);
    }
  }, [loading, hasCarriedForward, carryForwardTasks]);
  
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  const todaysTasks = getTodaysTasks();
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const totalXP = getTotalXP();

  const handleCreateTask = (data: any) => {
    createTask(
      data.title,
      data.description,
      data.category,
      data.priority,
      data.effort,
      data.isRecurring,
      data.recurrencePattern
    );
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Today's Tasks</h3>
            <CheckSquare className="text-blue-400" size={24} />
          </div>
          <div className="text-3xl font-bold text-blue-400">{todaysTasks.length}</div>
          <p className="text-gray-400 text-sm">tasks to complete</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total XP</h3>
            <TrendingUp className="text-yellow-400" size={24} />
          </div>
          <div className="text-3xl font-bold text-yellow-400">{totalXP.toLocaleString()}</div>
          <p className="text-gray-400 text-sm">experience points</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Completed</h3>
            <CheckSquare className="text-green-400" size={24} />
          </div>
          <div className="text-3xl font-bold text-green-400">{completedTasks.length}</div>
          <p className="text-gray-400 text-sm">tasks completed</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Today's Tasks</h2>
          <button 
            onClick={() => setIsTaskFormOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
        
        {todaysTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tasks for today. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}
      </div>

      <TaskForm
        isOpen={isTaskFormOpen}
        onSubmit={handleCreateTask}
        onCancel={() => setIsTaskFormOpen(false)}
      />
    </div>
  );
}