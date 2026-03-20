import { useEffect, useRef } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { useGoalContext } from '../../context/GoalContext';

export function RecurringXPEffect() {
  const { tasks } = useTaskContext();
  const { addXPToGoal } = useGoalContext();
  const lastSeenCompletions = useRef<Record<string, number>>({});

  useEffect(() => {
    for (const task of tasks) {
      if (!task.isRecurring || !task.goalId || !task.completionLog) continue;
      const logCount = task.completionLog.length;
      const lastSeen = lastSeenCompletions.current[task.id] || 0;
      if (logCount > lastSeen) {
        const newCompletions = logCount - lastSeen;
        addXPToGoal(task.goalId, newCompletions * 10);
      }
      lastSeenCompletions.current[task.id] = logCount;
    }
  }, [tasks, addXPToGoal]);

  return null;
}
