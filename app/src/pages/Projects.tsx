import { useState, useMemo } from 'react';
import { useProjectContext, PROJECT_COLORS, DEFAULT_TAGS } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Plus, FolderKanban, ChevronRight, ChevronDown, MoreVertical, 
  Pencil, Trash2, Archive, Play, Pause, CheckCircle2, Circle,
  Clock, Calendar, Tag, X, ListTodo, Layers, ArrowRight,
  CalendarPlus, Timer, ChevronLeft
} from 'lucide-react';
import type { Project, SubProject, ProjectTask, WorkItemStatus, ProjectStatus } from '../types';

type ViewMode = 'list' | 'board';
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
    updateTaskStatus,
    updateSubProjectStatus,
    addTaskToToday,
    removeTaskFromToday,
    getTaskProgress,
    logTime,
    addTagToTask,
    removeTagFromTask,
  } = useProjectContext();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detailView, setDetailView] = useState<DetailView>('none');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSubProject, setSelectedSubProject] = useState<SubProject | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Form states
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isSubProjectFormOpen, setIsSubProjectFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSubProject, setEditingSubProject] = useState<SubProject | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  // Form data
  const [projectForm, setProjectForm] = useState({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '' });
  const [subProjectForm, setSubProjectForm] = useState({ title: '', description: '', deadline: '' });
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    effort: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: '',
    parentTaskId: '',
  });

  // Filter active projects
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'Active').sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ), [projects]
  );

  const completedProjects = useMemo(() =>
    projects.filter(p => p.status === 'Completed' || p.status === 'On Hold'), [projects]
  );

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Open project detail
  const openProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setSelectedSubProject(null);
    setDetailView('project');
  };

  // Open sub-project detail
  const openSubProjectDetail = (subProject: SubProject) => {
    setSelectedSubProject(subProject);
    setDetailView('subproject');
  };

  // Go back from sub-project to project
  const goBackToProject = () => {
    setSelectedSubProject(null);
    setDetailView('project');
  };

  // Close detail view
  const closeDetailView = () => {
    setSelectedProject(null);
    setSelectedSubProject(null);
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
    setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '' });
    setIsProjectFormOpen(false);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectForm.title.trim()) return;
    updateProject(editingProject.id, {
      title: projectForm.title,
      description: projectForm.description,
      color: projectForm.color,
      deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
    });
    setEditingProject(null);
    setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '' });
    setIsProjectFormOpen(false);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description || '',
      color: project.color,
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
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
    setSubProjectForm({ title: '', description: '', deadline: '' });
    setIsSubProjectFormOpen(false);
  };

  const handleUpdateSubProject = () => {
    if (!editingSubProject || !subProjectForm.title.trim()) return;
    updateSubProject(editingSubProject.id, {
      title: subProjectForm.title,
      description: subProjectForm.description,
      deadline: subProjectForm.deadline ? new Date(subProjectForm.deadline) : undefined,
    });
    setEditingSubProject(null);
    setSubProjectForm({ title: '', description: '', deadline: '' });
    setIsSubProjectFormOpen(false);
  };

  const openEditSubProject = (subProject: SubProject) => {
    setEditingSubProject(subProject);
    setSubProjectForm({
      title: subProject.title,
      description: subProject.description || '',
      deadline: subProject.deadline ? new Date(subProject.deadline).toISOString().split('T')[0] : '',
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
      taskForm.deadline ? new Date(taskForm.deadline) : undefined
    );
    setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', parentTaskId: '' });
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
    });
    setEditingTask(null);
    setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', parentTaskId: '' });
    setIsTaskFormOpen(false);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      effort: task.effort,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
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
      parentTaskId: parentTask.id,
    });
    setIsTaskFormOpen(true);
  };

  // Status helpers
  const getStatusColor = (status: WorkItemStatus) => {
    switch (status) {
      case 'Backlog': return isDark ? 'text-gray-400 bg-gray-500/20' : 'text-slate-500 bg-slate-100';
      case 'In Progress': return isDark ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100';
      case 'Done': return isDark ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-100';
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
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render task item with sub-tasks
  const renderTask = (task: ProjectTask, depth = 0) => {
    const subTasks = getSubTasks(task.id);
    const progress = getTaskProgress(task.id);
    const today = new Date().toISOString().split('T')[0];
    const isAddedToToday = task.isFocusedToday && task.focusedDate === today;

    return (
      <div key={task.id} style={{ marginLeft: depth * 20 }}>
        <div className={`group flex items-center justify-between p-3 rounded-xl transition-all ${
          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
        } ${task.status === 'Done' ? 'opacity-60' : ''}`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Status Toggle */}
            <button
              onClick={() => cycleTaskStatus(task)}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${getStatusColor(task.status)}`}
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

            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium truncate ${
                  task.status === 'Done' 
                    ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                    : isDark ? 'text-white' : 'text-slate-800'
                }`}>
                  {task.title}
                </span>
                {/* Priority badge */}
                {task.priority === 'High' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500/20 text-red-400">HIGH</span>
                )}
                {/* Sub-tasks indicator */}
                {subTasks.length > 0 && (
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    ({subTasks.filter(st => st.status === 'Done').length}/{subTasks.length})
                  </span>
                )}
              </div>
              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-1">
                  {task.tags.map(tag => (
                    <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add to Today */}
            {task.status !== 'Done' && (
              <button
                onClick={() => isAddedToToday ? removeTaskFromToday(task.id) : addTaskToToday(task.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isAddedToToday
                    ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    : isDark ? 'hover:bg-violet-500/20 text-gray-400 hover:text-violet-400' : 'hover:bg-violet-50 text-slate-400 hover:text-violet-600'
                }`}
                title={isAddedToToday ? 'Remove from Today' : 'Add to Today'}
              >
                <CalendarPlus size={14} />
              </button>
            )}
            {/* Add Sub-task */}
            <button
              onClick={() => openCreateSubTask(task)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              title="Add sub-task"
            >
              <Plus size={14} />
            </button>
            {/* Edit */}
            <button
              onClick={() => openEditTask(task)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            {/* Delete */}
            <button
              onClick={() => deleteProjectTask(task.id)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Sub-tasks */}
        {subTasks.length > 0 && (
          <div className={`ml-4 pl-4 border-l-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {subTasks.map(st => renderTask(st, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Projects</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '' });
            setIsProjectFormOpen(true);
          }}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main Content - Project List or Detail View */}
        <div className={`flex-1 ${detailView !== 'none' ? 'hidden lg:block lg:w-1/3' : ''}`}>
          {/* Active Projects */}
          {activeProjects.length === 0 ? (
            <div className="card rounded-2xl p-12 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                <FolderKanban className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>No projects yet</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                Create your first project to start organizing your work
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProjects.map(project => {
                const projectSubProjects = getSubProjectsByProject(project.id);
                const progress = getProjectProgress(project.id);
                const isExpanded = expandedProjects.has(project.id);

                return (
                  <div key={project.id} className="card rounded-2xl overflow-hidden">
                    {/* Project Header */}
                    <div
                      className={`p-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                      onClick={() => openProjectDetail(project)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${project.color}20` }}
                          >
                            <FolderKanban size={20} style={{ color: project.color }} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                              {project.title}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                              {projectSubProjects.length} sub-project{projectSubProjects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* Progress */}
                          <div className="flex items-center space-x-2">
                            <div className={`w-20 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, backgroundColor: project.color }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                              {progress}%
                            </span>
                          </div>

                          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed/On Hold Projects */}
          {completedProjects.length > 0 && (
            <div className="mt-6">
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Completed / On Hold
              </h3>
              <div className="space-y-2 opacity-60">
                {completedProjects.map(project => (
                  <div
                    key={project.id}
                    className={`card rounded-xl p-3 cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                    onClick={() => openProjectDetail(project)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${project.color}20` }}
                      >
                        <FolderKanban size={16} style={{ color: project.color }} />
                      </div>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{project.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'Completed' 
                          ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                          : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detailView !== 'none' && (
          <div className={`flex-1 ${detailView !== 'none' ? 'lg:w-2/3' : ''}`}>
            <div className="card rounded-2xl overflow-hidden h-full">
              {/* Detail Header */}
              <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {detailView === 'subproject' && (
                      <button
                        onClick={goBackToProject}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    {detailView === 'project' && selectedProject && (
                      <>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${selectedProject.color}20` }}
                        >
                          <FolderKanban size={20} style={{ color: selectedProject.color }} />
                        </div>
                        <div>
                          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {selectedProject.title}
                          </h2>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                            {getSubProjectsByProject(selectedProject.id).length} sub-projects
                          </p>
                        </div>
                      </>
                    )}
                    {detailView === 'subproject' && selectedSubProject && (
                      <>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                          <Layers size={20} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                        </div>
                        <div>
                          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {selectedSubProject.title}
                          </h2>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                            {getTasksBySubProject(selectedSubProject.id).length} tasks
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {detailView === 'project' && selectedProject && (
                      <>
                        <button
                          onClick={() => openEditProject(selectedProject)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this project and all its contents?')) {
                              deleteProject(selectedProject.id);
                              closeDetailView();
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {detailView === 'subproject' && selectedSubProject && (
                      <>
                        <button
                          onClick={() => openEditSubProject(selectedSubProject)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this sub-project and all its tasks?')) {
                              deleteSubProject(selectedSubProject.id);
                              goBackToProject();
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={closeDetailView}
                      className={`p-2 rounded-lg transition-colors lg:hidden ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {detailView === 'project' && selectedProject?.description && (
                  <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    {selectedProject.description}
                  </p>
                )}
                {detailView === 'subproject' && selectedSubProject?.description && (
                  <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    {selectedSubProject.description}
                  </p>
                )}
              </div>

              {/* Detail Content */}
              <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Project Detail - Show Sub-Projects */}
                {detailView === 'project' && selectedProject && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Sub-Projects</h3>
                      <button
                        onClick={() => {
                          setEditingSubProject(null);
                          setSubProjectForm({ title: '', description: '', deadline: '' });
                          setIsSubProjectFormOpen(true);
                        }}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        }`}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>

                    {getSubProjectsByProject(selectedProject.id).length === 0 ? (
                      <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No sub-projects yet</p>
                      </div>
                    ) : (
                      getSubProjectsByProject(selectedProject.id).map(subProject => {
                        const progress = getSubProjectProgress(subProject.id);
                        const tasks = getTasksBySubProject(subProject.id);

                        return (
                          <div
                            key={subProject.id}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${
                              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                            onClick={() => openSubProjectDetail(subProject)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                                  <Layers size={16} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                                </div>
                                <div>
                                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    {subProject.title}
                                  </h4>
                                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {tasks.filter(t => t.status === 'Done').length} done
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(subProject.status)}`}>
                                  {subProject.status}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                    <div
                                      className="h-full rounded-full bg-violet-500 transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{progress}%</span>
                                </div>
                                <ChevronRight size={16} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Sub-Project Detail - Show Tasks */}
                {detailView === 'subproject' && selectedSubProject && (
                  <div className="space-y-3">
                    {/* Status Selector */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Status:</span>
                      <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        {(['Backlog', 'In Progress', 'Done'] as WorkItemStatus[]).map(status => (
                          <button
                            key={status}
                            onClick={() => updateSubProjectStatus(selectedSubProject.id, status)}
                            className={`px-3 py-1.5 text-xs font-medium transition-all ${
                              selectedSubProject.status === status
                                ? getStatusColor(status)
                                : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Tasks</h3>
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setTaskForm({ title: '', description: '', priority: 'Medium', effort: 'Medium', deadline: '', parentTaskId: '' });
                          setIsTaskFormOpen(true);
                        }}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        }`}
                      >
                        <Plus size={14} />
                        <span>Add Task</span>
                      </button>
                    </div>

                    {getTasksBySubProject(selectedSubProject.id).length === 0 ? (
                      <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                        <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No tasks yet</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {getTasksBySubProject(selectedSubProject.id).map(task => renderTask(task))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Form Modal */}
      {isProjectFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#12121a]' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {editingProject ? 'Edit Project' : 'New Project'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
                <input
                  type="text"
                  value={projectForm.title}
                  onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Project name"
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description / Ideas</label>
                <textarea
                  value={projectForm.description}
                  onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Notes, ideas, context..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setProjectForm(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${projectForm.color === color ? 'ring-2 ring-offset-2 ring-violet-500' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
                <input
                  type="date"
                  value={projectForm.deadline}
                  onChange={e => setProjectForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setIsProjectFormOpen(false); setEditingProject(null); }}
                className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
                className="btn-primary px-4 py-2 rounded-xl"
              >
                {editingProject ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Project Form Modal */}
      {isSubProjectFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#12121a]' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {editingSubProject ? 'Edit Sub-Project' : 'New Sub-Project'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
                <input
                  type="text"
                  value={subProjectForm.title}
                  onChange={e => setSubProjectForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Sub-project name"
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
                <textarea
                  value={subProjectForm.description}
                  onChange={e => setSubProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Description..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
                <input
                  type="date"
                  value={subProjectForm.deadline}
                  onChange={e => setSubProjectForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setIsSubProjectFormOpen(false); setEditingSubProject(null); }}
                className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={editingSubProject ? handleUpdateSubProject : handleCreateSubProject}
                className="btn-primary px-4 py-2 rounded-xl"
              >
                {editingSubProject ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {isTaskFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#12121a]' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {editingTask ? 'Edit Task' : taskForm.parentTaskId ? 'New Sub-Task' : 'New Task'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Task title"
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                  placeholder="Notes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                    }`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Effort</label>
                  <select
                    value={taskForm.effort}
                    onChange={e => setTaskForm(prev => ({ ...prev, effort: e.target.value as any }))}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                      isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                    }`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
                <input
                  type="date"
                  value={taskForm.deadline}
                  onChange={e => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setIsTaskFormOpen(false); setEditingTask(null); }}
                className={`px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                className="btn-primary px-4 py-2 rounded-xl"
              >
                {editingTask ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
