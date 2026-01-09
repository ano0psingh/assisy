import type { Task, Goal, DailyLog, Habit } from '../types';

const STORAGE_KEYS = {
  TASKS: 'life-rpg-tasks',
  GOALS: 'life-rpg-goals',
  DAILY_LOGS: 'life-rpg-daily-logs',
  HABITS: 'life-rpg-habits',
} as const;

export class LocalStorage {
  static getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) return [];
      
      const tasks = JSON.parse(data);
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      }));
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return [];
    }
  }

  static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }

  static getGoals(): Goal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (!data) return [];
      
      const goals = JSON.parse(data);
      return goals.map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error loading goals from localStorage:', error);
      return [];
    }
  }

  static saveGoals(goals: Goal[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals to localStorage:', error);
    }
  }

  static getDailyLogs(): DailyLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
      if (!data) return [];
      
      const logs = JSON.parse(data);
      return logs.map((log: any) => ({
        ...log,
        date: new Date(log.date),
      }));
    } catch (error) {
      console.error('Error loading daily logs from localStorage:', error);
      return [];
    }
  }

  static saveDailyLogs(logs: DailyLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving daily logs to localStorage:', error);
    }
  }

  static getHabits(): Habit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (!data) return [];
      
      const habits = JSON.parse(data);
      return habits.map((habit: any) => ({
        ...habit,
        lastCompletedDate: habit.lastCompletedDate ? new Date(habit.lastCompletedDate) : undefined,
      }));
    } catch (error) {
      console.error('Error loading habits from localStorage:', error);
      return [];
    }
  }

  static saveHabits(habits: Habit[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (error) {
      console.error('Error saving habits to localStorage:', error);
    }
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}