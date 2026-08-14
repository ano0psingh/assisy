import { useState, useMemo, useCallback } from 'react';
import { Flame, Plus, BookOpen, Zap, Sparkles, Loader2, AlertTriangle, ChevronDown, CheckCircle2, Layers, TrendingUp, Calendar, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useHabitContext } from '../context/HabitContext';
import { useGoalContext } from '../context/GoalContext';
import { useGamification } from '../context/GamificationContext';
import { useDataVersion } from '../context/DataVersionContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { useDailyLogContext } from '../context/DailyLogContext';
import { HabitCard } from '../components/habits/HabitCard';
import { HabitForm } from '../components/habits/HabitForm';
import { DailyCheckIn } from '../components/habits/DailyCheckIn';
import { ContributionGraph } from '../components/habits/ContributionGraph';
import { BodyMetrics } from '../components/habits/BodyMetrics';
import { GoalTreeThumbnail } from '../components/goals/GoalTree';
import { useUndo } from '../components/common/UndoToast';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { BulkEditMenu, type BulkEditField } from '../components/common/BulkEditMenu';
import { SelectButton } from '../components/common/SelectionControls';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import { usePersistentSet, usePersistentState } from '../hooks/usePersistentState';
import { pluralise } from '../lib/bulkUpdate';
import { askAI, isAIConfigured } from '../lib/ai';
import { formatAIText } from '../lib/formatAIText';
import type { TrackingType, Habit, Goal } from '../types';

const HABIT_BULK_FIELDS: BulkEditField[] = [
  {
    key: 'category',
    label: 'Category',
    kind: 'choice',
    options: [
      { label: 'Health', value: 'Health' },
      { label: 'Mindfulness', value: 'Mindfulness' },
      { label: 'Learning', value: 'Learning' },
      { label: 'Productivity', value: 'Productivity' },
      { label: 'Financial', value: 'Financial' },
    ],
  },
  { key: 'reminderTime', label: 'Reminder', kind: 'time' },
];

interface HabitWithLogs extends Habit {
  logs: { date: string; value: number }[];
}

