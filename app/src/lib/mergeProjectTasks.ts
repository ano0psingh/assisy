import type { Task, ProjectTask, Project, SubProject } from '../types';

export function projectTasksToTasks(
  subProjects: SubProject[],
  projects: Project[],
  getTasksBySubProject: (spId: string) => ProjectTask[],
): Task[] {
  const items: Task[] = [];
  for (const sp of subProjects) {
    const pTasks = getTasksBySubProject(sp.id);
    const project = projects.find(p => p.id === sp.projectId);
    for (const pt of pTasks) {
      items.push({
        id: `pt-${pt.id}`,
        title: `${pt.title}${project ? ` (${project.title})` : ''}`,
        category: 'Professional',
        priority: pt.priority === 'Medium' ? 'High' : pt.priority as 'High' | 'Low',
        effort: pt.effort === 'Medium' ? 'Low' : pt.effort as 'High' | 'Low',
        status: pt.status === 'Done' ? 'Completed' : pt.status === 'In Progress' ? 'Pending' : 'Pending',
        completedAt: pt.completedAt,
        createdAt: pt.createdAt,
        dueDate: pt.deadline,
        focusedDate: pt.focusedDate,
        isFocusedToday: pt.isFocusedToday,
        isRecurring: false,
        xpValue: 0,
        description: pt.description ?? '',
      } as Task);
    }
  }
  return items;
}
