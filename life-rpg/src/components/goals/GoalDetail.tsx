import { useState } from 'react';
import type { Goal, Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { X, Target, Plus, Link2, Unlink, CheckSquare } from 'lucide-react';

interface GoalDetailProps {
  goal: Goal;
  allTasks: Task[];
  linkedTasks: Task[];
  onClose: () => void;
  onLinkTask: (goalId: string, taskId: string) => void;
  onUnlinkTask: (goalId: string, taskId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  isOpen: boolean;
}

export function GoalDetail({ 
  goal, 
  allTasks, 
  linkedTasks, 
  onClose, 
  onLinkTask, 
  onUnlinkTask,
  onUpdateGoal,
  isOpen 
}: GoalDetailProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');

  // Tasks that can be linked (not already linked to this goal)
  const availableTasks = allTasks.filter(
    task => !goal.linkedTaskIds.includes(task.id) && task.status !== 'Completed'
  );

  const completedLinkedTasks = linkedTasks.filter(t => t.status === 'Completed');

  const handleSaveEdit = () => {
    onUpdateGoal(goal.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${
        isDark 
          ? 'bg-[#12121a] border border-white/10' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
              <Target className={`w-6 h-6 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-2 py-1 input rounded-lg text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <h2 
                  className={`text-xl font-semibold cursor-pointer hover:opacity-80 ${isDark ? 'text-white' : 'text-slate-800'}`}
                  onClick={() => setIsEditing(true)}
                >
                  {goal.title}
                </h2>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {goal.category} • {goal.status}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Description
            </label>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-4 py-3 input rounded-xl resize-none"
                rows={3}
                placeholder="Add a description..."
              />
            ) : (
              <p className={`${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {goal.description || 'No description'}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-primary px-4 py-2 rounded-lg text-sm"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                Progress
              </label>
              <span className={`text-sm font-semibold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                {goal.progress}%
              </span>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  goal.progress === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                    : 'bg-gradient-to-r from-violet-500 to-purple-500'
                }`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {completedLinkedTasks.length} of {linkedTasks.length} linked tasks completed
            </p>
          </div>

          {/* Linked Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                Linked Tasks ({linkedTasks.length})
              </label>
              <button
                onClick={() => setIsLinkingMode(!isLinkingMode)}
                className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                  isLinkingMode 
                    ? 'text-violet-500' 
                    : isDark ? 'text-gray-400 hover:text-violet-400' : 'text-slate-500 hover:text-violet-600'
                }`}
              >
                <Plus size={16} />
                <span>{isLinkingMode ? 'Done' : 'Link Tasks'}</span>
              </button>
            </div>

            {/* Link Tasks Mode */}
            {isLinkingMode && availableTasks.length > 0 && (
              <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Select tasks to link to this goal:
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onLinkTask(goal.id, task.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isDark 
                          ? 'bg-white/5 hover:bg-white/10 text-gray-300' 
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-sm truncate">{task.title}</span>
                      <Link2 size={14} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLinkingMode && availableTasks.length === 0 && (
              <div className={`mb-4 p-4 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  No available tasks to link. Create new tasks first!
                </p>
              </div>
            )}

            {/* Linked Tasks List */}
            {linkedTasks.length === 0 ? (
              <div className={`text-center py-8 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <CheckSquare className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                  No tasks linked yet. Link tasks to track progress!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      isDark 
                        ? 'bg-white/5 border border-white/10' 
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        task.status === 'Completed'
                          ? 'bg-emerald-500'
                          : isDark ? 'border border-gray-600' : 'border border-slate-300'
                      }`}>
                        {task.status === 'Completed' && (
                          <CheckSquare size={12} className="text-white" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        task.status === 'Completed'
                          ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                          : isDark ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => onUnlinkTask(goal.id, task.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark 
                          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20' 
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title="Unlink task"
                    >
                      <Unlink size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
