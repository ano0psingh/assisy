import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Task, TaskCategory, Priority, Effort, RecurrencePattern } from '../types';
import { LocalStorage } from '../store/localStorage';
import { saveTasks as saveTasksToStore } from '../store/unifiedStore';
import { getTaskXPValue } from '../utils/xpCalculator';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useDataVersion } from './DataVersionContext';

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
    recurrencePattern?: RecurrencePattern,
    specificDays?: number[],
    goalId?: string,
    dueDate?: Date,
    monthDay?: number
  ) => Task;
  linkTaskToGoal: (taskId: string, goalId: string) => void;
  unlinkTaskFromGoal: (taskId: string) => void;
  getTasksByGoal: (goalId: string) => Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  getTodaysTasks: () => Task[];
  carryForwardTasks: () => void;
  getTasksByCategory: (category: TaskCategory) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getTotalXP: () => number;
  addToToday: (taskId: string) => void;
  removeFromToday: (taskId: string) => void;
  getSuggestedTasks: () => Task[];
  hasSeenPlanYourDay: () => boolean;
  markPlanYourDaySeen: () => void;
  skipOccurrence: (taskId: string) => void;
  pauseRecurring: (taskId: string, days: number) => void;
  resumeRecurring: (taskId: string) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

// Helper function to update a task in the array
const updateTaskInArray = (tasks: Task[], taskId: string, updates: Partial<Task>): Task[] => {
  return tasks.map(task => {
    if (task.id === taskId) {
      const updatedTask = { ...task, ...updates };
      if ('priority' in updates || 'effort' in updates || 'category' in updates) {
        updatedTask.xpValue = getTaskXPValue(updatedTask);
      }
      return updatedTask;
    }
    return task;
  });
};

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { dataVersion } = useDataVersion();
  const userId = user?.id ?? null;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTasks = LocalStorage.getTasks();
    const todayStr = new Date().toDateString();
    let needsSave = false;
    const processed = savedTasks.map(task => {
      if (task.isRecurring && task.status === 'Completed' && task.completedAt) {
        const completedDateStr = new Date(task.completedAt).toDateString();
        if (completedDateStr !== todayStr) {
          needsSave = true;
          return { ...task, status: 'Pending' as const };
        }
      }
      return task;
    });
    setTasks(processed);
    if (needsSave) {
      LocalStorage.saveTasks(processed);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  const createTask = useCallback((
    title: string,
    description: string = '',
    category: TaskCategory = 'Personal',
    priority: Priority = 'High',
    effort: Effort = 'Low',
    isRecurring: boolean = false,
    recurrencePattern?: RecurrencePattern,
    specificDays?: number[],
    goalId?: string,
    dueDate?: Date,
    monthDay?: number
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
      monthDay,
      goalId,
      dueDate,
      createdAt: new Date(),
      xpValue,
    };

    setTasks(prev => {
      const updated = [...prev, newTask];
      saveTasksToStore(updated, userId);
      return updated;
    });
    
    return newTask;
  }, [userId]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, updates);
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const linkTaskToGoal = useCallback((taskId: string, goalId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, { goalId });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const unlinkTaskFromGoal = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, { goalId: undefined });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const getTasksByGoal = useCallback((goalId: string): Task[] => {
    return tasks.filter(task => task.goalId === goalId);
  }, [tasks]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== taskId);
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, {
        status: 'Completed',
        completedAt: new Date(),
      });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const uncompleteTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, {
        status: 'Pending',
        completedAt: undefined,
      });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const getTodayStr = useCallback((): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const getTodaysTasks = useCallback((): Task[] => {
    const today = new Date();
    const todayStr = getTodayStr();
    
    return tasks
      .filter(task => {
        // For recurring tasks: if completed on a PREVIOUS day, treat as available again
        if (task.isRecurring && task.status === 'Completed' && task.completedAt) {
          const completedStr = new Date(task.completedAt).toISOString().split('T')[0];
          if (completedStr === todayStr) {
            return true; // completed today — show in completed section
          }
          // Completed on a previous day — check if it's scheduled for today and show as pending
        }

        // Non-recurring completed tasks stay hidden
        if (task.status === 'Completed' && !task.isRecurring) return false;
        // Recurring completed today — already handled above
        if (task.status === 'Completed' && task.isRecurring) {
          const completedStr = task.completedAt ? new Date(task.completedAt).toISOString().split('T')[0] : '';
          if (completedStr === todayStr) return true;
          // Fall through to recurring schedule check below
        }
        
        // 1. Manually focused for today
        if (task.isFocusedToday && task.focusedDate === todayStr) {
          return true;
        }
        
        // 2. Due today
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          if (dueDate.getTime() === todayDate.getTime()) {
            return true;
          }
        }
        
        // 3. Overdue (past due date)
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          if (dueDate < todayDate) {
            return true;
          }
        }
        
        // 4. Recurring tasks (may be Pending or Completed-on-previous-day)
        if (task.isRecurring) {
          // Skip if paused
          if (task.pausedUntil && todayStr <= task.pausedUntil) return false;
          // Skip if this date is in skippedDates
          if (task.skippedDates?.includes(todayStr)) return false;

          if (task.recurrencePattern === 'daily') {
            return true;
          }
          if (task.recurrencePattern === 'weekly' || task.recurrencePattern === 'specific_days') {
            const dayOfWeek = today.getDay();
            return task.specificDays?.includes(dayOfWeek) || false;
          }
          if (task.recurrencePattern === 'monthly') {
            return today.getDate() === (task.monthDay ?? 1);
          }
        }
        
        // 5. Carried forward tasks
        if (task.status === 'Carried Forward') return true;
        
        return false;
      })
      .map(task => {
        // Auto-reset recurring tasks completed on a previous day so they appear as pending
        if (task.isRecurring && task.status === 'Completed' && task.completedAt) {
          const completedStr = new Date(task.completedAt).toISOString().split('T')[0];
          if (completedStr !== todayStr) {
            return { ...task, status: 'Pending' as const };
          }
        }
        return task;
      })
      .sort((a, b) => {
        const priorityOrder = { High: 0, Low: 1 };
        const effortOrder = { High: 0, Low: 1 };
        
        // Sort overdue first, then by priority, then effort
        const aOverdue = a.dueDate && new Date(a.dueDate) < new Date() ? -1 : 0;
        const bOverdue = b.dueDate && new Date(b.dueDate) < new Date() ? -1 : 0;
        
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return effortOrder[a.effort] - effortOrder[b.effort];
      });
  }, [tasks, getTodayStr]);

  const carryForwardTasks = useCallback(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    setTasks(prev => {
      const updated = prev.map(task => {
        // Reset recurring tasks that were completed on a previous day
        if (task.isRecurring && task.status === 'Completed' && task.completedAt) {
          const completedDateStr = new Date(task.completedAt).toDateString();
          if (completedDateStr !== todayStr) {
            return { ...task, status: 'Pending' as const };
          }
        }

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
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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

  const addToToday = useCallback((taskId: string) => {
    const todayStr = getTodayStr();
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, {
        isFocusedToday: true,
        focusedDate: todayStr,
      });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [getTodayStr, userId]);

  const removeFromToday = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, {
        isFocusedToday: false,
        focusedDate: undefined,
      });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  // Get tasks suggested for "Plan Your Day" - pending tasks not already in today (exclude recurring; they auto-appear on scheduled days)
  const getSuggestedTasks = useCallback((): Task[] => {
    const todayTasks = getTodaysTasks();
    const todayTaskIds = new Set(todayTasks.map(t => t.id));
    
    return tasks
      .filter(task => {
        if (task.status === 'Completed') return false;
        if (task.isRecurring) return false; // recurring tasks auto-added to their scheduled day
        if (todayTaskIds.has(task.id)) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { High: 0, Low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Then by due date (closest first)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      })
      .slice(0, 10); // Limit suggestions
  }, [tasks, getTodaysTasks, getTodayStr]);

  const hasSeenPlanYourDay = useCallback((): boolean => {
    const todayStr = getTodayStr();
    const lastSeen = localStorage.getItem('planYourDay_lastSeen');
    return lastSeen === todayStr;
  }, [getTodayStr]);

  const markPlanYourDaySeen = useCallback(() => {
    const todayStr = getTodayStr();
    localStorage.setItem('planYourDay_lastSeen', todayStr);
  }, [getTodayStr]);

  const skipOccurrence = useCallback((taskId: string) => {
    const todayStr = getTodayStr();
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== taskId) return task;
        const existing = task.skippedDates ?? [];
        if (existing.includes(todayStr)) return task;
        return { ...task, skippedDates: [...existing, todayStr] };
      });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [getTodayStr, userId]);

  const pauseRecurring = useCallback((taskId: string, days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const untilStr = until.toISOString().split('T')[0];
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, { pausedUntil: untilStr });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const resumeRecurring = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = updateTaskInArray(prev, taskId, { pausedUntil: undefined });
      saveTasksToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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
      linkTaskToGoal,
      unlinkTaskFromGoal,
      getTasksByGoal,
      addToToday,
      removeFromToday,
      getSuggestedTasks,
      hasSeenPlanYourDay,
      markPlanYourDaySeen,
      skipOccurrence,
      pauseRecurring,
      resumeRecurring,
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
