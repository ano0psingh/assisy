import { useState, useMemo, useCallback } from 'react';
import { Flame, Plus, BookOpen, Zap, Sparkles, Loader2, AlertTriangle, ChevronDown, CheckCircle2, Layers, TrendingUp, Calendar, Trophy } from 'lucide-react';
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

export function Habits() {
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

  const todayProgress = totalHabits > 0
    ? Math.round((todayCompletedCount / totalHabits) * 100)
    : 0;

  return (
    <div ref={containerRef} className="space-y-5">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />

      <div className="border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">Habits</h2>
            <p className="mt-1 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
              {todayCompletedCount}/{totalHabits} FILED TODAY
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCheckInOpen(true)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                checkedInToday
                  ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                  : 'btn-secondary'
              }`}
            >
              <BookOpen size={14} />
              {checkedInToday ? 'Update Check-In' : 'Daily Check-In'}
            </button>
            <button
              onClick={() => setIsHabitFormOpen(true)}
              className="btn-primary flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium"
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
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden bg-[var(--surface-inset)]" role="progressbar" aria-label="Today's habit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={todayProgress}>
            <div className="h-full bg-[var(--warning)] transition-[width]" style={{ width: `${todayProgress}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">{todayProgress}%</span>
        </div>
      </div>

      {/* Habits grouped by goal */}
      {habits.length === 0 ? (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[var(--warning-soft)]">
            <Flame className="h-7 w-7 text-[var(--warning)]" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 text-[var(--ink)]`}>
            No habits yet
          </h3>
          <p className={`mb-4 text-[var(--ink-muted)]`}>
            Link habits to your goals and watch your trees grow!
          </p>
          <button
            onClick={() => setIsHabitFormOpen(true)}
            className="font-medium text-[var(--action)] hover:underline"
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
                  className="w-full flex items-center gap-3 px-1 py-1"
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    <GoalTreeThumbnail level={goal.level} theme={goal.theme} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className={`text-sm font-semibold block truncate text-[var(--ink-secondary)]`}>
                      {goal.title}
                    </span>
                    <span className={`text-xs text-[var(--ink-muted)]`}>
                      Lv.{goal.level} · {goalHabits.length} remaining
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 text-[var(--ink-muted)] ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 pl-1">
                    {booleanHabits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-1">
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
                className="w-full flex items-center gap-3 px-1 py-1"
              >
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 bg-[var(--surface-subtle)]`}>
                  <Layers size={14} className={'text-[var(--ink-muted)]'} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className={`text-sm font-semibold block text-[var(--ink-muted)]`}>
                    General Habits
                  </span>
                  <span className={`text-xs text-[var(--ink-muted)]`}>
                    Not linked to a goal · {unlinkedPending.length} remaining
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 text-[var(--ink-muted)] ${collapsedGroups.has('__unlinked') ? '-rotate-90' : ''}`}
                />
              </button>

              {!collapsedGroups.has('__unlinked') && (
                <div className="space-y-2 pl-1">
                  {unlinkedPending.filter(h => h.trackingType === 'boolean').length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
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
                className="w-full flex items-center gap-3 px-1 py-1"
              >
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 bg-[var(--success-soft)]`}>
                  <CheckCircle2 size={14} className={'text-[var(--success)]'} />
                </div>
                <span className={`text-sm font-semibold flex-1 text-left text-[var(--success)]`}>
                  Done
                </span>
                <span className={`text-xs tabular-nums text-[var(--success)]/60`}>
                  {completedHabits.length} completed
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 text-[var(--success)] ${!showCompleted ? '-rotate-90' : ''}`}
                />
              </button>

              {showCompleted && (
                <div className="space-y-2 pl-1 mt-2">
                  {completedHabits.filter(h => h.trackingType === 'boolean').length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
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
            <div className={`rounded-md p-6 text-center bg-[var(--success-soft)] border border-[var(--success)]`}>
              <div className="text-3xl mb-2">&#127881;</div>
              <p className={`font-semibold text-[var(--success)]`}>
                All habits done for today!
              </p>
              <p className={`text-sm mt-1 text-[var(--success)]/70`}>
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
          <div className="grid grid-cols-3 divide-x divide-[var(--rule)] border-y border-[var(--rule-strong)] bg-[var(--surface)]">
            <div className="bg-[var(--warning-soft)] p-4">
              <Trophy size={14} className={`mb-2 ${currentStreak > 0 ? 'text-[var(--warning)]' : 'text-[var(--warning)]'}`} />
              <div className={`text-xl font-black tabular-nums ${currentStreak > 0 ? 'text-[var(--warning)]' : 'text-[var(--ink-disabled)]'}`}>
                {currentStreak}<span className="text-xs font-semibold ml-1">d</span>
              </div>
              <div className={`text-xs mt-1 font-medium text-[var(--warning)]/50`}>Perfect streak</div>
            </div>
            <div className="p-4">
              <Calendar size={14} className="mb-2 text-[var(--action)]" />
              <div className={`text-xl font-black tabular-nums ${rate7 >= 80 ? 'text-[var(--success)]' : rate7 >= 50 ? 'text-[var(--action)]' : 'text-[var(--ink-muted)]'}`}>
                {rate7}<span className="text-xs font-semibold ml-1">%</span>
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--ink-muted)]">Last 7 days</div>
            </div>
            <div className="bg-[var(--success-soft)] p-4">
              <TrendingUp size={14} className={`mb-2 text-[var(--success)]`} />
              <div className={`text-xl font-black tabular-nums ${rate30 >= 80 ? 'text-[var(--success)]' : rate30 >= 50 ? ('text-[var(--success)]') : ('text-[var(--ink-muted)]')}`}>
                {rate30}<span className="text-xs font-semibold ml-1">%</span>
              </div>
              <div className={`text-xs mt-1 font-medium text-[var(--success)]/50`}>Last 30 days</div>
            </div>
          </div>
        );
      })()}

      {/* Activity heatmap */}
      {habits.length > 0 && (
        <div className="space-y-4 border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <h2 className={`font-semibold text-[var(--ink)]`}>
              Activity
            </h2>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-3 py-2 text-sm input rounded-sm"
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
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 text-[var(--ink-muted)]`}>
            30-day consistency
          </h3>
          <div className="space-y-3">
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
                <div key={h.id} className="flex items-center gap-3">
                  <span className={`text-xs w-28 truncate flex-shrink-0 text-[var(--ink-secondary)]`}>{h.name}</span>
                  <div className={`flex-1 h-2.5 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        // A habit with nothing logged has no track record to judge, so
                        // it reads as neutral. It was previously red, which told anyone
                        // who had just created a habit they were already failing it.
                        completedDays === 0
                          ? ('bg-[var(--rule-strong)]')
                          : pct >= 80 ? 'bg-[var(--success)]' : pct >= 50 ? 'bg-[var(--warning)]' : pct >= 20 ? 'bg-[var(--warning-soft)]0' : 'bg-[var(--warning-soft)]0/60'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold tabular-nums w-12 text-right flex-shrink-0 ${
                    pct >= 80 ? 'text-[var(--success)]' : pct >= 50 ? ('text-[var(--warning)]') : ('text-[var(--ink-muted)]')
                  }`}>{completedDays}/30</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Habit Insights */}
      {isAIConfigured() && habits.length > 0 && (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          {/* No bottom margin until there is something below it, so the card is a
              single row until insights are actually generated. */}
          <div className={`flex items-center justify-between ${aiInsights || insightsError || insightsLoading ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 text-[var(--ink)]`}>
              <Sparkles size={18} className="text-[var(--action)]" />
              AI Habit Insights
            </h2>
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className="flex items-center gap-2 rounded-md border border-[var(--action)] bg-[var(--action-soft)] px-4 py-2 text-sm font-medium text-[var(--action)] transition-colors hover:bg-[var(--selected)] disabled:opacity-50"
            >
              {insightsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {insightsLoading ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
          {insightsError && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-sm bg-[var(--danger-soft)] text-[var(--danger)]`}>
              <AlertTriangle size={14} />
              {insightsError}
            </div>
          )}
          {aiInsights && (
            <div
              className={`text-sm leading-relaxed space-y-1 text-[var(--ink-secondary)]`}
              dangerouslySetInnerHTML={{ __html: formatAIText(aiInsights) }}
            />
          )}
          {/* The removed line here told the reader to click the button sitting
              next to it, which the heading and the button label already convey. */}
        </div>
      )}

      {/* Mood Trend Sparkline */}
      {moodScores.length >= 2 && (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className={`font-semibold mb-4 text-[var(--ink)]`}>
            Mood Trend
          </h2>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(moodScores.length * 40, 200)} 80`} className="w-full h-20" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="var(--action)"
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
                    fill="var(--action)"
                  />
                  <title>{s.date}: {s.score}/10</title>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs text-[var(--ink-muted)]`}>{moodScores[0]?.date}</span>
            <span className={`text-xs text-[var(--ink-muted)]`}>{moodScores[moodScores.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Body Metrics */}
      <BodyMetrics />

      {/* Recent Check-ins Summary */}
      {recentLogs.length > 0 && (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className={`font-semibold mb-4 text-[var(--ink)]`}>
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
                  className={`p-3 rounded-md bg-[var(--surface)]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium text-[var(--ink)]`}>
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    {log.energyLevel && (
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        log.energyLevel <= 3 
                          ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                          : log.energyLevel <= 6
                          ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                          : 'bg-[var(--success-soft)] text-[var(--success)]'
                      }`}>
                        <Zap size={10} />{log.energyLevel}/10
                      </span>
                    )}
                  </div>
                  {log.wins && (
                    <div className={`text-xs text-[var(--ink-secondary)]`}>
                      {htmlToLines(log.wins).slice(0, 3).map((line, i) => (
                        <p key={i}><span className="text-[var(--success)]">•</span> {line}</p>
                      ))}
                    </div>
                  )}
                  {log.tomorrowFocus && (
                    <div className={`text-xs mt-1 text-[var(--ink-muted)]`}>
                      {htmlToLines(log.tomorrowFocus).slice(0, 1).map((line, i) => (
                        <p key={i}><span className="text-[var(--action)]">→</span> {line}</p>
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
