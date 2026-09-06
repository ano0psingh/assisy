import { useState } from 'react';
import type { Task } from '../../types';
import { Search, Plus, Check, Flame, CalendarDays, Minus, FolderKanban } from 'lucide-react';
import { getLocalDateString, getScheduledDate, getScheduledStartMinute } from '../../lib/dateUtils';
import { IconButton } from '../ui';
import { ExpandableModal } from '../common/ExpandableModal';

interface PlanYourDayProps {
  isOpen: boolean;
  onClose: () => void;
  todaysTasks: Task[];
  suggestedTasks: Task[];
  onScheduleToday: (taskId: string) => void;
  onUnschedule: (taskId: string) => void;
}

export function PlanYourDay({
  isOpen,
  onClose,
  todaysTasks,
  suggestedTasks,
  onScheduleToday,
  onUnschedule,
}: PlanYourDayProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const todayStr = getLocalDateString();

  const sortedTodayTasks = [...todaysTasks].sort((a, b) => {
    const aStart = getScheduledStartMinute(a);
    const bStart = getScheduledStartMinute(b);
    if (aStart !== null && bStart !== null) return aStart - bStart;
    if (aStart !== null) return -1;
    if (bStart !== null) return 1;
    return a.priority === b.priority ? 0 : a.priority === 'High' ? -1 : 1;
  });

  const backlogTasks = suggestedTasks.filter(t => t.inbox !== true && t.status !== 'Completed');
  const filteredSuggested = search.trim()
    ? backlogTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : backlogTasks;

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Your Day"
      icon={<CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Tap tasks to add or remove
          </p>
          <button onClick={onClose} className="btn-primary rounded-xl px-4 py-2 text-sm">
            Done
          </button>
        </div>
      }
    >
      {() => (
        <>
          <p className="border-b border-slate-100 px-6 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{todaysTasks.length} tasks today
          </p>
        <div className="flex-1 overflow-y-auto">
          {/* Today's tasks */}
          {todaysTasks.length > 0 && (
            <div className={`px-6 py-3 border-b border-slate-50 dark:border-white/5`}>
              <p className={`text-xs font-medium mb-2 text-slate-400 dark:text-gray-500`}>
                Scheduled today ({todaysTasks.length})
              </p>
              <div className="space-y-1">
                {sortedTodayTasks.map(task => {
                  const isExplicitlyScheduled = getScheduledDate(task) === todayStr;
                  return (
                  <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.02]`}>
                    {task.id.startsWith('pt-')
                      ? <FolderKanban size={12} className="text-violet-500 dark:text-violet-400" />
                      : <Check size={12} className="text-emerald-500 dark:text-emerald-400" />}
                    <span className={`text-sm flex-1 truncate text-slate-700 dark:text-gray-300`}>{task.title}</span>
                    <span className={`text-xs text-slate-400 dark:text-gray-400`}>
                      {task.scheduledTime
                        ? new Date(`2000-01-01T${task.scheduledTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                        : task.isRecurring ? 'recurring' : task.status === 'Carried Forward' ? 'carried' : isExplicitlyScheduled ? 'flexible' : 'due'}
                    </span>
                    {isExplicitlyScheduled && (
                      <IconButton
                        icon={Minus}
                        label="Unschedule"
                        size="sm"
                        tone="danger"
                        className="-mr-1"
                        onClick={() => onUnschedule(task.id)}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Backlog — add to today */}
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium text-slate-400 dark:text-gray-500`}>
                Backlog ({backlogTasks.length})
              </p>
            </div>

            {backlogTasks.length > 5 && (
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
                  onClick={() => onScheduleToday(task.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    'hover:bg-violet-50 text-slate-600 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:text-gray-300 dark:hover:text-violet-400'
                  }`}
                >
                  <Plus size={13} className={'text-slate-400 dark:text-gray-400'} />
                  <span className="text-sm flex-1 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.priority === 'High' && <Flame size={11} className="text-red-500" />}
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 text-slate-400 dark:text-gray-400`}>
                        <CalendarDays size={9} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-xs text-slate-400 dark:text-gray-400`}>{task.category}</span>
                  </div>
                </button>
              ))}
              {filteredSuggested.length === 0 && (
                <p className={`text-sm py-4 text-center text-slate-400 dark:text-gray-400`}>
                  {search ? `No tasks match "${search}"` : 'All tasks are already planned!'}
                </p>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </ExpandableModal>
  );
}
