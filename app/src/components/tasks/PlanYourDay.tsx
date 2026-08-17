import { useState } from 'react';
import type { Task, ProjectTask } from '../../types';
import { X, Search, Plus, Check, Flame, CalendarDays, Minus, FolderKanban } from 'lucide-react';
import { getLocalDateString } from '../../lib/dateUtils';
import { IconButton } from '../ui';

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
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const todayStr = getLocalDateString();

  const manualTasks = todaysTasks.filter(t => t.isFocusedToday && t.focusedDate === todayStr);
  const autoTasks = todaysTasks.filter(t => !(t.isFocusedToday && t.focusedDate === todayStr));

  const filteredSuggested = search.trim()
    ? suggestedTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : suggestedTasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm bg-slate-900/20 dark:bg-black/60`}
        onClick={onClose}
      />

      <div className={`relative rounded-2xl shadow-elevated w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up overflow-hidden ${
        'bg-white dark:bg-[#12121a] dark:border dark:border-white/10'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 border-slate-100 dark:border-white/10`}>
          <div>
            <h2 className={`font-semibold text-slate-800 dark:text-white`}>Plan Your Day</h2>
            <p className={`text-xs mt-1 text-slate-500 dark:text-gray-500`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}{todaysTasks.length + todaysProjectTasks.length} tasks today
            </p>
          </div>
          <IconButton
            icon={X}
            label="Close"
            size="lg"
            onClick={onClose}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Today's tasks */}
          {(todaysTasks.length > 0 || todaysProjectTasks.length > 0) && (
            <div className={`px-6 py-3 border-b border-slate-50 dark:border-white/5`}>
              <p className={`text-xs font-medium mb-2 text-slate-400 dark:text-gray-500`}>
                Today ({todaysTasks.length + todaysProjectTasks.length})
              </p>
              <div className="space-y-1">
                {/* Project tasks */}
                {todaysProjectTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.02]`}>
                    <FolderKanban size={12} className={'text-violet-500 dark:text-violet-400'} />
                    <span className={`text-sm flex-1 truncate text-slate-700 dark:text-gray-300`}>{task.title}</span>
                    {onRemoveProjectTaskFromToday && (
                      <IconButton
                        icon={Minus}
                        label="Remove from Today"
                        size="sm"
                        tone="danger"
                        className="-mr-1"
                        onClick={() => onRemoveProjectTaskFromToday(task.id)}
                      />
                    )}
                  </div>
                ))}
                {/* Auto tasks (recurring, due, carried) */}
                {autoTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.02]`}>
                    <Check size={12} className={'text-emerald-500 dark:text-emerald-400'} />
                    <span className={`text-sm flex-1 truncate text-slate-700 dark:text-gray-300`}>{task.title}</span>
                    <span className={`text-xs text-slate-400 dark:text-gray-600`}>
                      {task.isRecurring ? 'recurring' : task.status === 'Carried Forward' ? 'carried' : 'due'}
                    </span>
                  </div>
                ))}
                {/* Manually added */}
                {manualTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-500/5`}>
                    <Plus size={12} className={'text-violet-500 dark:text-violet-400'} />
                    <span className={`text-sm flex-1 truncate text-slate-700 dark:text-gray-300`}>{task.title}</span>
                    <IconButton
                      icon={Minus}
                      label="Remove from Today"
                      size="sm"
                      tone="danger"
                      className="-mr-1"
                      onClick={() => onRemoveFromToday(task.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backlog — add to today */}
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium text-slate-400 dark:text-gray-500`}>
                Backlog ({suggestedTasks.length})
              </p>
            </div>

            {suggestedTasks.length > 5 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 ${
                'bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10'
              }`}>
                <Search size={13} className={'text-slate-400 dark:text-gray-500'} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className={`flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 dark:text-white dark:placeholder-gray-600`}
                />
              </div>
            )}

            <div className="space-y-1">
              {filteredSuggested.map(task => (
                <button
                  key={task.id}
                  onClick={() => onAddToToday(task.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    'hover:bg-violet-50 text-slate-600 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:text-gray-300 dark:hover:text-violet-400'
                  }`}
                >
                  <Plus size={13} className={'text-slate-400 dark:text-gray-600'} />
                  <span className="text-sm flex-1 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.priority === 'High' && <Flame size={11} className="text-red-500" />}
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 text-slate-400 dark:text-gray-600`}>
                        <CalendarDays size={9} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-xs text-slate-400 dark:text-gray-600`}>{task.category}</span>
                  </div>
                </button>
              ))}
              {filteredSuggested.length === 0 && (
                <p className={`text-sm py-4 text-center text-slate-400 dark:text-gray-600`}>
                  {search ? `No tasks match "${search}"` : 'All tasks are already planned!'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-3 border-t flex-shrink-0 border-slate-100 dark:border-white/10`}>
          <p className={`text-xs text-slate-400 dark:text-gray-500`}>
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
