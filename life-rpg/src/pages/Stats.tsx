import { BarChart3, CheckSquare, Zap, TrendingUp } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export function Stats() {
  const { tasks, getTotalXP } = useTaskContext();
  
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const totalXP = getTotalXP();
  
  const personalTasks = completedTasks.filter(t => t.category === 'Personal');
  const financialTasks = completedTasks.filter(t => t.category === 'Financial');
  const professionalTasks = completedTasks.filter(t => t.category === 'Professional');
  
  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'High').length;
  const highEffortCompleted = completedTasks.filter(t => t.effort === 'High').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total XP</h3>
            <Zap className="text-yellow-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{totalXP.toLocaleString()}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Completed</h3>
            <CheckSquare className="text-green-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-green-400">{completedTasks.length}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Pending</h3>
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-blue-400">{pendingTasks.length}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Tasks</h3>
            <BarChart3 className="text-purple-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-purple-400">{tasks.length}</div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Completed by Category</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-400">Personal</span>
              <span className="text-gray-400">{personalTasks.length} tasks</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${completedTasks.length > 0 ? (personalTasks.length / completedTasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-400">Financial</span>
              <span className="text-gray-400">{financialTasks.length} tasks</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${completedTasks.length > 0 ? (financialTasks.length / completedTasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Professional</span>
              <span className="text-gray-400">{professionalTasks.length} tasks</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-500 rounded-full transition-all"
                style={{ width: `${completedTasks.length > 0 ? (professionalTasks.length / completedTasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Priority & Effort Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">High Priority Completed</h2>
          <div className="text-3xl font-bold text-red-400">{highPriorityCompleted}</div>
          <p className="text-sm text-gray-500 mt-1">
            {completedTasks.length > 0 
              ? `${Math.round((highPriorityCompleted / completedTasks.length) * 100)}% of completed tasks`
              : 'No tasks completed yet'}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">High Effort Completed</h2>
          <div className="text-3xl font-bold text-orange-400">{highEffortCompleted}</div>
          <p className="text-sm text-gray-500 mt-1">
            {completedTasks.length > 0 
              ? `${Math.round((highEffortCompleted / completedTasks.length) * 100)}% of completed tasks`
              : 'No tasks completed yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
