import { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { Plus, Filter } from 'lucide-react';
import type { TaskCategory } from '../types';

type FilterStatus = 'all' | 'pending' | 'completed';

export function Tasks() {
  const { tasks, createTask, completeTask, uncompleteTask, deleteTask } = useTaskContext();
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
      // Sort by status (pending first), then priority, then effort
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
  }) => {
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
    } else {
      completeTask(taskId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Tasks</h1>
        <button
          onClick={() => setIsTaskFormOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 bg-gray-800 p-4 rounded-lg">
        <Filter size={18} className="text-gray-400" />
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TaskCategory | 'all')}
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="Personal">Personal</option>
            <option value="Financial">Financial</option>
            <option value="Professional">Professional</option>
          </select>
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg">
          <p>No tasks found. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      <TaskForm
        isOpen={isTaskFormOpen}
        onSubmit={handleCreateTask}
        onCancel={() => setIsTaskFormOpen(false)}
      />
    </div>
  );
}
