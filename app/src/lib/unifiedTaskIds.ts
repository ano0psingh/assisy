export const PROJECT_TASK_PREFIX = 'pt-';

export function isUnifiedProjectTaskId(id: string): boolean {
  return id.startsWith(PROJECT_TASK_PREFIX);
}

export function getProjectTaskId(id: string): string {
  return isUnifiedProjectTaskId(id) ? id.slice(PROJECT_TASK_PREFIX.length) : id;
}

export function toUnifiedProjectTaskId(id: string): string {
  return isUnifiedProjectTaskId(id) ? id : `${PROJECT_TASK_PREFIX}${id}`;
}
