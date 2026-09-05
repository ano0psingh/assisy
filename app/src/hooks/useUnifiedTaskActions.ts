import { useCallback } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { useTaskContext, type TaskScheduleInput } from '../context/TaskContext';
import type { ProjectTask, Task } from '../types';
import { getProjectTaskId, isUnifiedProjectTaskId } from '../lib/unifiedTaskIds';

export { getProjectTaskId, isUnifiedProjectTaskId } from '../lib/unifiedTaskIds';

export type UnifiedTaskUpdate = Partial<Pick<
  Task,
  | 'title'
  | 'description'
  | 'inbox'
  | 'scheduledDate'
  | 'scheduledTime'
  | 'durationMinutes'
  | 'focusedDate'
  | 'isFocusedToday'
  | 'dueDate'
>>;

/** Route cross-cutting task actions to the owning context. */
export function useUnifiedTaskActions() {
  const {
    updateTask,
    scheduleTask,
    unscheduleTask,
    setTaskInbox,
  } = useTaskContext();
  const {
    updateProjectTask,
    scheduleProjectTask,
    unscheduleProjectTask,
    setProjectTaskInbox,
  } = useProjectContext();

  const schedule = useCallback((id: string, input: TaskScheduleInput) => {
    if (isUnifiedProjectTaskId(id)) {
      scheduleProjectTask(getProjectTaskId(id), input);
    } else {
      scheduleTask(id, input);
    }
  }, [scheduleProjectTask, scheduleTask]);

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
      ...sharedUpdates
    } = updates;
    const projectUpdates: Partial<ProjectTask> = {
      ...sharedUpdates,
      ...('dueDate' in updates ? { deadline: dueDate } : {}),
    };
    updateProjectTask(getProjectTaskId(id), projectUpdates);
  }, [updateProjectTask, updateTask]);

  return { schedule, unschedule, setInbox, update };
}
