import { useCallback, useMemo } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { useTaskContext, type TaskScheduleInput } from '../context/TaskContext';
import type { ProjectTask, Task } from '../types';
import { getProjectTaskId, isUnifiedProjectTaskId } from '../lib/unifiedTaskIds';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { validateSchedule } from '../lib/calendarScheduling';

export { getProjectTaskId, isUnifiedProjectTaskId } from '../lib/unifiedTaskIds';

export type UnifiedTaskUpdate = Partial<Pick<
  Task,
  | 'title'
  | 'description'
  | 'inbox'
  | 'scheduledDate'
  | 'scheduledTime'
  | 'durationMinutes'
  | 'scheduledReminderOffsets'
  | 'focusedDate'
  | 'isFocusedToday'
  | 'dueDate'
  | 'dueTime'
  | 'dueReminderOffsets'
>>;

/** Route cross-cutting task actions to the owning context. */
export function useUnifiedTaskActions() {
  const {
    tasks,
    updateTask,
    scheduleTask,
    unscheduleTask,
    setTaskInbox,
  } = useTaskContext();
  const {
    subProjects,
    projects,
    getTasksBySubProject,
    updateProjectTask,
    scheduleProjectTask,
    unscheduleProjectTask,
    setProjectTaskInbox,
  } = useProjectContext();

  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );

  const schedule = useCallback((id: string, input: TaskScheduleInput, options?: { allowConflicts?: boolean }) => {
    const source = allTasks.find(task => task.id === id);
    const candidate = {
      ...(source ?? { id }),
      id,
      scheduledDate: input.date,
      scheduledTime: input.time,
      durationMinutes: input.durationMinutes,
    };
    const validation = validateSchedule(candidate, allTasks);
    if (!validation.valid && !options?.allowConflicts) {
      const names = validation.collisions.map(task => task.title || 'another task').join(', ');
      if (!window.confirm(`This time overlaps ${names}. Schedule it anyway?`)) return false;
    }
    if (isUnifiedProjectTaskId(id)) {
      scheduleProjectTask(getProjectTaskId(id), input);
    } else {
      scheduleTask(id, input);
    }
    return true;
  }, [allTasks, scheduleProjectTask, scheduleTask]);

  const unschedule = useCallback((id: string) => {
    if (isUnifiedProjectTaskId(id)) {
      unscheduleProjectTask(getProjectTaskId(id));
    } else {
      unscheduleTask(id);
    }
  }, [unscheduleProjectTask, unscheduleTask]);

  const setInbox = useCallback((id: string, inbox: boolean) => {
    if (isUnifiedProjectTaskId(id)) {
      setProjectTaskInbox(getProjectTaskId(id), inbox);
    } else {
      setTaskInbox(id, inbox);
    }
  }, [setProjectTaskInbox, setTaskInbox]);

  const update = useCallback((id: string, updates: UnifiedTaskUpdate) => {
    if (!isUnifiedProjectTaskId(id)) {
      updateTask(id, updates);
      return;
    }

    const {
      dueDate,
      dueTime,
      dueReminderOffsets,
      ...sharedUpdates
    } = updates;
    const projectUpdates: Partial<ProjectTask> = {
      ...sharedUpdates,
      ...('dueDate' in updates ? { deadline: dueDate } : {}),
      ...('dueTime' in updates ? { deadlineTime: dueTime } : {}),
      ...('dueReminderOffsets' in updates ? { deadlineReminderOffsets: dueReminderOffsets } : {}),
    };
    updateProjectTask(getProjectTaskId(id), projectUpdates);
  }, [updateProjectTask, updateTask]);

  return { schedule, unschedule, setInbox, update };
}
