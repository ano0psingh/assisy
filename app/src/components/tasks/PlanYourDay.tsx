import { useState } from 'react';
import type { Task } from '../../types';
import { Search, Plus, Check, Flame, CalendarDays, Minus, FolderKanban } from 'lucide-react';
import { getLocalDateString, getScheduledDate, getScheduledStartMinute } from '../../lib/dateUtils';
import { Button, IconButton } from '../ui';
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
      icon={<CalendarDays className="h-5 w-5" />}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--ink-muted)]">
            Tap tasks to add or remove
          </p>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {() => (
        <>
          <p className="border-b border-[var(--rule)] bg-[var(--surface)] px-6 py-3 font-mono text-xs text-[var(--ink-muted)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{todaysTasks.length} tasks today
          </p>
        <div className="flex-1 overflow-y-auto">
          {/* Today's tasks */}
          {todaysTasks.length > 0 && (
            <div className="border-b border-[var(--rule)] px-6 py-3">
              <p className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                Scheduled today ({todaysTasks.length})
              </p>
              <div className="space-y-1">
                {sortedTodayTasks.map(task => {
                  const isExplicitlyScheduled = getScheduledDate(task) === todayStr;
                  return (
                  <div key={task.id} className="flex min-h-11 items-center gap-2 border-b border-[var(--rule)] bg-[var(--surface-subtle)] px-3 py-2 last:border-0">
                    {task.id.startsWith('pt-')
                      ? <FolderKanban size={12} className="text-[var(--action)]" />
                      : <Check size={12} className="text-[var(--success)]" />}
                    <span className="flex-1 truncate text-sm text-[var(--ink-secondary)]">{task.title}</span>
                    <span className="font-mono text-xs text-[var(--ink-muted)]">
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
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                Backlog ({backlogTasks.length})
              </p>
            </div>

            {backlogTasks.length > 5 && (
              <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] px-3 py-2">
                <Search size={13} className="text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="min-h-11 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
                />
              </div>
            )}

            <div className="space-y-1">
              {filteredSuggested.map(task => (
                <button
                  key={task.id}
                  onClick={() => onScheduleToday(task.id)}
                  className="flex min-h-11 w-full items-center gap-3 border-b border-[var(--rule)] px-3 py-2 text-left text-[var(--ink-secondary)] transition-colors last:border-0 hover:bg-[var(--action-soft)] hover:text-[var(--action)]"
                >
                  <Plus size={13} className="text-[var(--action)]" />
                  <span className="text-sm flex-1 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.priority === 'High' && <Flame size={11} className="text-[var(--danger)]" />}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                        <CalendarDays size={9} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="text-xs text-[var(--ink-muted)]">{task.category}</span>
                  </div>
                </button>
              ))}
              {filteredSuggested.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">
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
