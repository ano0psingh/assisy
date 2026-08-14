import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Project, SubProject, ProjectTask, WorkItemStatus, ProjectStatus, BulkPatch } from '../types';
import { saveProjects, saveSubProjects, saveProjectTasks } from '../store/unifiedStore';
import { collectBulkPatches, revertBulkUpdate } from '../lib/bulkUpdate';
import { useAuth } from './AuthContext';
import { useDataVersion } from './DataVersionContext';

// Storage keys
const PROJECTS_KEY = 'assisy_projects';
const SUBPROJECTS_KEY = 'assisy_subprojects';
const PROJECT_TASKS_KEY = 'assisy_project_tasks';

// Default project colors
export const PROJECT_COLORS = [
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

// Default tags
export const DEFAULT_TAGS = ['bug', 'feature', 'urgent', 'research', 'documentation', 'refactor', 'testing'];

/**
 * Everything removed by a bulk delete. Projects cascade into sub-projects and
 * sub-projects into tasks, so an undo has to put all three levels back.
 */
export interface ProjectSnapshot {
  projects: Project[];
  subProjects: SubProject[];
  projectTasks: ProjectTask[];
}

interface ProjectContextType {
  // Data
  projects: Project[];
  subProjects: SubProject[];
  projectTasks: ProjectTask[];
  loading: boolean;

  // Project CRUD
  createProject: (title: string, description?: string, color?: string, deadline?: Date) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  deleteProjects: (ids: string[]) => ProjectSnapshot;
  getProject: (id: string) => Project | undefined;

  // Bulk delete / restore
  deleteSubProjects: (ids: string[]) => ProjectSnapshot;
  deleteProjectTasks: (ids: string[]) => ProjectSnapshot;
  restoreProjectData: (snapshot: ProjectSnapshot) => void;

  // Sub-Project CRUD
  createSubProject: (projectId: string, title: string, description?: string, deadline?: Date) => SubProject;
  updateSubProject: (id: string, updates: Partial<SubProject>) => void;
  deleteSubProject: (id: string) => void;
  getSubProject: (id: string) => SubProject | undefined;
  getSubProjectsByProject: (projectId: string) => SubProject[];

  // Task CRUD
  createProjectTask: (
    subProjectId: string,
    title: string,
    description?: string,
    priority?: 'High' | 'Medium' | 'Low',
    effort?: 'High' | 'Medium' | 'Low',
    parentTaskId?: string,
    deadline?: Date
  ) => ProjectTask;
  updateProjectTask: (id: string, updates: Partial<ProjectTask>) => void;
  /** Applies the same updates to many project tasks, returning patches for undo. */
  updateProjectTasks: (ids: string[], updates: Partial<ProjectTask>) => BulkPatch<ProjectTask>[];
  /** Puts back the field values captured by {@link updateProjectTasks}. */
  revertProjectTasks: (patches: BulkPatch<ProjectTask>[]) => void;
  deleteProjectTask: (id: string) => void;
  getProjectTask: (id: string) => ProjectTask | undefined;
  getTasksBySubProject: (subProjectId: string) => ProjectTask[];
  getSubTasks: (parentTaskId: string) => ProjectTask[];

  // Status management
  updateTaskStatus: (taskId: string, status: WorkItemStatus) => void;
  updateSubProjectStatus: (subProjectId: string, status: WorkItemStatus) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;

  // Tags
  addTagToTask: (taskId: string, tag: string) => void;
  removeTagFromTask: (taskId: string, tag: string) => void;
  addTagToSubProject: (subProjectId: string, tag: string) => void;
  removeTagFromSubProject: (subProjectId: string, tag: string) => void;

  // Time tracking
  logTime: (taskId: string, minutes: number) => void;

  // Today integration
  addTaskToToday: (taskId: string) => void;
  removeTaskFromToday: (taskId: string) => void;
  getTodaysProjectTasks: () => ProjectTask[];

  // Progress calculation
  getProjectProgress: (projectId: string) => number;
  getSubProjectProgress: (subProjectId: string) => number;
  getTaskProgress: (taskId: string) => number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { dataVersion } = useDataVersion();
  const userId = user?.id ?? null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_KEY);
      const storedSubProjects = localStorage.getItem(SUBPROJECTS_KEY);
      const storedTasks = localStorage.getItem(PROJECT_TASKS_KEY);

      if (storedProjects) {
        setProjects(JSON.parse(storedProjects).map((p: Project) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          deadline: p.deadline ? new Date(p.deadline) : undefined,
        })));
      }

      if (storedSubProjects) {
        setSubProjects(JSON.parse(storedSubProjects).map((sp: SubProject) => ({
          ...sp,
          createdAt: new Date(sp.createdAt),
          updatedAt: new Date(sp.updatedAt),
          deadline: sp.deadline ? new Date(sp.deadline) : undefined,
        })));
      }

      if (storedTasks) {
        setProjectTasks(JSON.parse(storedTasks).map((t: ProjectTask) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          deadline: t.deadline ? new Date(t.deadline) : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  }, [dataVersion]);

  // Save to store (local or cloud)
  useEffect(() => {
    if (!loading) saveProjects(projects, userId);
  }, [projects, loading, userId]);

  useEffect(() => {
    if (!loading) saveSubProjects(subProjects, userId);
  }, [subProjects, loading, userId]);

  useEffect(() => {
    if (!loading) saveProjectTasks(projectTasks, userId);
  }, [projectTasks, loading, userId]);

  // ============ Project CRUD ============

  const createProject = useCallback((
    title: string,
    description?: string,
    color?: string,
    deadline?: Date
  ): Project => {
    const newProject: Project = {
      id: uuidv4(),
      title,
      description,
      status: 'Active',
      color: color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      tags: [],
      subProjectIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    // Get all sub-projects of this project
    const projectSubProjects = subProjects.filter(sp => sp.projectId === id);
    const subProjectIds = projectSubProjects.map(sp => sp.id);
    
    // Delete all tasks belonging to these sub-projects
    setProjectTasks(prev => prev.filter(t => !subProjectIds.includes(t.subProjectId)));
    
    // Delete all sub-projects
    setSubProjects(prev => prev.filter(sp => sp.projectId !== id));
    
    // Delete project
    setProjects(prev => prev.filter(p => p.id !== id));
  }, [subProjects]);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  // ============ Sub-Project CRUD ============

  const createSubProject = useCallback((
    projectId: string,
    title: string,
    description?: string,
    deadline?: Date
  ): SubProject => {
    const newSubProject: SubProject = {
      id: uuidv4(),
      projectId,
      title,
      description,
      status: 'Backlog',
      tags: [],
      taskIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline,
    };
    
    setSubProjects(prev => [...prev, newSubProject]);
    
    // Add to parent project
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, subProjectIds: [...p.subProjectIds, newSubProject.id], updatedAt: new Date() }
        : p
    ));
    
    return newSubProject;
  }, []);

  const updateSubProject = useCallback((id: string, updates: Partial<SubProject>) => {
    setSubProjects(prev => prev.map(sp =>
      sp.id === id ? { ...sp, ...updates, updatedAt: new Date() } : sp
    ));
  }, []);

  const deleteSubProject = useCallback((id: string) => {
    const subProject = subProjects.find(sp => sp.id === id);
    if (!subProject) return;

    // Delete all tasks belonging to this sub-project
    setProjectTasks(prev => prev.filter(t => t.subProjectId !== id));
    
    // Remove from parent project
    setProjects(prev => prev.map(p =>
      p.id === subProject.projectId
        ? { ...p, subProjectIds: p.subProjectIds.filter(spId => spId !== id), updatedAt: new Date() }
        : p
    ));
    
    // Delete sub-project
    setSubProjects(prev => prev.filter(sp => sp.id !== id));
  }, [subProjects]);

  const getSubProject = useCallback((id: string) => {
    return subProjects.find(sp => sp.id === id);
  }, [subProjects]);

  const getSubProjectsByProject = useCallback((projectId: string) => {
    return subProjects.filter(sp => sp.projectId === projectId);
  }, [subProjects]);

  // ============ Task CRUD ============

  const createProjectTask = useCallback((
    subProjectId: string,
    title: string,
    description?: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium',
    effort: 'High' | 'Medium' | 'Low' = 'Medium',
    parentTaskId?: string,
    deadline?: Date
  ): ProjectTask => {
    const subProject = subProjects.find(sp => sp.id === subProjectId);
    if (!subProject) throw new Error('Sub-project not found');

    const newTask: ProjectTask = {
      id: uuidv4(),
      title,
      description,
      status: 'Backlog',
      projectId: subProject.projectId,
      subProjectId,
      parentTaskId,
      subTaskIds: [],
      tags: [],
      priority,
      effort,
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline,
    };

    setProjectTasks(prev => [...prev, newTask]);

    // Add to sub-project if not a sub-task
    if (!parentTaskId) {
      setSubProjects(prev => prev.map(sp =>
        sp.id === subProjectId
          ? { ...sp, taskIds: [...sp.taskIds, newTask.id], updatedAt: new Date() }
          : sp
      ));
    } else {
      // Add to parent task's subTaskIds
      setProjectTasks(prev => prev.map(t =>
        t.id === parentTaskId
          ? { ...t, subTaskIds: [...t.subTaskIds, newTask.id], updatedAt: new Date() }
          : t
      ));
    }

    return newTask;
  }, [subProjects]);

  const updateProjectTask = useCallback((id: string, updates: Partial<ProjectTask>) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
  }, []);

  const updateProjectTasks = useCallback((ids: string[], updates: Partial<ProjectTask>): BulkPatch<ProjectTask>[] => {
    // updatedAt is stamped alongside the edit, so capture it or undo would
    // leave the row looking freshly touched.
    const patches = collectBulkPatches(projectTasks, ids, updates, ['updatedAt']);
    if (patches.length === 0) return [];
    const targets = new Set(ids);
    setProjectTasks(prev => prev.map(t =>
      targets.has(t.id) ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
    return patches;
  }, [projectTasks]);

  const revertProjectTasks = useCallback((patches: BulkPatch<ProjectTask>[]) => {
    if (patches.length === 0) return;
    setProjectTasks(prev => revertBulkUpdate(prev, patches));
  }, []);

  const deleteProjectTask = useCallback((id: string) => {
    const task = projectTasks.find(t => t.id === id);
    if (!task) return;

    // Recursively delete sub-tasks
    const deleteSubTasksRecursive = (taskId: string) => {
      const subTasks = projectTasks.filter(t => t.parentTaskId === taskId);
      subTasks.forEach(st => deleteSubTasksRecursive(st.id));
      setProjectTasks(prev => prev.filter(t => t.id !== taskId));
    };

    // Delete all sub-tasks first
    task.subTaskIds.forEach(stId => deleteSubTasksRecursive(stId));

    // Remove from parent (sub-project or parent task)
    if (task.parentTaskId) {
      setProjectTasks(prev => prev.map(t =>
        t.id === task.parentTaskId
          ? { ...t, subTaskIds: t.subTaskIds.filter(stId => stId !== id), updatedAt: new Date() }
          : t
      ));
    } else {
      setSubProjects(prev => prev.map(sp =>
        sp.id === task.subProjectId
          ? { ...sp, taskIds: sp.taskIds.filter(tId => tId !== id), updatedAt: new Date() }
          : sp
      ));
    }

    // Delete the task
    setProjectTasks(prev => prev.filter(t => t.id !== id));
  }, [projectTasks]);

  // ============ Bulk delete / restore ============

  /** Expands task ids to include every nested sub-task. */
  const collectTaskIds = useCallback((rootIds: string[]): Set<string> => {
    const doomed = new Set<string>();
    const walk = (taskId: string) => {
      if (doomed.has(taskId)) return;
      doomed.add(taskId);
      projectTasks.forEach(t => { if (t.parentTaskId === taskId) walk(t.id); });
    };
    rootIds.forEach(walk);
    return doomed;
  }, [projectTasks]);

  /**
   * Removes the given rows in one pass and strips the ids from any surviving
   * parent's link arrays.
   */
  const applyBulkDelete = useCallback((
    projectIds: Set<string>,
    subProjectIds: Set<string>,
    taskIds: Set<string>,
  ) => {
    if (projectIds.size > 0) {
      setProjects(prev => prev.filter(p => !projectIds.has(p.id)));
    }
    if (subProjectIds.size > 0) {
      setProjects(prev => prev.map(p =>
        p.subProjectIds.some(id => subProjectIds.has(id))
          ? { ...p, subProjectIds: p.subProjectIds.filter(id => !subProjectIds.has(id)), updatedAt: new Date() }
          : p
      ));
      setSubProjects(prev => prev.filter(sp => !subProjectIds.has(sp.id)));
    }
    if (taskIds.size > 0) {
      setSubProjects(prev => prev.map(sp =>
        sp.taskIds.some(id => taskIds.has(id))
          ? { ...sp, taskIds: sp.taskIds.filter(id => !taskIds.has(id)), updatedAt: new Date() }
          : sp
      ));
      setProjectTasks(prev => prev
        .filter(t => !taskIds.has(t.id))
        .map(t => t.subTaskIds.some(id => taskIds.has(id))
          ? { ...t, subTaskIds: t.subTaskIds.filter(id => !taskIds.has(id)), updatedAt: new Date() }
          : t
        )
      );
    }
  }, []);

  const deleteProjects = useCallback((ids: string[]): ProjectSnapshot => {
    const projectIds = new Set(ids);
    const doomedSubProjects = subProjects.filter(sp => projectIds.has(sp.projectId));
    const subProjectIds = new Set(doomedSubProjects.map(sp => sp.id));
    const doomedTasks = projectTasks.filter(t => subProjectIds.has(t.subProjectId));
    const taskIds = new Set(doomedTasks.map(t => t.id));

    const snapshot: ProjectSnapshot = {
      projects: projects.filter(p => projectIds.has(p.id)),
      subProjects: doomedSubProjects,
      projectTasks: doomedTasks,
    };
    if (snapshot.projects.length === 0) return snapshot;

    applyBulkDelete(projectIds, subProjectIds, taskIds);
    return snapshot;
  }, [projects, subProjects, projectTasks, applyBulkDelete]);

  const deleteSubProjects = useCallback((ids: string[]): ProjectSnapshot => {
    const subProjectIds = new Set(ids);
    const doomedTasks = projectTasks.filter(t => subProjectIds.has(t.subProjectId));
    const snapshot: ProjectSnapshot = {
      projects: [],
      subProjects: subProjects.filter(sp => subProjectIds.has(sp.id)),
      projectTasks: doomedTasks,
    };
    if (snapshot.subProjects.length === 0) return snapshot;

    applyBulkDelete(new Set(), subProjectIds, new Set(doomedTasks.map(t => t.id)));
    return snapshot;
  }, [subProjects, projectTasks, applyBulkDelete]);

  const deleteProjectTasks = useCallback((ids: string[]): ProjectSnapshot => {
    const taskIds = collectTaskIds(ids);
    const snapshot: ProjectSnapshot = {
      projects: [],
      subProjects: [],
      projectTasks: projectTasks.filter(t => taskIds.has(t.id)),
    };
    if (snapshot.projectTasks.length === 0) return snapshot;

    applyBulkDelete(new Set(), new Set(), taskIds);
    return snapshot;
  }, [projectTasks, collectTaskIds, applyBulkDelete]);

  const restoreProjectData = useCallback((snapshot: ProjectSnapshot) => {
    const { projects: p, subProjects: sp, projectTasks: pt } = snapshot;
    if (p.length === 0 && sp.length === 0 && pt.length === 0) return;

    if (p.length > 0) {
      setProjects(prev => {
        const existing = new Set(prev.map(x => x.id));
        return [...prev, ...p.filter(x => !existing.has(x.id))];
      });
    }
    if (sp.length > 0) {
      setSubProjects(prev => {
        const existing = new Set(prev.map(x => x.id));
        return [...prev, ...sp.filter(x => !existing.has(x.id))];
      });
    }
    if (pt.length > 0) {
      setProjectTasks(prev => {
        const existing = new Set(prev.map(x => x.id));
        return [...prev, ...pt.filter(x => !existing.has(x.id))];
      });
    }

    // Re-attach the restored rows to their parents' link arrays, derived from
    // the children's own foreign keys rather than a stale copy of the parent.
    if (sp.length > 0) {
      setProjects(prev => prev.map(project => {
        const children = sp.filter(x => x.projectId === project.id).map(x => x.id);
        if (children.length === 0) return project;
        return { ...project, subProjectIds: Array.from(new Set([...project.subProjectIds, ...children])) };
      }));
    }
    if (pt.length > 0) {
      const topLevel = pt.filter(t => !t.parentTaskId);
      if (topLevel.length > 0) {
        setSubProjects(prev => prev.map(subProject => {
          const children = topLevel.filter(t => t.subProjectId === subProject.id).map(t => t.id);
          if (children.length === 0) return subProject;
          return { ...subProject, taskIds: Array.from(new Set([...subProject.taskIds, ...children])) };
        }));
      }
      setProjectTasks(prev => prev.map(task => {
        const children = pt.filter(t => t.parentTaskId === task.id).map(t => t.id);
        if (children.length === 0) return task;
        return { ...task, subTaskIds: Array.from(new Set([...task.subTaskIds, ...children])) };
      }));
    }
  }, []);

  const getProjectTask = useCallback((id: string) => {
    return projectTasks.find(t => t.id === id);
  }, [projectTasks]);

  const getTasksBySubProject = useCallback((subProjectId: string) => {
    return projectTasks.filter(t => t.subProjectId === subProjectId && !t.parentTaskId);
  }, [projectTasks]);

  const getSubTasks = useCallback((parentTaskId: string) => {
    return projectTasks.filter(t => t.parentTaskId === parentTaskId);
  }, [projectTasks]);

  // ============ Status Management ============

  const updateTaskStatus = useCallback((taskId: string, status: WorkItemStatus) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            status,
            updatedAt: new Date(),
            completedAt: status === 'Done' ? new Date() : undefined,
          }
        : t
    ));
  }, []);

  const updateSubProjectStatus = useCallback((subProjectId: string, status: WorkItemStatus) => {
    setSubProjects(prev => prev.map(sp =>
      sp.id === subProjectId ? { ...sp, status, updatedAt: new Date() } : sp
    ));
  }, []);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, status, updatedAt: new Date() } : p
    ));
  }, []);

  // ============ Tags ============

  const addTagToTask = useCallback((taskId: string, tag: string) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId && !t.tags.includes(tag)
        ? { ...t, tags: [...t.tags, tag], updatedAt: new Date() }
        : t
    ));
  }, []);

  const removeTagFromTask = useCallback((taskId: string, tag: string) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, tags: t.tags.filter(tg => tg !== tag), updatedAt: new Date() }
        : t
    ));
  }, []);

  const addTagToSubProject = useCallback((subProjectId: string, tag: string) => {
    setSubProjects(prev => prev.map(sp =>
      sp.id === subProjectId && !sp.tags.includes(tag)
        ? { ...sp, tags: [...sp.tags, tag], updatedAt: new Date() }
        : sp
    ));
  }, []);

  const removeTagFromSubProject = useCallback((subProjectId: string, tag: string) => {
    setSubProjects(prev => prev.map(sp =>
      sp.id === subProjectId
        ? { ...sp, tags: sp.tags.filter(tg => tg !== tag), updatedAt: new Date() }
        : sp
    ));
  }, []);

  // ============ Time Tracking ============

  const logTime = useCallback((taskId: string, minutes: number) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, timeSpent: (t.timeSpent || 0) + minutes, updatedAt: new Date() }
        : t
    ));
  }, []);

  // ============ Today Integration ============

  const addTaskToToday = useCallback((taskId: string) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, isFocusedToday: true, focusedDate: today, updatedAt: new Date() }
        : t
    ));
  }, []);

  const removeTaskFromToday = useCallback((taskId: string) => {
    setProjectTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, isFocusedToday: false, focusedDate: undefined, updatedAt: new Date() }
        : t
    ));
  }, []);

  const getTodaysProjectTasks = useCallback(() => {
    // Show all tasks marked as focused today, regardless of the original date
    // This ensures tasks added on previous days still appear if user wants them today
    return projectTasks.filter(t => t.isFocusedToday && t.status !== 'Done');
  }, [projectTasks]);

  // ============ Progress Calculation ============

  const getTaskProgress = useCallback((taskId: string): number => {
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return 0;
    
    if (task.status === 'Done') return 100;
    
    const subTasks = projectTasks.filter(t => t.parentTaskId === taskId);
    if (subTasks.length === 0) {
      return task.status === 'In Progress' ? 50 : 0;
    }
    
    const completedSubTasks = subTasks.filter(st => st.status === 'Done').length;
    return Math.round((completedSubTasks / subTasks.length) * 100);
  }, [projectTasks]);

  const getSubProjectProgress = useCallback((subProjectId: string): number => {
    const tasks = projectTasks.filter(t => t.subProjectId === subProjectId && !t.parentTaskId);
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [projectTasks]);

  const getProjectProgress = useCallback((projectId: string): number => {
    const projectSubProjects = subProjects.filter(sp => sp.projectId === projectId);
    if (projectSubProjects.length === 0) return 0;
    
    const totalProgress = projectSubProjects.reduce((sum, sp) => {
      return sum + getSubProjectProgress(sp.id);
    }, 0);
    
    return Math.round(totalProgress / projectSubProjects.length);
  }, [subProjects, getSubProjectProgress]);

  const value: ProjectContextType = {
    projects,
    subProjects,
    projectTasks,
    loading,
    createProject,
    updateProject,
    deleteProject,
    deleteProjects,
    getProject,
    deleteSubProjects,
    deleteProjectTasks,
    restoreProjectData,
    createSubProject,
    updateSubProject,
    deleteSubProject,
    getSubProject,
    getSubProjectsByProject,
    createProjectTask,
    updateProjectTask,
    updateProjectTasks,
    revertProjectTasks,
    deleteProjectTask,
    getProjectTask,
    getTasksBySubProject,
    getSubTasks,
    updateTaskStatus,
    updateSubProjectStatus,
    updateProjectStatus,
    addTagToTask,
    removeTagFromTask,
    addTagToSubProject,
    removeTagFromSubProject,
    logTime,
    addTaskToToday,
    removeTaskFromToday,
    getTodaysProjectTasks,
    getProjectProgress,
    getSubProjectProgress,
    getTaskProgress,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
}
