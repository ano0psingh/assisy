import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Habit, TrackingType } from '../types';
import { LocalStorage } from '../store/localStorage';
import { saveHabits as saveHabitsToStore, saveHabitLogs as saveHabitLogsToStore } from '../store/unifiedStore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useDataVersion } from './DataVersionContext';

interface HabitLog {
  date: string; // YYYY-MM-DD format
  value: number;
}

interface HabitWithLogs extends Habit {
  logs: HabitLog[];
}

interface HabitContextType {
  habits: HabitWithLogs[];
  loading: boolean;
  createHabit: (
    name: string,
    trackingType: TrackingType,
    category: string,
    xpPerUnit?: number
  ) => HabitWithLogs;
  updateHabit: (habitId: string, updates: Partial<Habit>) => void;
  deleteHabit: (habitId: string) => void;
  logHabit: (habitId: string, value: number, date?: Date) => void;
  getHabitStreak: (habitId: string) => number;
  getTodaysLog: (habitId: string) => number;
  getHabitLogs: (habitId: string, days?: number) => HabitLog[];
  getHabitById: (habitId: string) => HabitWithLogs | undefined;
  getTotalXPFromHabits: () => number;
}

const HabitContext = createContext<HabitContextType | null>(null);

const HABIT_LOGS_KEY = 'life-rpg-habit-logs';

// Helper to get date string in YYYY-MM-DD format
const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to calculate streak
const calculateStreak = (logs: HabitLog[]): number => {
  if (logs.length === 0) return 0;
  
  const sortedLogs = [...logs]
    .filter(log => log.value > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedLogs.length === 0) return 0;
  
  const today = getDateString(new Date());
  const yesterday = getDateString(new Date(Date.now() - 86400000));
  
  // Check if the most recent log is today or yesterday
  if (sortedLogs[0].date !== today && sortedLogs[0].date !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(sortedLogs[0].date);
  
  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(currentDate.getTime() - 86400000);
    const prevDateStr = getDateString(prevDate);
    
    if (sortedLogs[i].date === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
};

export function HabitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { dataVersion } = useDataVersion();
  const userId = user?.id ?? null;
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);

  // Load habits and their logs
  useEffect(() => {
    const savedHabits = LocalStorage.getHabits();
    const savedLogs = localStorage.getItem(HABIT_LOGS_KEY);
    const logsMap: Record<string, HabitLog[]> = savedLogs ? JSON.parse(savedLogs) : {};
    
    const habitsWithLogs: HabitWithLogs[] = savedHabits.map(habit => ({
      ...habit,
      logs: logsMap[habit.id] || [],
      streakCount: calculateStreak(logsMap[habit.id] || []),
    }));
    
    setHabits(habitsWithLogs);
    setLoading(false);
  }, [dataVersion]);

  // Save habits (without logs)
  const saveHabits = useCallback((habitsToSave: HabitWithLogs[]) => {
    const habitsWithoutLogs: Habit[] = habitsToSave.map(({ logs, ...habit }) => habit);
    saveHabitsToStore(habitsWithoutLogs, userId);
  }, [userId]);

  // Save logs separately
  const saveLogs = useCallback((habitsWithLogs: HabitWithLogs[]) => {
    const logsMap: Record<string, HabitLog[]> = {};
    habitsWithLogs.forEach(habit => {
      logsMap[habit.id] = habit.logs;
    });
    saveHabitLogsToStore(logsMap, userId);
  }, [userId]);

  const createHabit = useCallback((
    name: string,
    trackingType: TrackingType,
    category: string,
    xpPerUnit: number = 1
  ): HabitWithLogs => {
    const newHabit: HabitWithLogs = {
      id: uuidv4(),
      name,
      trackingType,
      category,
      streakCount: 0,
      xpPerUnit,
      logs: [],
    };

    setHabits(prev => {
      const updated = [...prev, newHabit];
      saveHabits(updated);
      saveLogs(updated);
      return updated;
    });
    
    return newHabit;
  }, [saveHabits, saveLogs]);

  const updateHabit = useCallback((habitId: string, updates: Partial<Habit>) => {
    setHabits(prev => {
      const updated = prev.map(habit => {
        if (habit.id === habitId) {
          return { ...habit, ...updates };
        }
        return habit;
      });
      saveHabits(updated);
      return updated;
    });
  }, [saveHabits]);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits(prev => {
      const updated = prev.filter(habit => habit.id !== habitId);
      saveHabits(updated);
      saveLogs(updated);
      return updated;
    });
  }, [saveHabits, saveLogs]);

  const logHabit = useCallback((habitId: string, value: number, date?: Date) => {
    const dateStr = getDateString(date || new Date());
    
    setHabits(prev => {
      const updated = prev.map(habit => {
        if (habit.id === habitId) {
          // Check if there's already a log for this date
          const existingLogIndex = habit.logs.findIndex(log => log.date === dateStr);
          let newLogs: HabitLog[];
          
          if (existingLogIndex >= 0) {
            // Update existing log
            newLogs = [...habit.logs];
            newLogs[existingLogIndex] = { date: dateStr, value };
          } else {
            // Add new log
            newLogs = [...habit.logs, { date: dateStr, value }];
          }
          
          const newStreak = calculateStreak(newLogs);
          
          return {
            ...habit,
            logs: newLogs,
            streakCount: newStreak,
            lastCompletedDate: value > 0 ? new Date() : habit.lastCompletedDate,
          };
        }
        return habit;
      });
      
      saveHabits(updated);
      saveLogs(updated);
      return updated;
    });
  }, [saveHabits, saveLogs]);

  const getHabitStreak = useCallback((habitId: string): number => {
    const habit = habits.find(h => h.id === habitId);
    return habit?.streakCount || 0;
  }, [habits]);

  const getTodaysLog = useCallback((habitId: string): number => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    
    const today = getDateString(new Date());
    const todayLog = habit.logs.find(log => log.date === today);
    return todayLog?.value || 0;
  }, [habits]);

  const getHabitLogs = useCallback((habitId: string, days: number = 365): HabitLog[] => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = getDateString(cutoffDate);
    
    return habit.logs
      .filter(log => log.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [habits]);

  const getHabitById = useCallback((habitId: string): HabitWithLogs | undefined => {
    return habits.find(h => h.id === habitId);
  }, [habits]);

  const getTotalXPFromHabits = useCallback((): number => {
    return habits.reduce((total, habit) => {
      const logTotal = habit.logs.reduce((sum, log) => sum + log.value, 0);
      return total + (logTotal * habit.xpPerUnit);
    }, 0);
  }, [habits]);

  return (
    <HabitContext.Provider value={{
      habits,
      loading,
      createHabit,
      updateHabit,
      deleteHabit,
      logHabit,
      getHabitStreak,
      getTodaysLog,
      getHabitLogs,
      getHabitById,
      getTotalXPFromHabits,
    }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabitContext() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabitContext must be used within a HabitProvider');
  }
  return context;
}