function ProgressRing({ completed, total, size = 76, strokeWidth = 6 }: { completed: number; total: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - pct);
  const isDark = document.documentElement.classList.contains('dark');
  const gradId = 'ring-grad';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={pct >= 1 ? '#10b981' : '#8b5cf6'} />
            <stop offset="100%" stopColor={pct >= 1 ? '#34d399' : '#c084fc'} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={pct > 0 ? { filter: `drop-shadow(0 0 6px ${pct >= 1 ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'})` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black leading-none tabular-nums ${pct >= 1 ? 'text-emerald-500' : isDark ? 'text-white' : 'text-slate-800'}`}>
          {completed}
        </span>
        <span className={`text-xs leading-tight font-medium ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
          /{total}
        </span>
      </div>
    </div>
  );
}

export function Habits() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    habits, 
    createHabit, 
    updateHabit,
    updateHabits,
    revertHabits,
    deleteHabit, 
    deleteHabits,
    restoreHabits,
    logHabit, 
    getTodaysLog,
  } = useHabitContext();
  const { getGoalById, addXPToGoal } = useGoalContext();
  const { recordHabitCompletion } = useGamification();
  const { pushUndo } = useUndo();
  const { 
    getTodaysLog: getTodaysDailyLog, 
    createOrUpdateLog,
    hasCheckedInToday,
    getRecentLogs,
  } = useDailyLogContext();

  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [activityFilter, setActivityFilter] = usePersistentState<string>('assisy_habits_activity', '');
  const [collapsedGroups, setCollapsedGroups] = usePersistentSet('assisy_habits_collapsed');
  const [showCompleted, setShowCompleted] = usePersistentState('assisy_habits_show_completed', false);

  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const { refresh } = useDataVersion();
  const onRefresh = useCallback(async () => { refresh(); }, [refresh]);
  const { pullDistance, isRefreshing: pullRefreshing, containerRef } = usePullToRefresh({ onRefresh });

  const todaysDailyLog = getTodaysDailyLog();
  const checkedInToday = hasCheckedInToday();
  const recentLogs = getRecentLogs(7);
  const recentLogs30 = getRecentLogs(30);

  // Arriving from global search: drop the activity filter and reveal completed
  // habits so the target is on screen.
  const handleSearchFocus = useCallback(() => {
    setActivityFilter('');
    setShowCompleted(true);
    setCollapsedGroups(new Set());
  }, [setActivityFilter, setShowCompleted, setCollapsedGroups]);
  useFocusHighlight(handleSearchFocus);

  const isHabitCompleted = useCallback((h: HabitWithLogs) => {
    const val = getTodaysLog(h.id);
    return h.dailyTarget ? val >= h.dailyTarget : val > 0;
  }, [getTodaysLog]);

  const visibleHabitIds = useMemo(() => habits.map(h => h.id), [habits]);
  const selection = useBulkSelection(visibleHabitIds);

  const selectionProps = (habitId: string) => ({
    selectionMode: selection.active,
    isSelected: selection.isSelected(habitId),
    onSelectToggle: selection.toggle,
  });

  const handleBulkDelete = () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    const removed = deleteHabits(ids);
    selection.clear();
    pushUndo(
      `${pluralise(removed.length, 'habit')} deleted`,
      () => restoreHabits(removed),
    );
  };

  const handleBulkEdit = (key: string, value: string | number | null) => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;

    // Clearing the reminder time has to remove the field, not store an empty
    // string, or the reminder scheduler would try to parse "".
    const updates: Partial<Habit> =
      key === 'reminderTime'
        ? { reminderTime: value === null ? undefined : String(value) }
        : ({ [key]: value } as Partial<Habit>);

    const patches = updateHabits(ids, updates);
    if (patches.length === 0) return;
    // Selection stays so several fields can be applied in a row.
    pushUndo(
      `${pluralise(patches.length, 'habit')} updated`,
      () => revertHabits(patches),
    );
  };

  const { todayCompletedCount, totalHabits, pendingByGoal, unlinkedPending, completedHabits } = useMemo(() => {
    const completed: HabitWithLogs[] = [];
    const pending: HabitWithLogs[] = [];

    for (const h of habits) {
      if (isHabitCompleted(h)) completed.push(h);
      else pending.push(h);
    }

    const byGoal = new Map<string, { goal: Goal; habits: HabitWithLogs[] }>();
    const unlinked: HabitWithLogs[] = [];

    for (const h of pending) {
      if (h.goalId) {
        const goal = getGoalById(h.goalId);
        if (goal) {
          if (!byGoal.has(h.goalId)) byGoal.set(h.goalId, { goal, habits: [] });
          byGoal.get(h.goalId)!.habits.push(h);
        } else {
          unlinked.push(h);
        }
      } else {
        unlinked.push(h);
      }
    }

    const sorted = [...byGoal.values()].sort((a, b) => a.goal.title.localeCompare(b.goal.title));

    return {
      todayCompletedCount: completed.length,
      totalHabits: habits.length,
      pendingByGoal: sorted,
      unlinkedPending: unlinked,
      completedHabits: completed,
    };
  }, [habits, isHabitCompleted, getGoalById]);

  const filteredHabitsForGraph = useMemo(() => {
    if (!activityFilter) return habits;
    if (activityFilter.startsWith('goal:')) {
      const goalId = activityFilter.slice(5);
      return habits.filter(h => h.goalId === goalId);
    }
    return habits.filter(h => h.id === activityFilter);
  }, [habits, activityFilter]);

  const allHabitLogs = useMemo(() => {
    const source = filteredHabitsForGraph;
    if (source.length === 1) return source[0].logs;
    const logMap = new Map<string, number>();
    source.forEach(habit => {
      habit.logs.forEach(log => {
        const existing = logMap.get(log.date) || 0;
        logMap.set(log.date, existing + (log.value > 0 ? 1 : 0));
      });
    });
    return Array.from(logMap.entries()).map(([date, value]) => ({ date, value }));
  }, [filteredHabitsForGraph]);

  const goalGroupsForFilter = useMemo(() => {
    const groups = new Map<string, { title: string; count: number }>();
    for (const h of habits) {
      if (h.goalId) {
        const goal = getGoalById(h.goalId);
        if (goal && !groups.has(h.goalId)) {
          groups.set(h.goalId, { title: goal.title, count: 0 });
        }
        if (groups.has(h.goalId)) {
          groups.get(h.goalId)!.count++;
        }
      }
    }
    return [...groups.entries()];
  }, [habits, getGoalById]);

  const moodScores = useMemo(() => {
    return recentLogs30
      .filter(log => typeof log.sentimentScore === 'number')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(log => ({ date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), score: log.sentimentScore! }));
  }, [recentLogs30]);

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const habitData = habits.map(h => {
        const last30 = h.logs
          .filter(l => {
            const logDate = new Date(l.date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return logDate >= cutoff;
          });
        const completedDays = last30.filter(l => l.value > 0).length;
        return `${h.name} (${h.trackingType}): ${completedDays}/30 days completed`;
      }).join('; ');

      const prompt = `You are a habit coach. Analyze these habit tracking patterns and provide 3-4 specific insights about consistency, suggestions for improvement, and habit stacking opportunities. Habits: ${habitData}`;
      const result = await askAI(prompt);
      setAiInsights(result);
    } catch {
      setInsightsError('Failed to generate insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleCreateHabit = (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
    dailyTarget?: number;
    reminderTime?: string;
    goalId?: string;
  }) => {
    createHabit(data.name, data.trackingType, data.category, data.xpPerUnit, data.dailyTarget, data.reminderTime, data.goalId);
    setIsHabitFormOpen(false);
  };

  const handleUpdateHabit = (data: {
    name: string;
    trackingType: TrackingType;
    category: string;
    xpPerUnit: number;
    dailyTarget?: number;
    reminderTime?: string;
    goalId?: string;
  }) => {
    if (!editingHabit) return;
    updateHabit(editingHabit.id, {
      name: data.name,
      trackingType: data.trackingType,
      category: data.category,
      xpPerUnit: data.xpPerUnit,
      dailyTarget: data.dailyTarget,
      reminderTime: data.reminderTime,
      goalId: data.goalId,
    });
    setEditingHabit(null);
    setIsHabitFormOpen(false);
  };

  const handleLogWithXP = useCallback((habitId: string, value: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const oldValue = getTodaysLog(habitId);
    logHabit(habitId, value);

    if (value > oldValue) {
      const xpDelta = (value - oldValue) * habit.xpPerUnit;
      if (xpDelta > 0) {
        if (habit.goalId) addXPToGoal(habit.goalId, xpDelta);
        recordHabitCompletion(habit.category, xpDelta);
      }
    }
  }, [habits, getTodaysLog, logHabit, addXPToGoal, recordHabitCompletion]);

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

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div ref={containerRef} className="space-y-5">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />

      {/* Hero header with progress ring */}
      <div className={`rounded-2xl p-5 relative overflow-hidden ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/[0.08] via-transparent to-emerald-500/[0.05] border border-white/[0.08]'
          : 'bg-gradient-to-br from-violet-50/80 via-white to-emerald-50/50 border border-violet-100/60'
      }`} style={{ boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-5">
          <ProgressRing completed={todayCompletedCount} total={totalHabits} />
          <div className="flex-1 min-w-0">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {todayCompletedCount === totalHabits && totalHabits > 0
                ? 'All done today!'
                : todayCompletedCount === 0
                  ? "Let's get started"
                  : 'Keep it up!'}
            </h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {todayCompletedCount}/{totalHabits} habits completed
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setIsCheckInOpen(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  checkedInToday
                    ? isDark
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'btn-secondary'
                }`}
              >
                <BookOpen size={14} />
                {checkedInToday ? 'Update Check-In' : 'Daily Check-In'}
              </button>
              <button
                onClick={() => setIsHabitFormOpen(true)}
                className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Plus size={14} />
                New Habit
              </button>
              {habits.length > 0 && (
                <SelectButton
                  active={selection.active}
                  onClick={() => selection.active ? selection.clear() : selection.start()}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Habits grouped by goal */}
      {habits.length === 0 ? (
        <div className="card rounded-2xl p-6 sm:p-12 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <Flame className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            No habits yet
          </h3>
          <p className={`mb-4 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            Link habits to your goals and watch your trees grow!
          </p>
          <button
            onClick={() => setIsHabitFormOpen(true)}
            className="text-violet-500 hover:text-violet-400 font-medium"
          >
            + Create your first habit
          </button>
        </div>
      ) : (
        <>
          {/* Goal-grouped sections */}
          {pendingByGoal.map(({ goal, habits: goalHabits }) => {
            const isCollapsed = collapsedGroups.has(goal.id);
            const booleanHabits = goalHabits.filter(h => h.trackingType === 'boolean');
            const trackedHabits = goalHabits.filter(h => h.trackingType !== 'boolean');

            return (
              <div key={goal.id} className="space-y-2">
                <button
                  onClick={() => toggleGroup(goal.id)}
                  className="w-full flex items-center gap-2.5 px-1 py-1"
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    <GoalTreeThumbnail level={goal.level} theme={goal.theme} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className={`text-sm font-semibold block truncate ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                      {goal.title}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                      Lv.{goal.level} · {goalHabits.length} remaining
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isDark ? 'text-gray-600' : 'text-slate-400'} ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="space-y-1.5 pl-1">
                    {booleanHabits.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {booleanHabits.map(habit => (
                          <HabitCard
                            key={habit.id}
                            habit={habit}
                            todaysValue={getTodaysLog(habit.id)}
                            onLog={handleLogWithXP} {...selectionProps(habit.id)}
                            onDelete={deleteHabit}
                            onEdit={handleEdit}
                            compact
                          />
                        ))}
                      </div>
                    )}
                    {trackedHabits.map(habit => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        todaysValue={getTodaysLog(habit.id)}
                        onLog={handleLogWithXP} {...selectionProps(habit.id)}
                        onDelete={deleteHabit}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unlinked habits (no goal) */}
          {unlinkedPending.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => toggleGroup('__unlinked')}
                className="w-full flex items-center gap-2.5 px-1 py-1"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                  <Layers size={14} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className={`text-sm font-semibold block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    General Habits
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                    Not linked to a goal · {unlinkedPending.length} remaining
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isDark ? 'text-gray-600' : 'text-slate-400'} ${collapsedGroups.has('__unlinked') ? '-rotate-90' : ''}`}
                />
              </button>

              {!collapsedGroups.has('__unlinked') && (
                <div className="space-y-1.5 pl-1">
                  {unlinkedPending.filter(h => h.trackingType === 'boolean').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {unlinkedPending.filter(h => h.trackingType === 'boolean').map(habit => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          todaysValue={getTodaysLog(habit.id)}
                          onLog={handleLogWithXP} {...selectionProps(habit.id)}
                          onDelete={deleteHabit}
                          onEdit={handleEdit}
                          compact
                        />
                      ))}
                    </div>
                  )}
                  {unlinkedPending.filter(h => h.trackingType !== 'boolean').map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      todaysValue={getTodaysLog(habit.id)}
                      onLog={handleLogWithXP} {...selectionProps(habit.id)}
                      onDelete={deleteHabit}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed section */}
          {completedHabits.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center gap-2.5 px-1 py-1"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                  <CheckCircle2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                </div>
                <span className={`text-sm font-semibold flex-1 text-left ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Done
                </span>
                <span className={`text-xs tabular-nums ${isDark ? 'text-emerald-500/60' : 'text-emerald-600/60'}`}>
                  {completedHabits.length} completed
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isDark ? 'text-emerald-500/40' : 'text-emerald-400'} ${!showCompleted ? '-rotate-90' : ''}`}
                />
              </button>

              {showCompleted && (
                <div className="space-y-1.5 pl-1 mt-2">
                  {completedHabits.filter(h => h.trackingType === 'boolean').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {completedHabits.filter(h => h.trackingType === 'boolean').map(habit => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          todaysValue={getTodaysLog(habit.id)}
                          onLog={handleLogWithXP} {...selectionProps(habit.id)}
                          onDelete={deleteHabit}
                          onEdit={handleEdit}
                          compact
                        />
                      ))}
                    </div>
                  )}
                  {completedHabits.filter(h => h.trackingType !== 'boolean').map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      todaysValue={getTodaysLog(habit.id)}
                      onLog={handleLogWithXP} {...selectionProps(habit.id)}
                      onDelete={deleteHabit}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All-done celebration */}
          {pendingByGoal.length === 0 && unlinkedPending.length === 0 && completedHabits.length > 0 && (
            <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="text-3xl mb-2">&#127881;</div>
              <p className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                All habits done for today!
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-emerald-500/60' : 'text-emerald-600/70'}`}>
                Great job staying consistent.
              </p>
            </div>
          )}
        </>
      )}

      {/* Stats cards */}
      {habits.length > 0 && (() => {
        const today = new Date();
        const getDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const makeDates = (n: number) => Array.from({length: n}, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - i); return getDateStr(d); });
        const last7 = makeDates(7);
        const last30 = makeDates(30);

        const completionsByDate = (dates: string[]) => {
          let total = 0, done = 0;
          for (const date of dates) {
            for (const h of habits) {
              const val = h.logs.find(l => l.date === date)?.value ?? 0;
              total++;
              if (h.dailyTarget ? val >= h.dailyTarget : val > 0) done++;
            }
          }
          return total > 0 ? Math.round((done / total) * 100) : 0;
        };
        const rate7 = completionsByDate(last7);
        const rate30 = completionsByDate(last30);

        let currentStreak = 0;
        for (let i = 0; i < 365; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = getDateStr(d);
          if (habits.every(h => { const v = h.logs.find(l => l.date === ds)?.value ?? 0; return h.dailyTarget ? v >= h.dailyTarget : v > 0; })) currentStreak++;
          else break;
        }

        return (
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-2xl p-4 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60'}`}>
              <Trophy size={14} className={`mb-2 ${currentStreak > 0 ? 'text-amber-500' : isDark ? 'text-amber-500/30' : 'text-amber-300'}`} />
              <div className={`text-xl font-black tabular-nums ${currentStreak > 0 ? 'text-amber-500' : isDark ? 'text-gray-600' : 'text-slate-300'}`}>
                {currentStreak}<span className="text-xs font-semibold ml-0.5">d</span>
              </div>
              <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-amber-500/50' : 'text-amber-600/50'}`}>Perfect streak</div>
            </div>
            <div className={`rounded-2xl p-4 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-violet-500/10 to-blue-500/5 border border-violet-500/20' : 'bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200/60'}`}>
              <Calendar size={14} className={`mb-2 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              <div className={`text-xl font-black tabular-nums ${rate7 >= 80 ? 'text-emerald-500' : rate7 >= 50 ? (isDark ? 'text-violet-400' : 'text-violet-600') : (isDark ? 'text-gray-500' : 'text-slate-400')}`}>
                {rate7}<span className="text-xs font-semibold ml-0.5">%</span>
              </div>
              <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-violet-400/50' : 'text-violet-600/50'}`}>Last 7 days</div>
            </div>
            <div className={`rounded-2xl p-4 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60'}`}>
              <TrendingUp size={14} className={`mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className={`text-xl font-black tabular-nums ${rate30 >= 80 ? 'text-emerald-500' : rate30 >= 50 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-500' : 'text-slate-400')}`}>
                {rate30}<span className="text-xs font-semibold ml-0.5">%</span>
              </div>
              <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-emerald-400/50' : 'text-emerald-600/50'}`}>Last 30 days</div>
            </div>
          </div>
        );
      })()}

      {/* Activity heatmap */}
      {habits.length > 0 && (
        <div className="card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Activity
            </h2>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm input rounded-lg"
            >
              <option value="">All Habits</option>
              {goalGroupsForFilter.length > 0 && (
                <optgroup label="By Goal">
                  {goalGroupsForFilter.map(([goalId, { title, count }]) => (
                    <option key={goalId} value={`goal:${goalId}`}>{title} ({count})</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Individual Habits">
                {habits.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <ContributionGraph 
            logs={allHabitLogs} 
            weeks={12}
            maxValue={filteredHabitsForGraph.length === 1 ? undefined : filteredHabitsForGraph.length}
          />
        </div>
      )}

      {/* Per-habit 30-day completion bars */}
      {habits.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            30-day consistency
          </h3>
          <div className="space-y-2.5">
            {[...habits]
              .map(h => {
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
                const last30 = h.logs.filter(l => new Date(l.date) >= cutoff);
                const threshold = h.dailyTarget || 1;
                const completedDays = last30.filter(l => l.value >= threshold).length;
                return { h, pct: Math.round((completedDays / 30) * 100), completedDays };
              })
              .sort((a, b) => b.pct - a.pct)
              .map(({ h, pct, completedDays }) => (
                <div key={h.id} className="flex items-center gap-2.5">
                  <span className={`text-xs w-28 truncate flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{h.name}</span>
                  <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : pct >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : pct >= 20 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-red-500/60 to-red-400/40'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold tabular-nums w-12 text-right flex-shrink-0 ${
                    pct >= 80 ? 'text-emerald-500' : pct >= 50 ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-gray-500' : 'text-slate-400')
                  }`}>{completedDays}/30</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Habit Insights */}
      {isAIConfigured() && habits.length > 0 && (
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <Sparkles size={18} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
              AI Habit Insights
            </h2>
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                isDark
                  ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 disabled:opacity-50'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 disabled:opacity-50'
              }`}
            >
              {insightsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {insightsLoading ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
          {insightsError && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <AlertTriangle size={14} />
              {insightsError}
            </div>
          )}
          {aiInsights && (
            <div
              className={`text-sm leading-relaxed space-y-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}
              dangerouslySetInnerHTML={{ __html: formatAIText(aiInsights) }}
            />
          )}
          {!aiInsights && !insightsLoading && !insightsError && (
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Click "Generate Insights" to get AI-powered analysis of your habit patterns.
            </p>
          )}
        </div>
      )}

      {/* Mood Trend Sparkline */}
      {moodScores.length >= 2 && (
        <div className="card rounded-2xl p-5">
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Mood Trend
          </h2>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(moodScores.length * 40, 200)} 80`} className="w-full h-20" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke={isDark ? '#a78bfa' : '#7c3aed'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={moodScores.map((s, i) => `${i * 40 + 20},${80 - (s.score / 10) * 70}`).join(' ')}
              />
              {moodScores.map((s, i) => (
                <g key={i}>
                  <circle
                    cx={i * 40 + 20}
                    cy={80 - (s.score / 10) * 70}
                    r="3"
                    fill={isDark ? '#a78bfa' : '#7c3aed'}
                  />
                  <title>{s.date}: {s.score}/10</title>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{moodScores[0]?.date}</span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{moodScores[moodScores.length - 1]?.date}</span>
          </div>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
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

      <BulkActionBar
        count={selection.count}
        itemLabel="habit"
        allSelected={selection.allSelected}
        onSelectAll={selection.selectAll}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
      >
        <BulkEditMenu fields={HABIT_BULK_FIELDS} onApply={handleBulkEdit} />
      </BulkActionBar>
    </div>
  );
}
