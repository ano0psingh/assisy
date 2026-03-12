import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { DailyLog } from '../types';
import { LocalStorage } from '../store/localStorage';
import { saveDailyLogs as saveDailyLogsToStore } from '../store/unifiedStore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useDataVersion } from './DataVersionContext';

interface DailyLogContextType {
  dailyLogs: DailyLog[];
  loading: boolean;
  createOrUpdateLog: (date: Date, data: Partial<Omit<DailyLog, 'id' | 'date'>>) => DailyLog;
  getLogByDate: (date: Date) => DailyLog | undefined;
  getTodaysLog: () => DailyLog | undefined;
  getRecentLogs: (days?: number) => DailyLog[];
  deleteLog: (logId: string) => void;
  hasCheckedInToday: () => boolean;
}

const DailyLogContext = createContext<DailyLogContextType | null>(null);

// Helper to get date string in YYYY-MM-DD format using LOCAL time
const getDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function DailyLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { dataVersion } = useDataVersion();
  const userId = user?.id ?? null;
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLogs = LocalStorage.getDailyLogs();
    setDailyLogs(savedLogs);
    setLoading(false);
  }, [dataVersion]);

  const createOrUpdateLog = useCallback((date: Date, data: Partial<Omit<DailyLog, 'id' | 'date'>>): DailyLog => {
    const dateStr = getDateString(date);
    
    let resultLog: DailyLog;
    
    setDailyLogs(prev => {
      const existingIndex = prev.findIndex(log => getDateString(log.date) === dateStr);
      
      if (existingIndex >= 0) {
        // Update existing log
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...data,
          habits: {
            ...updated[existingIndex].habits,
            ...data.habits,
          },
        };
        resultLog = updated[existingIndex];
        saveDailyLogsToStore(updated, userId);
        return updated;
      } else {
        // Create new log
        const newLog: DailyLog = {
          id: uuidv4(),
          date,
          habits: {},
          ...data,
        };
        resultLog = newLog;
        const updated = [...prev, newLog];
        saveDailyLogsToStore(updated, userId);
        return updated;
      }
    });
    
    return resultLog!;
  }, [userId]);

  const getLogByDate = useCallback((date: Date): DailyLog | undefined => {
    const dateStr = getDateString(date);
    return dailyLogs.find(log => getDateString(log.date) === dateStr);
  }, [dailyLogs]);

  const getTodaysLog = useCallback((): DailyLog | undefined => {
    return getLogByDate(new Date());
  }, [getLogByDate]);

  const getRecentLogs = useCallback((days: number = 30): DailyLog[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return dailyLogs
      .filter(log => new Date(log.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyLogs]);

  const deleteLog = useCallback((logId: string) => {
    setDailyLogs(prev => {
      const updated = prev.filter(log => log.id !== logId);
      saveDailyLogsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const hasCheckedInToday = useCallback((): boolean => {
    const todayLog = getTodaysLog();
    return !!todayLog && (
      todayLog.energyLevel !== undefined ||
      todayLog.wins !== undefined ||
      todayLog.challenges !== undefined ||
      todayLog.learnings !== undefined ||
      todayLog.tomorrowFocus !== undefined
    );
  }, [getTodaysLog]);

  return (
    <DailyLogContext.Provider value={{
      dailyLogs,
      loading,
      createOrUpdateLog,
      getLogByDate,
      getTodaysLog,
      getRecentLogs,
      deleteLog,
      hasCheckedInToday,
    }}>
      {children}
    </DailyLogContext.Provider>
  );
}

export function useDailyLogContext() {
  const context = useContext(DailyLogContext);
  if (!context) {
    throw new Error('useDailyLogContext must be used within a DailyLogProvider');
  }
  return context;
}
