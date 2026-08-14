import { useState } from 'react';
import type { Task, ProjectTask } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { X, Search, Plus, Check, Flame, CalendarDays, Minus, FolderKanban } from 'lucide-react';

interface PlanYourDayProps {
  isOpen: boolean;
  onClose: () => void;
  todaysTasks: Task[];
  suggestedTasks: Task[];
  onAddToToday: (taskId: string) => void;
  onRemoveFromToday: (taskId: string) => void;
  todaysProjectTasks?: ProjectTask[];
  onRemoveProjectTaskFromToday?: (taskId: string) => void;
}

export function PlanYourDay({
  isOpen,
  onClose,
  todaysTasks,
  suggestedTasks,
  onAddToToday,
  onRemoveFromToday,
  todaysProjectTasks = [],
  onRemoveProjectTaskFromToday,
}: PlanYourDayProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const manualTasks = todaysTasks.filter(t => t.isFocusedToday && t.focusedDate === todayStr);
  const autoTasks = todaysTasks.filter(t => !(t.isFocusedToday && t.focusedDate === todayStr));

  const filteredSuggested = search.trim()
    ? suggestedTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : suggestedTasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={onClose}
      />

      <div className={`relative rounded-2xl shadow-elevated w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up overflow-hidden ${
        isDark ? 'bg-[#12121a] border border-white/10' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Plan Your Day</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}{todaysTasks.length + todaysProjectTasks.length} tasks today
            </p>
          </div>
          <button aria-label="Close" onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Today's tasks */}
          {(todaysTasks.length > 0 || todaysProjectTasks.length > 0) && (
            <div className={`px-5 py-3 border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                Today ({todaysTasks.length + todaysProjectTasks.length})
              </p>
              <div className="space-y-1">
                {/* Project tasks */}
                {todaysProjectTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}>
                    <FolderKanban size={12} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                    <span className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{task.title}</span>
                    {onRemoveProjectTaskFromToday && (
                      <button aria-label="Remove from Today" onClick={() => onRemoveProjectTaskFromToday(task.id)} className={`p-1.5 rounded -mr-0.5 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {/* Auto tasks (recurring, due, carried) */}
                {autoTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}>
                    <Check size={12} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
                    <span className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{task.title}</span>
                    <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                      {task.isRecurring ? 'recurring' : task.status === 'Carried Forward' ? 'carried' : 'due'}
                    </span>
                  </div>
                ))}
                {/* Manually added */}
                {manualTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-violet-500/5' : 'bg-violet-50/50'}`}>
                    <Plus size={12} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                    <span className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{task.title}</span>
                    <button aria-label="Remove from Today" onClick={() => onRemoveFromToday(task.id)} className={`p-1.5 rounded -mr-0.5 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backlog — add to today */}
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                Backlog ({suggestedTasks.length})
              </p>
            </div>

            {suggestedTasks.length > 5 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${
                isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'
              }`}>
                <Search size={13} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
                />
              </div>
            )}

            <div className="space-y-0.5">
              {filteredSuggested.map(task => (
                <button
                  key={task.id}
                  onClick={() => onAddToToday(task.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isDark
                      ? 'hover:bg-violet-500/10 text-gray-300 hover:text-violet-400'
                      : 'hover:bg-violet-50 text-slate-600 hover:text-violet-600'
                  }`}
                >
                  <Plus size={13} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
                  <span className="text-sm flex-1 truncate">{task.title}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.priority === 'High' && <Flame size={11} className="text-red-500" />}
                    {task.dueDate && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                        <CalendarDays size={9} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{task.category}</span>
                  </div>
                </button>
              ))}
              {filteredSuggested.length === 0 && (
                <p className={`text-sm py-4 text-center ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                  {search ? `No tasks match "${search}"` : 'All tasks are already planned!'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            Tap tasks to add or remove
          </p>
          <button
            onClick={onClose}
            className="btn-primary px-4 py-2 rounded-xl text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
