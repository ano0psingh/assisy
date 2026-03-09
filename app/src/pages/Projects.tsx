import { useState, useMemo } from 'react';
import { useProjectContext, PROJECT_COLORS } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Plus, FolderKanban, ChevronRight, 
  Pencil, Trash2, Play, CheckCircle2, Circle,
  X, ListTodo, Layers,
  CalendarPlus, CalendarCheck, ChevronLeft
} from 'lucide-react';
import type { Project, SubProject, ProjectTask, WorkItemStatus, ProjectStatus } from '../types';
import { TiptapEditor } from '../components/common/TiptapEditor';
import { TiptapViewer } from '../components/common/TiptapViewer';
import { ExpandableModal } from '../components/common/ExpandableModal';

type ViewMode = 'list' | 'board';
type DetailView = 'none' | 'project' | 'subproject';

export function Projects() {
  const {
    projects,
    subProjects,
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
    addTaskToToday,
    removeTaskFromToday,
  } = useProjectContext();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // View state
  const [_viewMode, _setViewMode] = useState<ViewMode>('list'); // Reserved for future board view
  const [detailView, setDetailView] = useState<DetailView>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSubProjectId, setSelectedSubProjectId] = useState<string | null>(null);

  // Derive selected project/subproject from context to stay in sync
  const selectedProject = useMemo(() => 
    selectedProjectId ? projects.find(p => p.id === selectedProjectId) || null : null,
    [selectedProjectId, projects]
  );
  
  const selectedSubProject = useMemo(() => 
    selectedSubProjectId ? subProjects.find(sp => sp.id === selectedSubProjectId) || null : null,
    [selectedSubProjectId, subProjects]
  );

  // Form states
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isSubProjectFormOpen, setIsSubProjectFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSubProject, setEditingSubProject] = useState<SubProject | null>(null);
  
  // Filter states
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [subProjectStatusFilter, setSubProjectStatusFilter] = useState<WorkItemStatus | 'All'>('All');
  const [taskStatusFilter, setTaskStatusFilter] = useState<WorkItemStatus | 'All'>('All');
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
    parentTaskId: '',
  });

  // Filter projects by status
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (projectStatusFilter !== 'All') {
      filtered = projects.filter(p => p.status === projectStatusFilter);
    }
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [projects, projectStatusFilter]);
  

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
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
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
      deadline: subProject.deadline ? new Date(subProject.deadline).toISOString().split('T')[0] : '',
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
    const today = new Date().toISOString().split('T')[0];
    const isAddedToToday = task.isFocusedToday && task.focusedDate === today;

    return (
      <div key={task.id} style={{ marginLeft: depth * 20 }}>
        <div className={`group flex items-center justify-between gap-2 p-3 rounded-xl transition-all overflow-hidden ${
          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
        } ${task.status === 'Done' ? 'opacity-60' : ''}`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
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
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-medium truncate min-w-0 ${
                  task.status === 'Done' 
                    ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                    : isDark ? 'text-white' : 'text-slate-800'
                }`}>
                  {task.title}
                </span>
                {task.priority === 'High' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500/20 text-red-400 flex-shrink-0">HIGH</span>
                )}
                {subTasks.length > 0 && (
                  <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    ({subTasks.filter(st => st.status === 'Done').length}/{subTasks.length})
                  </span>
                )}
              </div>
              {task.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
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
                className={`p-1.5 rounded-lg transition-all ${
                  isAddedToToday
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200'
                    : isDark ? 'hover:bg-violet-500/20 text-gray-400 hover:text-violet-400' : 'hover:bg-violet-50 text-slate-400 hover:text-violet-600'
                }`}
                title={isAddedToToday ? 'Added to Today (click to remove)' : 'Add to Today'}
              >
                {isAddedToToday ? <CalendarCheck size={14} /> : <CalendarPlus size={14} />}
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

        {/* Description */}
        {task.description && task.description.trim() && (
          <div className={`mx-3 mb-2 pt-1 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-50'}`}>
            <TiptapViewer content={task.description} collapsible maxHeight={50} />
          </div>
        )}

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Projects</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {projects.filter(p => p.status === 'Active').length} active project{projects.filter(p => p.status === 'Active').length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setProjectForm({ title: '', description: '', color: PROJECT_COLORS[0], deadline: '', status: 'Active' });
            setIsProjectFormOpen(true);
          }}
          className="btn-primary px-4 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center space-x-2 text-sm md:text-base"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main Content - Project List or Detail View */}
        <div className={`flex-1 ${detailView !== 'none' ? 'hidden md:block md:w-1/3' : ''}`}>
          {/* Project Status Filter */}
          <div className="mb-4">
            <div className={`flex items-center space-x-2`}>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Filter:</span>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['All', 'Active', 'Completed', 'On Hold'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setProjectStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      projectStatusFilter === status
                        ? status === 'All' 
                          ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                          : status === 'Active' 
                            ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                            : status === 'Completed'
                              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                              : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                        : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
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
            <div className="card rounded-2xl p-12 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                <FolderKanban className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {projects.length === 0 ? 'No projects yet' : `No ${projectStatusFilter.toLowerCase()} projects`}
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                {projects.length === 0 
                  ? 'Create your first project to start organizing your work'
                  : `Try selecting a different filter to see more projects`}
              </p>
              {projectStatusFilter !== 'All' && (
                <button
                  onClick={() => setProjectStatusFilter('All')}
                  className="text-violet-500 text-sm hover:underline"
                >
                  Show all projects
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map(project => {
                const projectSubProjects = getSubProjectsByProject(project.id);
                const progress = getProjectProgress(project.id);

                return (
                  <div key={project.id} className="card rounded-2xl overflow-hidden">
                    {/* Project Header */}
                    <div
                      className={`p-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                      onClick={() => openProjectDetail(project)}
                    >
                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${project.color}20` }}
                          >
                            <FolderKanban size={20} style={{ color: project.color }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                              {project.title}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                              {projectSubProjects.length} sub-project{projectSubProjects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full hidden sm:inline ${
                            project.status === 'Active' 
                              ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                              : project.status === 'Completed'
                                ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {project.status}
                          </span>
                          
                          <div className="hidden sm:flex items-center space-x-2">
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

                          <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
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
            <div className="card rounded-2xl overflow-hidden h-full">
              {/* Detail Header */}
              <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Back button - always show on mobile, only for subproject on desktop */}
                    <button
                      onClick={detailView === 'subproject' ? goBackToProject : () => setDetailView('none')}
                      className={`p-2 rounded-lg transition-colors ${detailView === 'project' ? 'md:hidden' : ''} ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {detailView === 'project' && selectedProject && (
                      <>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${selectedProject.color}20` }}
                        >
                          <FolderKanban size={20} style={{ color: selectedProject.color }} />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                          <Layers size={20} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                        </div>
                        <div className="min-w-0">
                          <h2 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {selectedSubProject.title}
                          </h2>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                            {getTasksBySubProject(selectedSubProject.id).length} tasks
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
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
                    {/* Sub-Project Filter */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Filter:</span>
                      <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        {(['All', 'Backlog', 'In Progress', 'Done'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setSubProjectStatusFilter(status)}
                            className={`px-3 py-1.5 text-xs font-medium transition-all ${
                              subProjectStatusFilter === status
                                ? status === 'All' 
                                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                                  : getStatusColor(status as WorkItemStatus)
                                : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Sub-Projects</h3>
                      <button
                        onClick={() => {
                          setEditingSubProject(null);
                          setSubProjectForm({ title: '', description: '', deadline: '', status: 'Backlog' });
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

                    {(() => {
                      const allSubProjects = getSubProjectsByProject(selectedProject.id);
                      const filteredSubProjects = subProjectStatusFilter === 'All'
                        ? allSubProjects
                        : allSubProjects.filter(sp => sp.status === subProjectStatusFilter);
                      
                      if (allSubProjects.length === 0) {
                        return (
                          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No sub-projects yet</p>
                          </div>
                        );
                      }
                      
                      if (filteredSubProjects.length === 0) {
                        return (
                          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No {subProjectStatusFilter.toLowerCase()} sub-projects</p>
                            <button 
                              onClick={() => setSubProjectStatusFilter('All')}
                              className="text-violet-500 text-sm mt-2 hover:underline"
                            >
                              Show all sub-projects
                            </button>
                          </div>
                        );
                      }
                      
                      return filteredSubProjects.map(subProject => {
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
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                                  <Layers size={16} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    {subProject.title}
                                  </h4>
                                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {tasks.filter(t => t.status === 'Done').length} done
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-1 rounded-full hidden sm:inline ${getStatusColor(subProject.status)}`}>
                                  {subProject.status}
                                </span>
                                <div className="hidden sm:flex items-center space-x-2">
                                  <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                    <div
                                      className="h-full rounded-full bg-violet-500 transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{progress}%</span>
                                </div>
                                <ChevronRight size={16} className={`flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
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
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Filter:</span>
                      <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        {(['All', 'Backlog', 'In Progress', 'Done'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setTaskStatusFilter(status)}
                            className={`px-3 py-1.5 text-xs font-medium transition-all ${
                              taskStatusFilter === status
                                ? status === 'All' 
                                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                                  : getStatusColor(status as WorkItemStatus)
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

                    {(() => {
                      const allTasks = getTasksBySubProject(selectedSubProject.id);
                      const filteredTasks = taskStatusFilter === 'All' 
                        ? allTasks 
                        : allTasks.filter(t => t.status === taskStatusFilter);
                      
                      if (allTasks.length === 0) {
                        return (
                          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No tasks yet</p>
                          </div>
                        );
                      }
                      
                      if (filteredTasks.length === 0) {
                        return (
                          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No {taskStatusFilter.toLowerCase()} tasks</p>
                            <button 
                              onClick={() => setTaskStatusFilter('All')}
                              className="text-violet-500 text-sm mt-2 hover:underline"
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

      {/* Project Form Modal */}
      <ExpandableModal
        isOpen={isProjectFormOpen}
        onClose={() => { setIsProjectFormOpen(false); setEditingProject(null); }}
        title={editingProject ? 'Edit Project' : 'New Project'}
        icon={<FolderKanban className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
        footer={
          <div className="flex justify-end space-x-3">
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
        }
      >
        {(isFS) => {
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
              <input
                type="text"
                value={projectForm.title}
                onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                  isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                }`}
                placeholder="Project name"
                autoFocus
              />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Notes & Ideas</label>
              <TiptapEditor
                content={projectForm.description}
                onChange={val => setProjectForm(prev => ({ ...prev, description: val }))}
                placeholder="Notes, ideas, context..."
              />
            </div>
          );
          const colorInput = (
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
          );
          const deadlineInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
              <input
                type="date"
                value={projectForm.deadline}
                onChange={e => setProjectForm(prev => ({ ...prev, deadline: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                  isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
                }`}
              />
            </div>
          );
          const statusInput = editingProject ? (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status</label>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['Active', 'Completed', 'On Hold'] as ProjectStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setProjectForm(prev => ({ ...prev, status }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${
                      projectForm.status === status
                        ? status === 'Active'
                          ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                          : status === 'Completed'
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                            : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                        : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ) : null;

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Project details</h3>
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
            </div>
          );
        }}
      </ExpandableModal>

      {/* Sub-Project Form Modal */}
      <ExpandableModal
        isOpen={isSubProjectFormOpen}
        onClose={() => { setIsSubProjectFormOpen(false); setEditingSubProject(null); }}
        title={editingSubProject ? 'Edit Sub-Project' : 'New Sub-Project'}
        icon={<Layers className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
        footer={
          <div className="flex justify-end space-x-3">
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
        }
      >
        {(isFS) => {
          const inputCls = `w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
            isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
              <input type="text" value={subProjectForm.title} onChange={e => setSubProjectForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="Sub-project name" autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Notes</label>
              <TiptapEditor content={subProjectForm.description} onChange={val => setSubProjectForm(prev => ({ ...prev, description: val }))} placeholder="Add notes or a description..." />
            </div>
          );
          const deadlineInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
              <input type="date" value={subProjectForm.deadline} onChange={e => setSubProjectForm(prev => ({ ...prev, deadline: e.target.value }))} className={inputCls} />
            </div>
          );
          const statusInput = editingSubProject ? (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status</label>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {(['Backlog', 'In Progress', 'Done'] as WorkItemStatus[]).map(status => (
                  <button key={status} type="button" onClick={() => setSubProjectForm(prev => ({ ...prev, status }))} className={`flex-1 px-3 py-2 text-sm font-medium transition-all ${subProjectForm.status === status ? getStatusColor(status) : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>{status}</button>
                ))}
              </div>
            </div>
          ) : null;

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Details</h3>
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
        icon={<ListTodo className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
        footer={
          <div className="flex justify-end space-x-3">
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
        }
      >
        {(isFS) => {
          const inputCls = `w-full px-4 py-2.5 rounded-xl border transition-colors outline-none ${
            isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'
          }`;
          const titleInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Title</label>
              <input type="text" value={taskForm.title} onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="Task title" autoFocus />
            </div>
          );
          const notesInput = (
            <div className={isFS ? 'flex-1' : ''}>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Notes</label>
              <TiptapEditor content={taskForm.description} onChange={val => setTaskForm(prev => ({ ...prev, description: val }))} placeholder="Add notes or details..." />
            </div>
          );
          const priorityEffort = (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))} className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Effort</label>
                <select value={taskForm.effort} onChange={e => setTaskForm(prev => ({ ...prev, effort: e.target.value as any }))} className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          );
          const deadlineInput = (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Deadline (optional)</label>
              <input type="date" value={taskForm.deadline} onChange={e => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))} className={inputCls} />
            </div>
          );

          return isFS ? (
            <div className="flex h-full">
              <div className={`flex-1 flex flex-col p-8 space-y-4 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                {titleInput}
                {notesInput}
              </div>
              <div className={`w-80 flex-shrink-0 p-6 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Task details</h3>
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
    </div>
  );
}
