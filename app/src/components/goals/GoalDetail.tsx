import { useState } from 'react';
import type { Goal, Task } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Target, Plus, Link2, Unlink, Check } from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { NotesEditor } from '../common/NotesEditor';

interface GoalDetailProps {
  goal: Goal;
  progress: number;
  allTasks: Task[];
  linkedTasks: Task[];
  onClose: () => void;
  onLinkTask: (goalId: string, taskId: string) => void;
  onUnlinkTask: (goalId: string, taskId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  isOpen: boolean;
}

export function GoalDetail({
  goal,
  progress,
  allTasks,
  linkedTasks,
  onClose,
  onLinkTask,
  onUnlinkTask,
  onUpdateGoal,
  onToggleTaskComplete,
  isOpen
}: GoalDetailProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');

  const availableTasks = allTasks.filter(
    task => !task.goalId && task.status !== 'Completed'
  );

  const completedLinkedTasks = linkedTasks.filter(t => t.status === 'Completed');

  const handleSaveEdit = () => {
    onUpdateGoal(goal.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const progressBar = (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Progress</label>
        <span className={`text-sm font-semibold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{progress}%</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress === 100
              ? 'bg-gradient-to-r from-emerald-500 to-green-500'
              : 'bg-gradient-to-r from-violet-500 to-purple-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {completedLinkedTasks.length} of {linkedTasks.length} linked tasks completed
      </p>
    </div>
  );

  const linkedTasksSection = (
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

      {isLinkingMode && availableTasks.length > 0 && (
        <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Select tasks to link:</p>
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
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No available tasks to link.</p>
        </div>
      )}

      {linkedTasks.length === 0 ? (
        <div className={`text-center py-8 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <Target className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No tasks linked yet.</p>
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
                <button
                  onClick={() => onToggleTaskComplete(task.id)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    task.status === 'Completed'
                      ? 'bg-emerald-500 border-emerald-500'
                      : isDark
                        ? 'border-gray-600 hover:border-violet-500 hover:bg-violet-500/20'
                        : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50'
                  }`}
                >
                  {task.status === 'Completed' && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
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
  );

  const editButtons = isEditing ? (
    <div className="flex justify-end space-x-2">
      <button onClick={() => setIsEditing(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>Cancel</button>
      <button onClick={handleSaveEdit} className="btn-primary px-4 py-2 rounded-lg text-sm">Save Changes</button>
    </div>
  ) : null;

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={onClose}
      title={goal.title}
      icon={<Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
      maxWidth="max-w-2xl"
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            {/* Left: description + progress */}
            <div className={`flex-1 flex flex-col p-8 space-y-6 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{goal.category} &bull; {goal.status}</p>
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`w-full px-4 py-2.5 mb-4 rounded-xl border outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'}`}
                      autoFocus
                    />
                    <NotesEditor
                      value={editDescription}
                      onChange={setEditDescription}
                      placeholder="Add a description..."
                      minRows={10}
                      maxRows={24}
                    />
                  </>
                ) : (
                  <p
                    className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    onClick={() => setIsEditing(true)}
                  >
                    {goal.description || 'Click to add a description...'}
                  </p>
                )}
                {editButtons}
              </div>
            </div>
            {/* Right: progress + linked tasks */}
            <div className={`w-96 flex-shrink-0 p-6 space-y-6 overflow-y-auto ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              {progressBar}
              {linkedTasksSection}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{goal.category} &bull; {goal.status}</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 mb-3 rounded-xl border outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'}`}
                    autoFocus
                  />
                  <NotesEditor
                    value={editDescription}
                    onChange={setEditDescription}
                    placeholder="Add a description..."
                    minRows={3}
                    maxRows={8}
                  />
                </>
              ) : (
                <p
                  className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                  onClick={() => setIsEditing(true)}
                >
                  {goal.description || 'Click to add a description...'}
                </p>
              )}
              {editButtons}
            </div>
            {progressBar}
            {linkedTasksSection}
          </div>
        )
      }
    </ExpandableModal>
  );
}
