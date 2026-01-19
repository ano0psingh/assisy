import type { Task, Priority, Effort } from '../types';

const BASE_XP = 10;

export function calculateXP(priority: Priority, effort: Effort): number {
  if (priority === 'High' && effort === 'High') {
    return BASE_XP * 4;
  } else if (priority === 'High' && effort === 'Low') {
    return BASE_XP * 2;
  } else if (priority === 'Low' && effort === 'High') {
    return BASE_XP * 2;
  } else {
    return BASE_XP * 1;
  }
}

export function getTaskXPValue(task: Task): number {
  if (task.category === 'Professional') {
    return 0;
  }
  return calculateXP(task.priority, task.effort);
}