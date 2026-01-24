import { useState, useEffect } from 'react';
import type { Task, TaskCategory, Priority, Effort } from '../types';
import { LocalStorage } from '../store/localStorage';
import { getTaskXPValue } from '../utils/xpCalculator';
import { v4 as uuidv4 } from 'uuid';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = () => {
      const savedTasks = LocalStorage.getTasks();
      setTasks(savedTasks);
      setLoading(false);
    };

    loadTasks();
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    LocalStorage.saveTasks(newTasks);
  };

  const createTask = (
    title: string,
    description: string = '',
    category: TaskCategory,
    priority: Priority,
    effort: Effort,
    isRecurring: boolean = false,
    recurrencePattern?: 'daily' | 'weekly',
    specificDays?: number[]
  ) => {
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

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    return newTask;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, ...updates };
        if ('priority' in updates || 'effort' in updates || 'category' in updates) {
          updatedTask.xpValue = getTaskXPValue(updatedTask);
        }
        return updatedTask;
      }
      return task;
    });
    saveTasks(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
  };

  const completeTask = (taskId: string) => {
    updateTask(taskId, {
      status: 'Completed',
      completedAt: new Date(),
    });
  };

  const getTodaysTasks = (): Task[] => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    return tasks.filter(task => {
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
      
      return task.createdAt.toDateString() === todayStr;
    });
  };

  const carryForwardTasks = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    const updatedTasks = tasks.map(task => {
      if (
        task.status === 'Pending' &&
        !task.isRecurring &&
        task.createdAt.toDateString() !== todayStr
      ) {
        return { ...task, status: 'Carried Forward' as const };
      }
      return task;
    });
    
    saveTasks(updatedTasks);
  };

  const getTasksByCategory = (category: TaskCategory): Task[] => {
    return tasks.filter(task => task.category === category);
  };

  const getTasksByStatus = (status: Task['status']): Task[] => {
    return tasks.filter(task => task.status === status);
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    getTodaysTasks,
    carryForwardTasks,
    getTasksByCategory,
    getTasksByStatus,
  };
}