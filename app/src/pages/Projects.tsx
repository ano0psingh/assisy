import { useState, useMemo, useEffect, useCallback } from 'react';
import { useProjectContext, PROJECT_COLORS, type ProjectSnapshot } from '../context/ProjectContext';
import { 
  Plus, FolderKanban, ChevronRight, 
  Pencil, Trash2, Play, CheckCircle2, Circle,
  X, ListTodo, Layers,
  CalendarPlus, CalendarCheck, ChevronLeft,
  LayoutGrid, Table2, Sparkles, Loader2, Check, Search,
} from 'lucide-react';
import type { Project, SubProject, ProjectTask, WorkItemStatus, ProjectStatus, ReminderOffsetMinutes } from '../types';
import { TiptapEditor } from '../components/common/TiptapEditor';
import { ExpandableModal } from '../components/common/ExpandableModal';
import { TaskSheet } from '../components/projects/TaskSheet';
import { useUndo } from '../components/common/UndoToast';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkEditMenu, type BulkEditField } from '../components/common/BulkEditMenu';
import { SelectButton, SelectionCheckbox } from '../components/common/SelectionControls';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import { usePersistentState } from '../hooks/usePersistentState';
import { parseDateInput, pluralise } from '../lib/bulkUpdate';
import { askAIJson, isAIConfigured } from '../lib/ai';
import { getLocalDateString } from '../lib/dateUtils';
import { Button, IconButton } from '../components/ui';
import { ReminderOffsetPicker } from '../components/tasks/ReminderOffsetPicker';

const PROJECT_TASK_BULK_FIELDS: BulkEditField[] = [
  {
    key: 'priority',
    label: 'Priority',
    kind: 'choice',
    options: [
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ],
  },
  {
    key: 'effort',
    label: 'Effort',
    kind: 'choice',
    options: [
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ],
  },
  { key: 'deadline', label: 'Deadline', kind: 'date' },
];

interface AIPlanTask {
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  selected: boolean;
}

interface AIPlanSubProject {
  title: string;
  tasks: AIPlanTask[];
  selected: boolean;
}

type PageView = 'cards' | 'sheet';
type DetailView = 'none' | 'project' | 'subproject';

