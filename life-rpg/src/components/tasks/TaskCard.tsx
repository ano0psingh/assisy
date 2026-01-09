import type { Task } from '../../types';
import { CheckSquare, Clock, Trash2, Edit } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onDelete, onEdit }: TaskCardProps) {
  const isCompleted = task.status === 'Completed';
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Personal': return 'bg-blue-900 text-blue-300';
      case 'Financial': return 'bg-green-900 text-green-300';
      case 'Professional': return 'bg-gray-900 text-gray-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'High' ? 'text-red-400' : 'text-yellow-400';
  };

  const getEffortColor = (effort: string) => {
    return effort === 'High' ? 'text-orange-400' : 'text-green-400';
  };

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors ${
      isCompleted ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`mt-1 p-1 rounded transition-colors ${
              isCompleted 
                ? 'text-green-400 hover:text-green-300' 
                : 'text-gray-400 hover:text-purple-400'
            }`}
          >
            <CheckSquare size={18} className={isCompleted ? 'fill-current' : ''} />
          </button>
          
          <div className="flex-1">
            <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </h3>
            
            {task.description && (
              <p className="text-sm text-gray-400 mt-1">{task.description}</p>
            )}
            
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(task.category)}`}>
                {task.category}
              </span>
              
              <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                {task.priority} Priority
              </span>
              
              <span className={`text-xs ${getEffortColor(task.effort)}`}>
                {task.effort} Effort
              </span>
              
              {task.category !== 'Professional' && (
                <span className="text-xs text-yellow-400">
                  {task.xpValue} XP
                </span>
              )}
              
              {task.isRecurring && (
                <span className="text-xs text-purple-400 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {task.recurrencePattern}
                </span>
              )}
            </div>
            
            {task.status === 'Carried Forward' && (
              <div className="text-xs text-orange-400 mt-1">Carried forward from previous day</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-blue-400 transition-colors p-1"
            >
              <Edit size={14} />
            </button>
          )}
          
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}