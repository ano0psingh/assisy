import { useState, useMemo } from 'react';
import { Flame, Plus, BookOpen, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { HabitCard } from '../components/habits/HabitCard';
import { HabitForm } from '../components/habits/HabitForm';
import { DailyCheckIn } from '../components/habits/DailyCheckIn';
import { ContributionGraph } from '../components/habits/ContributionGraph';
import { BodyMetrics } from '../components/habits/BodyMetrics';
import type { TrackingType, Habit } from '../types';

interface HabitWithLogs extends Habit {
  logs: { date: string; value: number }[];
}

export function Habits() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    habits, 
    createHabit, 
    updateHabit,
    deleteHabit, 
    logHabit, 
    getTodaysLog,
  } = useHabitContext();
  const { 
    getTodaysLog: getTodaysDailyLog, 
    createOrUpdateLog,
    hasCheckedInToday,
    getRecentLogs,
  } = useDailyLogContext();

  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedHabitForGraph, setSelectedHabitForGraph] = useState<string | null>(null);

  const todaysDailyLog = getTodaysDailyLog();
  const checkedInToday = hasCheckedInToday();
  const recentLogs = getRecentLogs(7);
  const stats = useMemo(() => {
    const todayCompletedCount = habits.filter(h => getTodaysLog(h.id) > 0).length;
    
    return {
      todayCompletedCount,
      totalHabits: habits.length,
    };
  }, [habits, getTodaysLog]);

  // Combine all habit logs for the main graph
  const allHabitLogs = useMemo(() => {
    if (selectedHabitForGraph) {
      const habit = habits.find(h => h.id === selectedHabitForGraph);
      return habit?.logs || [];
    }
    
    // Combine all logs by date
    const logMap = new Map<string, number>();
    habits.forEach(habit => {
      habit.logs.forEach(log => {
        const existing = logMap.get(log.date) || 0;
        logMap.set(log.date, existing + (log.value > 0 ? 1 : 0));
      });
    });
    
    return Array.from(logMap.entries()).map(([date, value]) => ({ date, value }));
  }, [habits, selectedHabitForGraph]);

  const handleCreateHabit = (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
    dailyTarget?: number;
    reminderTime?: string;
  }) => {
    createHabit(data.name, data.trackingType, data.category, data.xpPerUnit, data.dailyTarget, data.reminderTime);
    setIsHabitFormOpen(false);
  };

  const handleUpdateHabit = (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
    dailyTarget?: number;
    reminderTime?: string;
  }) => {
    if (!editingHabit) return;
    updateHabit(editingHabit.id, {
      name: data.name,
      trackingType: data.trackingType,
      category: data.category,
      xpPerUnit: data.xpPerUnit,
      dailyTarget: data.dailyTarget,
      reminderTime: data.reminderTime,
    });
    setEditingHabit(null);
    setIsHabitFormOpen(false);
  };

  const handleEdit = (habit: HabitWithLogs) => {
    setEditingHabit(habit);
    setIsHabitFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingHabit(null);
    setIsHabitFormOpen(false);
  };

  const handleCheckIn = (data: Parameters<typeof createOrUpdateLog>[1]) => {
    createOrUpdateLog(new Date(), data);
    setIsCheckInOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Habits</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {stats.todayCompletedCount}/{stats.totalHabits} completed today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCheckInOpen(true)}
            className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all ${
              checkedInToday
                ? isDark 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'btn-secondary'
            }`}
          >
            <BookOpen size={18} />
            <span>
              {checkedInToday ? 'Update Check-In' : 'Daily Check-In'}
              {stats.totalHabits > 0 && (
                <span className="ml-1 opacity-90">({stats.todayCompletedCount}/{stats.totalHabits})</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setIsHabitFormOpen(true)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Today's Habits */}
      <div>
        <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Today's Habits
        </h2>
        
        {habits.length === 0 ? (
          <div className="card rounded-2xl p-6 sm:p-12 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <Flame className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              No habits yet
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Create your first habit to start building consistency!
            </p>
            <button
              onClick={() => setIsHabitFormOpen(true)}
              className="text-violet-500 hover:text-violet-400 font-medium"
            >
              + Create your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit, index) => (
              <div 
                key={habit.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <HabitCard
                  habit={habit}
                  todaysValue={getTodaysLog(habit.id)}
                  onLog={logHabit}
                  onDelete={deleteHabit}
                  onEdit={handleEdit}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contribution Graph */}
      {habits.length > 0 && (
        <div className="card rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between mb-4">
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Activity
            </h2>
            <select
              value={selectedHabitForGraph || ''}
              onChange={(e) => setSelectedHabitForGraph(e.target.value || null)}
              className="px-3 py-1.5 text-sm input rounded-lg"
            >
              <option value="">All Habits</option>
              {habits.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <ContributionGraph 
            logs={allHabitLogs} 
            weeks={12}
            maxValue={selectedHabitForGraph ? undefined : habits.length}
          />
        </div>
      )}

      {/* Body Metrics */}
      <BodyMetrics />

      {/* Recent Check-ins Summary */}
      {recentLogs.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Recent Check-ins
          </h2>
          <div className="space-y-3">
            {recentLogs.slice(0, 5).map((log) => {
              const htmlToLines = (html: string): string[] => {
                const el = document.createElement('div');
                el.innerHTML = html;
                const items = Array.from(el.querySelectorAll('li'));
                if (items.length > 0) return items.map(li => li.textContent?.trim() || '').filter(Boolean);
                return (el.textContent || '').split('\n').map(s => s.trim()).filter(Boolean);
              };
              return (
                <div 
                  key={log.id}
                  className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    {log.energyLevel && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        log.energyLevel <= 3 
                          ? 'bg-red-500/20 text-red-400'
                          : log.energyLevel <= 6
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        <Zap size={10} />{log.energyLevel}/10
                      </span>
                    )}
                  </div>
                  {log.wins && (
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                      {htmlToLines(log.wins).slice(0, 3).map((line, i) => (
                        <p key={i}><span className="text-emerald-500">•</span> {line}</p>
                      ))}
                    </div>
                  )}
                  {log.tomorrowFocus && (
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                      {htmlToLines(log.tomorrowFocus).slice(0, 1).map((line, i) => (
                        <p key={i}><span className="text-violet-500">→</span> {line}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <HabitForm
        isOpen={isHabitFormOpen}
        onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
        onCancel={handleCloseForm}
        editingHabit={editingHabit}
      />

      <DailyCheckIn
        isOpen={isCheckInOpen}
        existingLog={todaysDailyLog}
        onSubmit={handleCheckIn}
        onCancel={() => setIsCheckInOpen(false)}
      />
    </div>
  );
}