export function Projects() {
  const {
    projects,
    subProjects,
    projectTasks,
    loading,
    createProject,
    updateProject,
    deleteProject,
    deleteProjects,
    deleteSubProjects,
    deleteProjectTasks,
    restoreProjectData,
    getProjectProgress,
    createSubProject,
    updateSubProject,
    deleteSubProject,
    getSubProjectsByProject,
    getSubProjectProgress,
    createProjectTask,
    updateProjectTask,
    deleteProjectTask,
    getTasksBySubProject,
    getSubTasks,
    updateProjectTasks,
    revertProjectTasks,
    updateTaskStatus,
    addTaskToToday,
    removeTaskFromToday,
  } = useProjectContext();

  const { pushUndo } = useUndo();

  // View state — the drill-down position persists too, so leaving the page and
  // coming back no longer dumps you at the top level.
  const [pageView, setPageView] = usePersistentState<PageView>('assisy_projects_pageview', 'cards');
  const [detailView, setDetailView] = usePersistentState<DetailView>('assisy_projects_detailview', 'none');
  const [selectedProjectId, setSelectedProjectId] = usePersistentState<string | null>('assisy_projects_selected', null);
  const [selectedSubProjectId, setSelectedSubProjectId] = usePersistentState<string | null>('assisy_projects_selected_sub', null);

  // Derive selected project/subproject from context to stay in sync
  const selectedProject = useMemo(() => 
    selectedProjectId ? projects.find(p => p.id === selectedProjectId) || null : null,
    [selectedProjectId, projects]
  );
  
  const selectedSubProject = useMemo(() => 
    selectedSubProjectId ? subProjects.find(sp => sp.id === selectedSubProjectId) || null : null,
    [selectedSubProjectId, subProjects]
  );

  // A persisted drill-down can outlive what it pointed at, if the project was
  // deleted here or on another device. Without this the page renders an empty
  // detail shell you can only escape with the back button.
  useEffect(() => {
    if (loading) return;
    if (detailView === 'project' && !selectedProject) {
      setDetailView('none');
      setSelectedProjectId(null);
    } else if (detailView === 'subproject' && !selectedSubProject) {
      setDetailView(selectedProject ? 'project' : 'none');
      setSelectedSubProjectId(null);
    }
  }, [loading, detailView, selectedProject, selectedSubProject, setDetailView, setSelectedProjectId, setSelectedSubProjectId]);

  // Form states
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isSubProjectFormOpen, setIsSubProjectFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSubProject, setEditingSubProject] = useState<SubProject | null>(null);
  
  // Filter states
  const [projectStatusFilter, setProjectStatusFilter] = usePersistentState<ProjectStatus | 'All'>('assisy_projects_status', 'All');
  const [subProjectStatusFilter, setSubProjectStatusFilter] = usePersistentState<WorkItemStatus | 'All'>('assisy_subprojects_status', 'All');
  const [taskStatusFilter, setTaskStatusFilter] = usePersistentState<WorkItemStatus | 'All'>('assisy_projecttasks_status', 'All');
  const [searchQuery, setSearchQuery] = useState('');

  // Arriving from global search. A project task lives two levels down, so the
  // page has to open the right project and sub-project before the row exists
  // for the highlight to find.
  const handleSearchFocus = useCallback((id: string) => {
    setPageView('cards');
    setProjectStatusFilter('All');
    setSearchQuery('');

    const task = projectTasks.find(t => t.id === id);
    if (task) {
      setSelectedProjectId(task.projectId);
      setSelectedSubProjectId(task.subProjectId);
      setSubProjectStatusFilter('All');
      setTaskStatusFilter('All');
      setDetailView('subproject');
      return;
    }
    // A project itself: show the top-level list rather than a detail pane.
    if (projects.some(p => p.id === id)) {
      setDetailView('none');
      setSelectedProjectId(null);
      setSelectedSubProjectId(null);
    }
  }, [projectTasks, projects, setPageView, setProjectStatusFilter, setSelectedProjectId,
      setSelectedSubProjectId, setSubProjectStatusFilter, setTaskStatusFilter, setDetailView]);
  useFocusHighlight(handleSearchFocus);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  // Form data
  const [projectForm, setProjectForm] = useState({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' as ProjectStatus });
  const [subProjectForm, setSubProjectForm] = useState({ title: '', description: '', deadline: '', status: 'Backlog' as WorkItemStatus });
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    effort: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: '',
    deadlineTime: '',
    deadlineReminderOffsets: [] as ReminderOffsetMinutes[],
    parentTaskId: '',
  });

  // AI Plan state
  const [aiPlan, setAiPlan] = useState<AIPlanSubProject[] | null>(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);

  const handleGenerateAIPlan = async () => {
    if (!projectForm.title.trim()) return;
    setAiPlanLoading(true);
    setAiPlanError(null);
    try {
      const result = await askAIJson<{ subProjects: { title: string; tasks: { title: string; priority: 'High' | 'Medium' | 'Low'; effort: 'High' | 'Medium' | 'Low' }[] }[] }>(
        `Create a project plan for: ${projectForm.title}. Description: ${projectForm.description || 'No description provided'}. Generate sub-projects and tasks to achieve this project's goals. Respond with JSON: {"subProjects": [{"title": string, "tasks": [{"title": string, "priority": "High"|"Medium"|"Low", "effort": "High"|"Medium"|"Low"}]}]}`,
      );
      if (result.subProjects) {
        setAiPlan(result.subProjects.map(sp => ({
          ...sp,
          selected: true,
          tasks: sp.tasks.map(t => ({ ...t, selected: true })),
        })));
      }
    } catch {
      setAiPlanError('Failed to generate plan. Try again.');
    } finally {
      setAiPlanLoading(false);
    }
  };

  const handleCreatePlanItems = (projectId: string) => {
    if (!aiPlan) return;
    for (const sp of aiPlan) {
      if (!sp.selected) continue;
      const newSP = createSubProject(projectId, sp.title);
      for (const task of sp.tasks) {
        if (task.selected) {
          createProjectTask(newSP.id, task.title, undefined, task.priority, task.effort);
        }
      }
    }
    setAiPlan(null);
  };

  const handleCreateProjectWithPlan = () => {
    if (!projectForm.title.trim()) return;
    const newProject = createProject(
      projectForm.title,
      projectForm.description,
      projectForm.color,
      projectForm.deadline ? new Date(projectForm.deadline) : undefined,
    );
    if (aiPlan) {
      handleCreatePlanItems(newProject.id);
    }
    setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' });
    setAiPlan(null);
    setIsProjectFormOpen(false);
  };

  const toggleSubProjectSelection = (spIndex: number) => {
    setAiPlan(prev => prev?.map((sp, i) =>
      i === spIndex ? { ...sp, selected: !sp.selected, tasks: sp.tasks.map(t => ({ ...t, selected: !sp.selected })) } : sp
    ) ?? null);
  };

  const toggleTaskSelection = (spIndex: number, taskIndex: number) => {
    setAiPlan(prev => prev?.map((sp, i) =>
      i === spIndex ? { ...sp, tasks: sp.tasks.map((t, j) => j === taskIndex ? { ...t, selected: !t.selected } : t) } : sp
    ) ?? null);
  };

  // Filter projects by status
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = projects;
    if (projectStatusFilter !== 'All') {
      filtered = filtered.filter(p => p.status === projectStatusFilter);
    }
    if (query) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.description?.toLowerCase().includes(query) ?? false) ||
        p.tags.some(tag => tag.toLowerCase().includes(query)),
      );
    }
    return [...filtered].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [projects, projectStatusFilter, searchQuery]);

  const visibleProjectIds = useMemo(() => filteredProjects.map(p => p.id), [filteredProjects]);

  // Sub-projects and tasks live in the detail pane, which is on screen next to
  // the project list on desktop, so each level gets its own selection scope.
  const visibleSubProjectIds = useMemo(() => {
    if (detailView !== 'project' || !selectedProject) return [];
    return getSubProjectsByProject(selectedProject.id)
      .filter(sp => subProjectStatusFilter === 'All' || sp.status === subProjectStatusFilter)
      .map(sp => sp.id);
  }, [detailView, selectedProject, subProjectStatusFilter, getSubProjectsByProject]);

  const visibleProjectTaskIds = useMemo(() => {
    if (detailView !== 'subproject' || !selectedSubProject) return [];
    return getTasksBySubProject(selectedSubProject.id)
      .filter(t => taskStatusFilter === 'All' || t.status === taskStatusFilter)
      .map(t => t.id);
  }, [detailView, selectedSubProject, taskStatusFilter, getTasksBySubProject]);

  const selection = useBulkSelection(visibleProjectIds);
  const subProjectSelection = useBulkSelection(visibleSubProjectIds);
  const taskSelection = useBulkSelection(visibleProjectTaskIds);

  // Only one pane may be in selection mode, otherwise two action bars would
  // stack on top of each other.
  const startProjectSelection = () => { subProjectSelection.clear(); taskSelection.clear(); selection.start(); };
  const startSubProjectSelection = () => { selection.clear(); taskSelection.clear(); subProjectSelection.start(); };
  const startTaskSelection = () => { selection.clear(); subProjectSelection.clear(); taskSelection.start(); };

  /** Turns a snapshot into an undo toast describing everything that went. */
  const pushSnapshotUndo = (snapshot: ProjectSnapshot) => {
    const parts: string[] = [];
    if (snapshot.projects.length > 0) {
      parts.push(`${snapshot.projects.length} project${snapshot.projects.length === 1 ? '' : 's'}`);
    }
    if (snapshot.subProjects.length > 0) {
      parts.push(`${snapshot.subProjects.length} sub-project${snapshot.subProjects.length === 1 ? '' : 's'}`);
    }
    if (snapshot.projectTasks.length > 0) {
      parts.push(`${snapshot.projectTasks.length} task${snapshot.projectTasks.length === 1 ? '' : 's'}`);
    }
    if (parts.length === 0) return;
    pushUndo(`${parts.join(', ')} deleted`, () => restoreProjectData(snapshot));
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    const snapshot = deleteProjects(ids);
    selection.clear();
    // A deleted project takes its sub-projects and their tasks with it.
    if (ids.includes(selectedProjectId ?? '')) setDetailView('none');
    pushSnapshotUndo(snapshot);
  };

  const handleBulkDeleteSubProjects = () => {
    const ids = Array.from(subProjectSelection.selectedIds);
    if (ids.length === 0) return;
    const snapshot = deleteSubProjects(ids);
    subProjectSelection.clear();
    pushSnapshotUndo(snapshot);
  };

  const handleBulkDeleteTasks = () => {
    const ids = Array.from(taskSelection.selectedIds);
    if (ids.length === 0) return;
    const snapshot = deleteProjectTasks(ids);
    taskSelection.clear();
    pushSnapshotUndo(snapshot);
  };

  const handleBulkEditTasks = (key: string, value: string | number | null) => {
    const ids = Array.from(taskSelection.selectedIds);
    if (ids.length === 0) return;

    const updates: Partial<ProjectTask> =
      key === 'deadline'
        ? { deadline: value === null ? undefined : parseDateInput(String(value)) }
        : ({ [key]: value } as Partial<ProjectTask>);

    const patches = updateProjectTasks(ids, updates);
    if (patches.length === 0) return;
    // Selection stays so several fields can be applied in a row.
    pushUndo(
      `${pluralise(patches.length, 'task')} updated`,
      () => revertProjectTasks(patches),
    );
  };

  // Open project detail
  const openProjectDetail = (project: Project) => {
    setSelectedProjectId(project.id);
    setSelectedSubProjectId(null);
    setDetailView('project');
    setSubProjectStatusFilter('All'); // Reset sub-project filter when opening a project
  };

  // Open sub-project detail
  const openSubProjectDetail = (subProject: SubProject) => {
    setSelectedSubProjectId(subProject.id);
    setDetailView('subproject');
    setTaskStatusFilter('All'); // Reset filter when switching sub-projects
  };

  // Go back from sub-project to project
  const goBackToProject = () => {
    setSelectedSubProjectId(null);
    setDetailView('project');
  };

  // Close detail view
  const closeDetailView = () => {
    setSelectedProjectId(null);
    setSelectedSubProjectId(null);
    setDetailView('none');
  };

  // Handle project form
  const handleCreateProject = () => {
    if (!projectForm.title.trim()) return;
    createProject(
      projectForm.title,
      projectForm.description,
      projectForm.color,
      projectForm.deadline ? new Date(projectForm.deadline) : undefined
    );
    setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' });
    setIsProjectFormOpen(false);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectForm.title.trim()) return;
    updateProject(editingProject.id, {
      title: projectForm.title,
      description: projectForm.description,
      color: projectForm.color,
      deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
      status: projectForm.status,
    });
    setEditingProject(null);
    setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' });
    setIsProjectFormOpen(false);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description || '',
      color: project.color,
      deadline: project.deadline ? getLocalDateString(new Date(project.deadline)) : '',
      status: project.status,
    });
    setIsProjectFormOpen(true);
  };

  // Handle sub-project form
  const handleCreateSubProject = () => {
    if (!selectedProject || !subProjectForm.title.trim()) return;
    createSubProject(
      selectedProject.id,
      subProjectForm.title,
      subProjectForm.description,
      subProjectForm.deadline ? new Date(subProjectForm.deadline) : undefined
    );
    setSubProjectForm({ title: '', description: '', deadline: '', status: 'Backlog' });
    setIsSubProjectFormOpen(false);
  };

  const handleUpdateSubProject = () => {
    if (!editingSubProject || !subProjectForm.title.trim()) return;
    updateSubProject(editingSubProject.id, {
      title: subProjectForm.title,
      description: subProjectForm.description,
      deadline: subProjectForm.deadline ? new Date(subProjectForm.deadline) : undefined,
      status: subProjectForm.status,
    });
    setEditingSubProject(null);
    setSubProjectForm({ title: '', description: '', deadline: '', status: 'Backlog' });
    setIsSubProjectFormOpen(false);
  };

  const openEditSubProject = (subProject: SubProject) => {
    setEditingSubProject(subProject);
    setSubProjectForm({
      title: subProject.title,
      description: subProject.description || '',
      deadline: subProject.deadline ? getLocalDateString(new Date(subProject.deadline)) : '',
      status: subProject.status,
    });
    setIsSubProjectFormOpen(true);
  };

  // Handle task form
  const handleCreateTask = () => {
    if (!selectedSubProject || !taskForm.title.trim()) return;
    createProjectTask(
      selectedSubProject.id,
      taskForm.title,
      taskForm.description,
      taskForm.priority,
      taskForm.effort,
      taskForm.parentTaskId || undefined,
      taskForm.deadline ? new Date(taskForm.deadline) : undefined,
      taskForm.deadlineTime || undefined,
      taskForm.deadlineTime && taskForm.deadlineReminderOffsets.length ? taskForm.deadlineReminderOffsets : undefined,
    );
    setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', deadlineTime: '', deadlineReminderOffsets: [], parentTaskId: '' });
    setIsTaskFormOpen(false);
  };

  const handleUpdateTask = () => {
    if (!editingTask || !taskForm.title.trim()) return;
    updateProjectTask(editingTask.id, {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      effort: taskForm.effort,
      deadline: taskForm.deadline ? new Date(taskForm.deadline) : undefined,
      deadlineTime: taskForm.deadlineTime || undefined,
      deadlineReminderOffsets: taskForm.deadlineTime && taskForm.deadlineReminderOffsets.length ? taskForm.deadlineReminderOffsets : undefined,
    });
    setEditingTask(null);
    setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', deadlineTime: '', deadlineReminderOffsets: [], parentTaskId: '' });
    setIsTaskFormOpen(false);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      effort: task.effort,
      deadline: task.deadline ? getLocalDateString(new Date(task.deadline)) : '',
      deadlineTime: task.deadlineTime || '',
      deadlineReminderOffsets: task.deadlineReminderOffsets || [],
      parentTaskId: task.parentTaskId || '',
    });
    setIsTaskFormOpen(true);
  };

  const openCreateSubTask = (parentTask: ProjectTask) => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      priority: 'Medium',
      effort: 'Medium',
      deadline: '',
      deadlineTime: '',
      deadlineReminderOffsets: [],
      parentTaskId: parentTask.id,
    });
    setIsTaskFormOpen(true);
  };

  // Status helpers
  const getStatusColor = (status: WorkItemStatus) => {
    switch (status) {
      case 'Backlog': return 'text-[var(--ink-muted)] bg-[var(--surface-subtle)]';
      case 'In Progress': return 'text-[var(--action)] bg-[var(--action-soft)]';
      case 'Done': return 'text-[var(--success)] bg-[var(--success-soft)]';
    }
  };

  const cycleTaskStatus = (task: ProjectTask) => {
    const statusOrder: WorkItemStatus[] = ['Backlog', 'In Progress', 'Done'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTaskStatus(task.id, nextStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--action)] border-t-transparent" />
      </div>
    );
  }

  // Render task item with sub-tasks
  const renderTask = (task: ProjectTask, depth = 0) => {
    const subTasks = getSubTasks(task.id);
    const today = getLocalDateString();
    const isAddedToToday = task.isFocusedToday && task.focusedDate === today;

    const isTaskSelected = taskSelection.isSelected(task.id);

    return (
      <div key={task.id} data-focus-id={task.id} style={{ marginLeft: depth * 20 }}>
        <div
          onClick={taskSelection.active ? () => taskSelection.toggle(task.id) : undefined}
          className={`group flex items-center justify-between gap-2 p-3 rounded-md transition-all overflow-hidden ${
            taskSelection.active ? 'cursor-pointer' : ''
          } ${
            isTaskSelected
              ? 'bg-[var(--selected)] ring-1 ring-[var(--action)]'
              : 'hover:bg-[var(--state-hover)]'
          } ${task.status === 'Done' && !isTaskSelected ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
            {/* Status toggle — becomes the selection checkbox while selecting */}
            {taskSelection.active ? (
              <SelectionCheckbox
                selected={isTaskSelected}
                onToggle={() => taskSelection.toggle(task.id)}
                label={`Select "${task.title}"`}
                className="w-6 h-6 flex items-center justify-center"
              />
            ) : (
              <button
                onClick={() => cycleTaskStatus(task)}
                className={`w-6 h-6 rounded-sm flex items-center justify-center transition-all ${getStatusColor(task.status)}`}
                title={`Status: ${task.status}`}
              >
                {task.status === 'Done' ? (
                  <CheckCircle2 size={14} />
                ) : task.status === 'In Progress' ? (
                  <Play size={10} fill="currentColor" />
                ) : (
                  <Circle size={14} />
                )}
              </button>
            )}

            {/* Task Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-medium truncate min-w-0 ${
                  task.status === 'Done' 
                    ? 'text-[var(--ink-muted)] line-through'
                    : 'text-[var(--ink)]'
                }`}>
                  {task.title}
                </span>
                {task.priority === 'High' && (
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-[var(--danger-soft)] text-[var(--danger)] flex-shrink-0">HIGH</span>
                )}
                {subTasks.length > 0 && (
                  <span className={`text-xs flex-shrink-0 text-[var(--ink-muted)]`}>
                    ({subTasks.filter(st => st.status === 'Done').length}/{subTasks.length})
                  </span>
                )}
              </div>
              {task.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {task.tags.map(tag => (
                    <span key={tag} className="rounded-sm border border-[var(--action)] bg-[var(--action-soft)] px-2 py-1 text-xs text-[var(--action)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions — hidden while selecting */}
          <div className={`flex items-center space-x-1 ${taskSelection.active ? 'hidden' : ''}`}>
            {/* Add to Today -- visible only when added, hover-only otherwise */}
            {task.status !== 'Done' && isAddedToToday && (
              <button
                onClick={() => removeTaskFromToday(task.id)}
                className={`p-2 rounded-sm transition-all ${
                  'bg-[var(--success-soft)] text-[var(--success)] ring-1 ring-emerald-200 dark:ring-emerald-500/30'
                }`}
                title="Added to Today (click to remove)"
                aria-label="Added to Today (click to remove)"
              >
                <CalendarCheck size={14} />
              </button>
            )}
            {/* Revealed on hover on desktop, but always present on touch, where
                there is no hover to reveal them with. */}
            <div className="flex items-center space-x-1 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              {task.status !== 'Done' && !isAddedToToday && (
                <IconButton
                  icon={CalendarPlus}
                  label="Add to Today"
                  size="sm"
                  tone="primary"
                  onClick={() => addTaskToToday(task.id)}
                  title="Add to Today"
                />
              )}
              <IconButton
                icon={Plus}
                label="Add sub-task"
                size="sm"
                onClick={() => openCreateSubTask(task)}
                title="Add sub-task"
              />
              <IconButton
                icon={Pencil}
                label="Edit"
                size="sm"
                onClick={() => openEditTask(task)}
                title="Edit"
              />
              <IconButton
                icon={Trash2}
                label="Delete"
                size="sm"
                tone="danger"
                onClick={() => deleteProjectTask(task.id)}
                title="Delete"
              />
            </div>
          </div>
        </div>

        {/* Sub-tasks */}
        {subTasks.length > 0 && (
          <div className={`ml-4 pl-4 border-l-2 border-[var(--rule)]`}>
            {subTasks.map(st => renderTask(st, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ink)] pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">Projects</h2>
          <p className="mt-1 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
            {projects.filter(p => p.status === 'Active').length} ACTIVE PROJECT{projects.filter(p => p.status === 'Active').length !== 1 ? 'S' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-[var(--rule-strong)] bg-[var(--surface)]">
            <button
              type="button"
              onClick={() => { setPageView('cards'); }}
              aria-pressed={pageView === 'cards'}
              className={`p-2 transition-colors ${
                pageView === 'cards'
                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]'
              }`}
              title="Card view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setPageView('sheet'); }}
              aria-pressed={pageView === 'sheet'}
              className={`p-2 transition-colors ${
                pageView === 'sheet'
                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]'
              }`}
              title="Sheet view"
            >
              <Table2 size={16} />
            </button>
          </div>
          <button
            onClick={() => {
              setEditingProject(null);
              setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' });
              setIsProjectFormOpen(true);
            }}
            className="btn-primary flex items-center space-x-2 rounded-md px-4 py-2 text-sm md:px-5"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
          {pageView === 'cards' && (
            <SelectButton
              active={selection.active}
              onClick={() => selection.active ? selection.clear() : startProjectSelection()}
              disabled={filteredProjects.length === 0}
            />
          )}
        </div>
      </div>

      {pageView === 'sheet' ? (
        <TaskSheet />
      ) : (
      <div className="flex gap-6">
        {/* Main Content - Project List or Detail View */}
        <div className={`flex-1 ${detailView !== 'none' ? 'hidden md:block md:w-1/3' : ''}`}>
          {/* Search — status filters alone meant scrolling to find a project. */}
          <div className="relative mb-3">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-muted)]`}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects by name or tag"
              aria-label="Search projects"
              className="input w-full rounded-md py-3 pl-8 pr-8 text-sm outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-sm transition-colors ${
                  'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Project Status Filter */}
          <div className="mb-4">
            <div className={`flex items-center space-x-2`}>
              <span className="text-sm text-[var(--ink-muted)]">Filter:</span>
              <div className="flex overflow-hidden rounded-md border border-[var(--rule)] bg-[var(--surface)]">
                {(['All', 'Active', 'Completed', 'On Hold'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setProjectStatusFilter(status)}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      projectStatusFilter === status
                        ? status === 'All' 
                          ? 'bg-[var(--action-soft)] text-[var(--action)]'
                          : status === 'Active' 
                            ? 'bg-[var(--action-soft)] text-[var(--action)]'
                            : status === 'Completed'
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Projects List */}
          {filteredProjects.length === 0 ? (
            <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[var(--action-soft)]">
                <FolderKanban className="h-7 w-7 text-[var(--action)]" />
              </div>
              <h3 className={`font-semibold text-lg mb-2 text-[var(--ink)]`}>
                {projects.length === 0 ? 'No projects yet' : `No ${projectStatusFilter.toLowerCase()} projects`}
              </h3>
              <p className={`text-sm mb-4 text-[var(--ink-muted)]`}>
                {projects.length === 0 
                  ? 'Create your first project to start organizing your work'
                  : `Try selecting a different filter to see more projects`}
              </p>
              {projectStatusFilter !== 'All' && (
                <button
                  onClick={() => setProjectStatusFilter('All')}
                  className="text-sm font-medium text-[var(--action)] hover:underline"
                >
                  Show all projects
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)]">
              {filteredProjects.map(project => {
                const projectSubProjects = getSubProjectsByProject(project.id);
                const progress = getProjectProgress(project.id);

                const isSelected = selection.isSelected(project.id);

                return (
                  <div
                    key={project.id}
                    data-focus-id={project.id}
                    className={`bg-[var(--surface)] ${isSelected ? 'bg-[var(--selected)] ring-1 ring-inset ring-[var(--action)]' : ''}`}
                  >
                    {/* Project Header */}
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--selected)]'
                          : 'hover:bg-[var(--state-hover)]'
                      }`}
                      onClick={() => selection.active ? selection.toggle(project.id) : openProjectDetail(project)}
                    >
                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {selection.active ? (
                            <SelectionCheckbox
                              selected={isSelected}
                              onToggle={() => selection.toggle(project.id)}
                              label={`Select "${project.title}"`}
                              className="w-10 h-10 flex items-center justify-center"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${project.color}20` }}
                            >
                              <FolderKanban size={20} style={{ color: project.color }} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className={`font-semibold truncate text-[var(--ink)]`}>
                              {project.title}
                            </h3>
                            <p className={`text-sm text-[var(--ink-muted)]`}>
                              {projectSubProjects.length} sub-project{projectSubProjects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full hidden sm:inline ${
                            project.status === 'Active' 
                              ? 'bg-[var(--action-soft)] text-[var(--action)]'
                              : project.status === 'Completed'
                                ? 'bg-[var(--success-soft)] text-[var(--success)]'
                                : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                          }`}>
                            {project.status}
                          </span>
                          
                          <div className="hidden sm:flex items-center space-x-2">
                            <div className="h-2 w-20 overflow-hidden bg-[var(--surface-inset)]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, backgroundColor: project.color }}
                              />
                            </div>
                            <span className={`text-xs font-medium text-[var(--ink-muted)]`}>
                              {progress}%
                            </span>
                          </div>

                          {!selection.active && (
                            <ChevronRight className={`w-5 h-5 flex-shrink-0 text-[var(--ink-muted)]`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Detail Panel */}
        {detailView !== 'none' && (
          <div className="flex-1 md:w-2/3 min-w-0">
            <div className="h-full overflow-hidden rounded-md border border-[var(--rule)] bg-[var(--surface)]">
              {/* Detail Header */}
              <div className="border-b border-[var(--rule-strong)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Back button - always show on mobile, only for subproject on desktop */}
                    <button
                      aria-label="Back"
                      onClick={detailView === 'subproject' ? goBackToProject : () => setDetailView('none')}
                      className={`p-2 rounded-sm transition-colors ${detailView === 'project' ? 'md:hidden' : ''} hover:bg-[var(--surface-subtle)] text-[var(--ink-muted)]`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {detailView === 'project' && selectedProject && (
                      <>
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${selectedProject.color}20` }}
                        >
                          <FolderKanban size={20} style={{ color: selectedProject.color }} />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`font-semibold truncate text-[var(--ink)]`}>
                            {selectedProject.title}
                          </h2>
                          <p className={`text-sm text-[var(--ink-muted)]`}>
                            {getSubProjectsByProject(selectedProject.id).length} sub-projects
                          </p>
                        </div>
                      </>
                    )}
                    {detailView === 'subproject' && selectedSubProject && (
                      <>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[var(--action-soft)]">
                          <Layers size={20} className="text-[var(--action)]" />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`font-semibold truncate text-[var(--ink)]`}>
                            {selectedSubProject.title}
                          </h2>
                          <p className={`text-sm text-[var(--ink-muted)]`}>
                            {getTasksBySubProject(selectedSubProject.id).length} tasks
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {detailView === 'project' && selectedProject && (
                      <>
                        <IconButton
                          icon={Pencil}
                          label="Edit project"
                          size="lg"
                          onClick={() => openEditProject(selectedProject)}
                        />
                        <button
                          onClick={() => {
                            if (confirm('Delete this project and all its contents?')) {
                              deleteProject(selectedProject.id);
                              closeDetailView();
                            }
                          }}
                          className="rounded-md p-2 text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {detailView === 'subproject' && selectedSubProject && (
                      <>
                        <IconButton
                          icon={Pencil}
                          label="Edit sub-project"
                          size="lg"
                          onClick={() => openEditSubProject(selectedSubProject)}
                        />
                        <button
                          onClick={() => {
                            if (confirm('Delete this sub-project and all its tasks?')) {
                              deleteSubProject(selectedSubProject.id);
                              goBackToProject();
                            }
                          }}
                          className="rounded-md p-2 text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    <IconButton
                      icon={X}
                      label="Close"
                      size="lg"
                      className="lg:hidden"
                      onClick={closeDetailView}
                    />
                  </div>
                </div>

                {/* Description */}
                {detailView === 'project' && selectedProject?.description && (
                  <p className={`mt-3 text-sm text-[var(--ink-secondary)]`}>
                    {selectedProject.description}
                  </p>
                )}
                {detailView === 'subproject' && selectedSubProject?.description && (
                  <p className={`mt-3 text-sm text-[var(--ink-secondary)]`}>
                    {selectedSubProject.description}
                  </p>
                )}
              </div>

              {/* Detail Content */}
              <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Project Detail - Show Sub-Projects */}
                {detailView === 'project' && selectedProject && (
                  <div className="space-y-3">
                    {/* Sub-Project Filter */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className={`text-sm text-[var(--ink-muted)]`}>Filter:</span>
                      <div className="flex overflow-hidden rounded-md border border-[var(--rule)]">
                        {(['All', 'Backlog', 'In Progress', 'Done'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setSubProjectStatusFilter(status)}
                            className={`px-3 py-2 text-xs font-medium transition-all ${
                              subProjectStatusFilter === status
                                ? status === 'All' 
                                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                                  : getStatusColor(status as WorkItemStatus)
                                : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold text-[var(--ink)]`}>Sub-Projects</h3>
                      <div className="flex items-center gap-2">
                        {visibleSubProjectIds.length > 0 && (
                          <SelectButton
                            active={subProjectSelection.active}
                            onClick={() => subProjectSelection.active ? subProjectSelection.clear() : startSubProjectSelection()}
                          />
                        )}
                        <button
                          onClick={() => {
                            setEditingSubProject(null);
                            setSubProjectForm({ title: '', description: '', deadline: '', status: 'Backlog' });
                            setIsSubProjectFormOpen(true);
                          }}
                          className="flex items-center space-x-1 rounded-md border border-[var(--action)] bg-[var(--action-soft)] px-3 py-2 text-sm text-[var(--action)] transition-colors hover:bg-[var(--selected)]"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const allSubProjects = getSubProjectsByProject(selectedProject.id);
                      const filteredSubProjects = subProjectStatusFilter === 'All'
                        ? allSubProjects
                        : allSubProjects.filter(sp => sp.status === subProjectStatusFilter);
                      
                      if (allSubProjects.length === 0) {
                        return (
                          <div className={`text-center py-8 text-[var(--ink-muted)]`}>
                            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No sub-projects yet</p>
                          </div>
                        );
                      }
                      
                      if (filteredSubProjects.length === 0) {
                        return (
                          <div className={`text-center py-8 text-[var(--ink-muted)]`}>
                            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No {subProjectStatusFilter.toLowerCase()} sub-projects</p>
                            <button 
                              onClick={() => setSubProjectStatusFilter('All')}
                              className="mt-2 text-sm font-medium text-[var(--action)] hover:underline"
                            >
                              Show all sub-projects
                            </button>
                          </div>
                        );
                      }
                      
                      return filteredSubProjects.map(subProject => {
                        const progress = getSubProjectProgress(subProject.id);
                        const tasks = getTasksBySubProject(subProject.id);

                        const isSubSelected = subProjectSelection.isSelected(subProject.id);

                        return (
                          <div
                            key={subProject.id}
                            className={`cursor-pointer rounded-md border p-4 transition-colors ${
                              isSubSelected
                                ? 'border-[var(--action)] bg-[var(--selected)]'
                                : 'border-[var(--rule)] bg-[var(--surface-raised)] hover:bg-[var(--state-hover)]'
                            }`}
                            onClick={() => subProjectSelection.active
                              ? subProjectSelection.toggle(subProject.id)
                              : openSubProjectDetail(subProject)}
                          >
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                {subProjectSelection.active ? (
                                  <SelectionCheckbox
                                    selected={isSubSelected}
                                    onToggle={() => subProjectSelection.toggle(subProject.id)}
                                    label={`Select "${subProject.title}"`}
                                    className="w-8 h-8 flex items-center justify-center"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--action-soft)]">
                                    <Layers size={16} className="text-[var(--action)]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className={`font-medium truncate text-[var(--ink)]`}>
                                    {subProject.title}
                                  </h4>
                                  <p className={`text-xs text-[var(--ink-muted)]`}>
                                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {tasks.filter(t => t.status === 'Done').length} done
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-1 rounded-full hidden sm:inline ${getStatusColor(subProject.status)}`}>
                                  {subProject.status}
                                </span>
                                <div className="hidden sm:flex items-center space-x-2">
                                  <div className="h-1.5 w-16 overflow-hidden bg-[var(--surface-inset)]">
                                    <div
                                      className="h-full bg-[var(--warning)] transition-[width]"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs text-[var(--ink-muted)]`}>{progress}%</span>
                                </div>
                                {!subProjectSelection.active && (
                                  <ChevronRight size={16} className={`flex-shrink-0 text-[var(--ink-muted)]`} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Sub-Project Detail - Show Tasks */}
                {detailView === 'subproject' && selectedSubProject && (
                  <div className="space-y-3">
                    {/* Task Status Filter */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className={`text-sm text-[var(--ink-muted)]`}>Filter:</span>
                      <div className="flex overflow-hidden rounded-md border border-[var(--rule)]">
                        {(['All', 'Backlog', 'In Progress', 'Done'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setTaskStatusFilter(status)}
                            className={`px-3 py-2 text-xs font-medium transition-all ${
                              taskStatusFilter === status
                                ? status === 'All' 
                                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                                  : getStatusColor(status as WorkItemStatus)
                                : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold text-[var(--ink)]`}>Tasks</h3>
                      <div className="flex items-center gap-2">
                        {visibleProjectTaskIds.length > 0 && (
                          <SelectButton
                            active={taskSelection.active}
                            onClick={() => taskSelection.active ? taskSelection.clear() : startTaskSelection()}
                          />
                        )}
                        <button
                          onClick={() => {
                            setEditingTask(null);
                            setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', deadlineTime: '', deadlineReminderOffsets: [], parentTaskId: '' });
                            setIsTaskFormOpen(true);
                          }}
                          className="flex items-center space-x-1 rounded-md border border-[var(--action)] bg-[var(--action-soft)] px-3 py-2 text-sm text-[var(--action)] transition-colors hover:bg-[var(--selected)]"
                        >
                          <Plus size={14} />
                          <span>Add Task</span>
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const allTasks = getTasksBySubProject(selectedSubProject.id);
                      const filteredTasks = taskStatusFilter === 'All' 
                        ? allTasks 
                        : allTasks.filter(t => t.status === taskStatusFilter);
                      
                      if (allTasks.length === 0) {
                        return (
                          <div className={`text-center py-8 text-[var(--ink-muted)]`}>
                            <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No tasks yet</p>
                          </div>
                        );
                      }
                      
                      if (filteredTasks.length === 0) {
                        return (
                          <div className={`text-center py-8 text-[var(--ink-muted)]`}>
                            <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No {taskStatusFilter.toLowerCase()} tasks</p>
                            <button 
                              onClick={() => setTaskStatusFilter('All')}
                              className="mt-2 text-sm font-medium text-[var(--action)] hover:underline"
                            >
                              Show all tasks
                            </button>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-1">
                          {filteredTasks.map(task => renderTask(task))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Project Form Modal */}
      <ExpandableModal
        isOpen={isProjectFormOpen}
        onClose={() => { setIsProjectFormOpen(false); setEditingProject(null); setAiPlan(null); setAiPlanError(null); }}
        title={editingProject ? 'Edit Project' : 'New Project'}
        icon={<FolderKanban className={`w-5 h-5 text-[var(--action)]`} />}
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => { setIsProjectFormOpen(false); setEditingProject(null); setAiPlan(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={editingProject ? handleUpdateProject : (aiPlan ? handleCreateProjectWithPlan : handleCreateProject)}
            >
              {editingProject ? 'Save' : aiPlan ? 'Create with Plan' : 'Create'}
            </Button>
          </div>
        }
      >
        {(isFS) => {
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Title</label>
              <input
                type="text"
                value={projectForm.title}
                onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-4 py-3 rounded-md border transition-colors outline-none ${
                  'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] focus:border-[var(--action)]'
                }`}
                placeholder="Project name"
                autoFocus
              />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Notes & Ideas</label>
              <TiptapEditor
                content={projectForm.description}
                onChange={val => setProjectForm(prev => ({ ...prev, description: val }))}
                placeholder="Notes, ideas, context..."
              />
            </div>
          );
          const colorInput = (
            <div>
              <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use project color ${color}`}
                    aria-pressed={projectForm.color === color}
                    onClick={() => setProjectForm(prev => ({ ...prev, color }))}
                    className={`h-11 w-11 rounded-[var(--radius-sm)] border border-[var(--rule-strong)] transition-[outline-color] ${projectForm.color === color ? 'outline outline-2 outline-offset-2 outline-[var(--focus)]' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          );
          const deadlineInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Deadline (optional)</label>
              <input
                type="date"
                value={projectForm.deadline}
                onChange={e => setProjectForm(prev => ({ ...prev, deadline: e.target.value }))}
                className={`w-full px-4 py-3 rounded-md border transition-colors outline-none ${
                  'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] focus:border-[var(--action)]'
                }`}
              />
            </div>
          );
          const statusInput = editingProject ? (
            <div>
              <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Status</label>
              <div className={`flex rounded-sm overflow-hidden border border-[var(--rule)]`}>
                {(['Active', 'Completed', 'On Hold'] as ProjectStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setProjectForm(prev => ({ ...prev, status }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                      projectForm.status === status
                        ? status === 'Active'
                          ? 'bg-[var(--action-soft)] text-[var(--action)]'
                          : status === 'Completed'
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ) : null;

          const aiPlanSection = !editingProject && isAIConfigured() ? (
            <div>
              {!aiPlan ? (
                <div>
                  <button
                    type="button"
                    onClick={handleGenerateAIPlan}
                    disabled={aiPlanLoading || !projectForm.title.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      aiPlanLoading || !projectForm.title.trim()
                        ? 'bg-[var(--action-soft)] text-[var(--action)] cursor-not-allowed'
                        : 'bg-[var(--action-soft)] text-[var(--action)] hover:bg-[var(--selected)]'
                    }`}
                  >
                    {aiPlanLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {aiPlanLoading ? 'Generating plan...' : 'AI: Generate Plan'}
                  </button>
                  {aiPlanError && <p className={`text-xs mt-2 text-[var(--danger)]`}>{aiPlanError}</p>}
                  {!projectForm.title.trim() && <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>Enter a project title first</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium text-[var(--ink)]`}>AI-Generated Plan</span>
                    <button
                      type="button"
                      onClick={() => setAiPlan(null)}
                      className={`text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]`}
                    >
                      Discard
                    </button>
                  </div>
                  <div className={`rounded-md border max-h-64 overflow-y-auto border-[var(--rule)]`}>
                    {aiPlan.map((sp, spIdx) => (
                      <div key={spIdx} className={`${spIdx > 0 ? `border-t border-[var(--rule)]` : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleSubProjectSelection(spIdx)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                            'hover:bg-[var(--surface)]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                            sp.selected
                              ? 'bg-[var(--action)] text-white'
                              : 'border border-[var(--rule-strong)]'
                          }`}>
                            {sp.selected && <Check size={12} />}
                          </div>
                          <Layers size={14} className={'text-[var(--action)]'} />
                          <span className={`text-sm font-medium text-[var(--ink)]`}>{sp.title}</span>
                        </button>
                        {sp.tasks.map((task, tIdx) => (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => toggleTaskSelection(spIdx, tIdx)}
                            className={`w-full flex items-center gap-2 pl-8 pr-3 py-2 text-left transition-colors ${
                              'hover:bg-[var(--surface)]'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                              task.selected
                                ? 'bg-[var(--action)] text-white'
                                : 'border border-[var(--rule-strong)]'
                            }`}>
                              {task.selected && <Check size={10} />}
                            </div>
                            <span className={`text-xs flex-1 text-[var(--ink-secondary)]`}>{task.title}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              task.priority === 'High'
                                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                                : task.priority === 'Medium'
                                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                                  : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)]'
                            }`}>{task.priority}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 text-[var(--ink-muted)]`}>
                    Uncheck items you don't want. Click "Create with Plan" to create everything.
                  </p>
                </div>
              )}
            </div>
          ) : null;

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r border-[var(--rule)]`}>
                {titleInput}
                {notesInput}
                {aiPlanSection}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-6 bg-[var(--surface)]`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-[var(--ink-muted)]`}>Project details</h3>
                {colorInput}
                {deadlineInput}
                {statusInput}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {titleInput}
              {notesInput}
              {colorInput}
              {deadlineInput}
              {statusInput}
              {aiPlanSection}
            </div>
          );
        }}
      </ExpandableModal>

      {/* Sub-Project Form Modal */}
      <ExpandableModal
        isOpen={isSubProjectFormOpen}
        onClose={() => { setIsSubProjectFormOpen(false); setEditingSubProject(null); }}
        title={editingSubProject ? 'Edit Sub-Project' : 'New Sub-Project'}
        icon={<Layers className={`w-5 h-5 text-[var(--action)]`} />}
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => { setIsSubProjectFormOpen(false); setEditingSubProject(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={editingSubProject ? handleUpdateSubProject : handleCreateSubProject}
            >
              {editingSubProject ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        {(isFS) => {
          const inputCls = `w-full px-4 py-3 rounded-md border transition-colors outline-none ${
            'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] focus:border-[var(--action)]'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Title</label>
              <input type="text" value={subProjectForm.title} onChange={e => setSubProjectForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="Sub-project name" autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Notes</label>
              <TiptapEditor content={subProjectForm.description} onChange={val => setSubProjectForm(prev => ({ ...prev, description: val }))} placeholder="Add notes or a description..." />
            </div>
          );
          const deadlineInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Deadline (optional)</label>
              <input type="date" value={subProjectForm.deadline} onChange={e => setSubProjectForm(prev => ({ ...prev, deadline: e.target.value }))} className={inputCls} />
            </div>
          );
          const statusInput = editingSubProject ? (
            <div>
              <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Status</label>
              <div className={`flex rounded-sm overflow-hidden border border-[var(--rule)]`}>
                {(['Backlog', 'In Progress', 'Done'] as WorkItemStatus[]).map(status => (
                  <button key={status} type="button" onClick={() => setSubProjectForm(prev => ({ ...prev, status }))} className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${subProjectForm.status === status ? getStatusColor(status) : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]'}`}>{status}</button>
                ))}
              </div>
            </div>
          ) : null;

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r border-[var(--rule)]`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-6 bg-[var(--surface)]`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-[var(--ink-muted)]`}>Details</h3>
                {deadlineInput}
                {statusInput}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {titleInput}
              {notesInput}
              {deadlineInput}
              {statusInput}
            </div>
          );
        }}
      </ExpandableModal>

      {/* Task Form Modal */}
      <ExpandableModal
        isOpen={isTaskFormOpen}
        onClose={() => { setIsTaskFormOpen(false); setEditingTask(null); }}
        title={editingTask ? 'Edit Task' : taskForm.parentTaskId ? 'New Sub-Task' : 'New Task'}
        icon={<ListTodo className={`w-5 h-5 text-[var(--action)]`} />}
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => { setIsTaskFormOpen(false); setEditingTask(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={editingTask ? handleUpdateTask : handleCreateTask}
            >
              {editingTask ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        {(isFS) => {
          const inputCls = `w-full px-4 py-3 rounded-md border transition-colors outline-none ${
            'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] focus:border-[var(--action)]'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Title</label>
              <input type="text" value={taskForm.title} onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="Task title" autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Notes</label>
              <TiptapEditor content={taskForm.description} onChange={val => setTaskForm(prev => ({ ...prev, description: val }))} placeholder="Add notes or details..." />
            </div>
          );
          const priorityEffort = (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as ProjectTask['priority'] }))} className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 text-[var(--ink-secondary)]`}>Effort</label>
                <select value={taskForm.effort} onChange={e => setTaskForm(prev => ({ ...prev, effort: e.target.value as ProjectTask['effort'] }))} className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          );
          const deadlineInput = (
            <div className="space-y-3">
              <div className={taskForm.deadline ? 'grid grid-cols-2 gap-3' : ''}>
                <label className={`block text-sm font-medium text-[var(--ink-secondary)]`}>
                  Deadline (optional)
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={e => setTaskForm(prev => ({
                      ...prev,
                      deadline: e.target.value,
                      ...(!e.target.value ? { deadlineTime: '', deadlineReminderOffsets: [] } : {}),
                    }))}
                    className={`mt-1 ${inputCls}`}
                  />
                </label>
                {taskForm.deadline && (
                  <label className={`block text-sm font-medium text-[var(--ink-secondary)]`}>
                    Time
                    <input
                      type="time"
                      value={taskForm.deadlineTime}
                      onChange={e => setTaskForm(prev => ({
                        ...prev,
                        deadlineTime: e.target.value,
                        ...(!e.target.value ? { deadlineReminderOffsets: [] } : {}),
                      }))}
                      className={`mt-1 ${inputCls}`}
                    />
                  </label>
                )}
              </div>
              {taskForm.deadline && taskForm.deadlineTime && (
                <ReminderOffsetPicker
                  label="Deadline reminders"
                  value={taskForm.deadlineReminderOffsets}
                  onChange={deadlineReminderOffsets => setTaskForm(prev => ({ ...prev, deadlineReminderOffsets }))}
                />
              )}
            </div>
          );

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r border-[var(--rule)]`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-6 bg-[var(--surface)]`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-[var(--ink-muted)]`}>Task details</h3>
                {priorityEffort}
                {deadlineInput}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {titleInput}
              {notesInput}
              {priorityEffort}
              {deadlineInput}
            </div>
          );
        }}
      </ExpandableModal>

      {/* One bar at a time — starting a selection clears the other panes. */}
      <BulkActionBar
        count={selection.count}
        itemLabel="project"
        allSelected={selection.allSelected}
        onSelectAll={selection.selectAll}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
      />
      <BulkActionBar
        count={subProjectSelection.count}
        itemLabel="sub-project"
        allSelected={subProjectSelection.allSelected}
        onSelectAll={subProjectSelection.selectAll}
        onDelete={handleBulkDeleteSubProjects}
        onClear={subProjectSelection.clear}
      />
      <BulkActionBar
        count={taskSelection.count}
        itemLabel="task"
        allSelected={taskSelection.allSelected}
        onSelectAll={taskSelection.selectAll}
        onDelete={handleBulkDeleteTasks}
        onClear={taskSelection.clear}
      >
        <BulkEditMenu fields={PROJECT_TASK_BULK_FIELDS} onApply={handleBulkEditTasks} />
      </BulkActionBar>
    </div>
  );
}
