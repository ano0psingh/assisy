import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Task, TaskCategory, Priority, Effort } from '../types';
import { LocalStorage } from '../store/localStorage';
import { getTaskXPValue } from '../utils/xpCalculator';
import { v4 as uuidv4 } from 'uuid';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  createTask: (
    title: string,
    description?: string,
    category?: TaskCategory,
    priority?: Priority,
    effort?: Effort,
    isRecurring?: boolean,
    recurrencePattern?: 'daily' | 'weekly',
    specificDays?: number[]
  ) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  getTodaysTasks: () => Task[];
  carryForwardTasks: () => void;
  getTasksByCategory: (category: TaskCategory) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getTotalXP: () => number;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTasks = LocalStorage.getTasks();
    setTasks(savedTasks);
    setLoading(false);
  }, []);

  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    LocalStorage.saveTasks(newTasks);
  }, []);

  const createTask = useCallback((
    title: string,
    description: string = '',
    category: TaskCategory = 'Personal',
    priority: Priority = 'High',
    effort: Effort = 'Low',
    isRecurring: boolean = false,
    recurrencePattern?: 'daily' | 'weekly',
    specificDays?: number[]
  ): Task => {
    const xpValue = getTaskXPValue({
      category,
      priority,
      effort,
    } as Task);

    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      category,
      priority,
      effort,
      status: 'Pending',
      isRecurring,
      recurrencePattern,
      specificDays,
      createdAt: new Date(),
      xpValue,
    };

    setTasks(prev => {
      const updated = [...prev, newTask];
      LocalStorage.saveTasks(updated);
      return updated;
    });
    
    return newTask;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id === taskId) {
          const updatedTask = { ...task, ...updates };
          if ('priority' in updates || 'effort' in updates || 'category' in updates) {
            updatedTask.xpValue = getTaskXPValue(updatedTask);
          }
          return updatedTask;
        }
        return task;
      });
      LocalStorage.saveTasks(updated);
      return updated;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== taskId);
      LocalStorage.saveTasks(updated);
      return updated;
    });
  }, []);

  const completeTask = useCallback((taskId: string) => {
    updateTask(taskId, {
      status: 'Completed',
      completedAt: new Date(),
    });
  }, [updateTask]);

  const uncompleteTask = useCallback((taskId: string) => {
    updateTask(taskId, {
      status: 'Pending',
      completedAt: undefined,
    });
  }, [updateTask]);

  const getTodaysTasks = useCallback((): Task[] => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    return tasks
      .filter(task => {
        if (task.status === 'Completed') return false;
        
        if (task.isRecurring) {
          if (task.recurrencePattern === 'daily') {
            return true;
          }
          if (task.recurrencePattern === 'weekly') {
            const dayOfWeek = today.getDay();
            return task.specificDays?.includes(dayOfWeek) || false;
          }
        }
        
        if (task.status === 'Carried Forward') return true;
        
        const taskDate = new Date(task.createdAt).toDateString();
        return taskDate === todayStr;
      })
      // Sort by priority (High first), then by effort (High first for same priority)
      .sort((a, b) => {
        const priorityOrder = { High: 0, Low: 1 };
        const effortOrder = { High: 0, Low: 1 };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return effortOrder[a.effort] - effortOrder[b.effort];
      });
  }, [tasks]);

  const carryForwardTasks = useCallback(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    setTasks(prev => {
      const updated = prev.map(task => {
        const taskDate = new Date(task.createdAt).toDateString();
        if (
          task.status === 'Pending' &&
          !task.isRecurring &&
          taskDate !== todayStr
        ) {
          return { ...task, status: 'Carried Forward' as const };
        }
        return task;
      });
      LocalStorage.saveTasks(updated);
      return updated;
    });
  }, []);

  const getTasksByCategory = useCallback((category: TaskCategory): Task[] => {
    return tasks.filter(task => task.category === category);
  }, [tasks]);

  const getTasksByStatus = useCallback((status: Task['status']): Task[] => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const getTotalXP = useCallback((): number => {
    return tasks
      .filter(t => t.status === 'Completed')
      .reduce((sum, task) => sum + task.xpValue, 0);
  }, [tasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      uncompleteTask,
      getTodaysTasks,
      carryForwardTasks,
      getTasksByCategory,
      getTasksByStatus,
      getTotalXP,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
