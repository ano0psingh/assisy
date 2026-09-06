import { useState, useMemo, useCallback, useRef, type DragEvent, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Flame, Plus, BookOpen, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useProjectContext } from '../context/ProjectContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { useTheme } from '../context/ThemeContext';
import { askAIJson, isAIConfigured } from '../lib/ai';
import type { Task } from '../types';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { getLocalDateString, getScheduledDate, normalizeDurationMinutes, normalizeLocalTime } from '../lib/dateUtils';
import { useUnifiedTaskActions } from '../hooks/useUnifiedTaskActions';
import { CalendarTimeGrid } from '../components/calendar/CalendarTimeGrid';
import { UnscheduledTaskSidebar } from '../components/calendar/UnscheduledTaskSidebar';
import { ScheduleTaskSheet } from '../components/calendar/ScheduleTaskSheet';

type ViewMode = 'month' | 'week' | 'day';

interface AIScheduleSuggestion {
  taskTitle: string;
  suggestedDay: string;
  suggestedStartTime: string;
  durationMinutes: number;
  reason: string;
  taskId?: string;
  dismissed?: boolean;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDays(anchorDate: Date): Date[] {
  const d = new Date(anchorDate);
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

const CATEGORY_DOT_COLOR: Record<string, { dark: string; light: string }> = {
  Personal: { dark: 'bg-violet-400', light: 'bg-violet-500' },
  Professional: { dark: 'bg-blue-400', light: 'bg-blue-500' },
  Financial: { dark: 'bg-amber-400', light: 'bg-amber-500' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'month';
  if (!window.matchMedia('(pointer: coarse)').matches) return 'month';
  return window.matchMedia('(max-width: 767px)').matches ? 'day' : 'week';
}

export function Calendar() {
  const { tasks, createTask } = useTaskContext();
  const { getTasksBySubProject, subProjects, projects } = useProjectContext();
  const { goals } = useGoalContext();
  const { schedule, unschedule } = useUnifiedTaskActions();
  const { habits, getHabitLogs } = useHabitContext();
  const { dailyLogs, getRecentLogs } = useDailyLogContext();

  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [inlineCreateDate, setInlineCreateDate] = useState<string | null>(null);
  const [inlineCreateTime, setInlineCreateTime] = useState<string | undefined>();
  const [scheduleTask, setScheduleTask] = useState<Task | null>(null);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState(getLocalDateString(today));
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // ── AI Smart Scheduling state ──
  const [aiSuggestions, setAiSuggestions] = useState<AIScheduleSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAISchedule = useCallback(async () => {
    setAiLoading(true);
    setAiPanelOpen(true);
    setAiError(null);
    try {
      const pendingTasks = allTasks
        .filter(t =>
          t.status === 'Pending'
          && !t.isRecurring
          && t.inbox !== true
          && !getScheduledDate(t)
        )
        .map(t => ({
          id: t.id,
          title: t.title,
          effort: t.effort,
          priority: t.priority,
          category: t.category,
          dueDate: t.dueDate ? getLocalDateString(new Date(t.dueDate)) : null,
        }));

      const recentLogs = getRecentLogs(30);
      const energyByDay: Record<string, { total: number; count: number }> = {};
      for (const log of recentLogs) {
        if (log.energyLevel != null) {
          const d = new Date(log.date);
          const dayName = DAY_NAMES[d.getDay()];
          if (!energyByDay[dayName]) energyByDay[dayName] = { total: 0, count: 0 };
          energyByDay[dayName].total += log.energyLevel;
          energyByDay[dayName].count += 1;
        }
      }
      const energyData: Record<string, number> = {};
      for (const [day, { total, count }] of Object.entries(energyByDay)) {
        energyData[day] = Math.round((total / count) * 10) / 10;
      }

      const wkDays = getWeekDays(selectedDate);
      const scheduledBlocks = allTasks
        .filter(t => {
          const date = getScheduledDate(t);
          return date && wkDays.some(day => getLocalDateString(day) === date);
        })
        .map(t => ({
          title: t.title,
          date: getScheduledDate(t),
          startTime: t.scheduledTime ?? null,
          durationMinutes: t.durationMinutes ?? null,
        }));
      const weekDistribution = wkDays.map(d => {
        const key = getLocalDateString(d);
        const dayTasks = allTasks.filter(t => {
          if (getScheduledDate(t) === key) return true;
          if (t.completedAt && getLocalDateString(new Date(t.completedAt)) === key) return true;
          if (getLocalDateString(new Date(t.createdAt)) === key) return true;
          return false;
        });
        return { day: DAY_NAMES[d.getDay()], taskCount: dayTasks.length };
      });

      const prompt = `You are a productivity scheduling assistant. Based on the user's energy patterns and pending tasks, suggest collision-free task blocks for this week. Energy by day of week: ${JSON.stringify(energyData)}. Current week distribution: ${JSON.stringify(weekDistribution)}. Existing scheduled blocks (do not overlap timed blocks): ${JSON.stringify(scheduledBlocks)}. Pending tasks: ${JSON.stringify(pendingTasks.slice(0, 20))}. Respond with JSON only: {"suggestions": [{"taskTitle": string, "suggestedDay": string (full day name), "suggestedStartTime": string (24-hour HH:MM), "durationMinutes": number (5-1440), "reason": string}]}`;

      const result = await askAIJson<{ suggestions: AIScheduleSuggestion[] }>(prompt, {
        temperature: 0.4,
      });

      const mapped = (result.suggestions ?? []).map(s => {
        const taskTitle = typeof s.taskTitle === 'string' ? s.taskTitle.trim() : '';
        if (!taskTitle) return null;
        const match = pendingTasks.find(
          t => t.title.toLowerCase() === taskTitle.toLowerCase()
            || t.title.toLowerCase().includes(taskTitle.toLowerCase())
            || taskTitle.toLowerCase().includes(t.title.toLowerCase()),
        );
        const suggestedDay = DAY_NAMES.find(
          day => day.toLowerCase() === String(s.suggestedDay ?? '').trim().toLowerCase(),
        ) ?? DAY_NAMES[wkDays[0].getDay()];
        return {
          taskTitle,
          suggestedDay,
          suggestedStartTime: normalizeLocalTime(
            typeof s.suggestedStartTime === 'string' ? s.suggestedStartTime : undefined,
          ) ?? '09:00',
          durationMinutes: normalizeDurationMinutes(Number(s.durationMinutes), 30),
          reason: typeof s.reason === 'string' ? s.reason : '',
          taskId: match?.id,
          dismissed: false,
        };
      }).filter((suggestion): suggestion is NonNullable<typeof suggestion> => suggestion !== null);

      setAiSuggestions(mapped);
    } catch (err) {
      console.error('AI scheduling failed:', err);
      setAiSuggestions([]);
      setAiError('Could not generate a schedule. Check your connection or AI settings, then try again.');
    } finally {
      setAiLoading(false);
    }
  }, [allTasks, getRecentLogs, selectedDate]);

  const acceptSuggestion = useCallback((suggestion: AIScheduleSuggestion) => {
    if (!suggestion.taskId) return;
    const dayIndex = DAY_NAMES.indexOf(suggestion.suggestedDay);
    if (dayIndex === -1) return;

    const wkDays = getWeekDays(selectedDate);
    const targetDay = wkDays.find(d => d.getDay() === dayIndex);
    if (!targetDay) return;

    const dateStr = getLocalDateString(targetDay);
    schedule(suggestion.taskId, {
      date: dateStr,
      time: normalizeLocalTime(suggestion.suggestedStartTime) ?? '09:00',
      durationMinutes: normalizeDurationMinutes(suggestion.durationMinutes, 30),
    });

    setAiSuggestions(prev =>
      prev.map(s => s.taskTitle === suggestion.taskTitle ? { ...s, dismissed: true } : s),
    );
  }, [selectedDate, schedule]);

  const dismissSuggestion = useCallback((taskTitle: string) => {
    setAiSuggestions(prev =>
      prev.map(s => s.taskTitle === taskTitle ? { ...s, dismissed: true } : s),
    );
  }, []);

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // ── Month view grid data ──

  const daysInMonth = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentYear, currentMonth]);

  const prevMonthDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(currentYear, currentMonth, -i));
    }
    return days;
  }, [currentYear, currentMonth, firstDayOfWeek]);

  const totalCells = prevMonthDays.length + daysInMonth.length;
  const nextMonthDays = useMemo(() => {
    const remaining = (7 - (totalCells % 7)) % 7;
    const extra = totalCells + remaining < 42 ? 42 - totalCells : remaining;
    const days: Date[] = [];
    for (let i = 1; i <= extra; i++) {
      days.push(new Date(currentYear, currentMonth + 1, i));
    }
    return days;
  }, [currentYear, currentMonth, totalCells]);

  const allDays = useMemo(
    () => [...prevMonthDays, ...daysInMonth, ...nextMonthDays],
    [prevMonthDays, daysInMonth, nextMonthDays],
  );

  // ── Week view data ──

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const fmt = (d: Date) => d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }, [weekDays]);
  const visibleScheduleDays = viewMode === 'day' ? [selectedDate] : weekDays;
  const periodLabel = viewMode === 'month'
    ? monthLabel
    : viewMode === 'day'
      ? selectedDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })
      : weekLabel;

  // ── Pre-index tasks by date ──

  const tasksByCompletedDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.status === 'Completed' && t.completedAt) {
        const key = getLocalDateString(new Date(t.completedAt));
        const arr = map.get(key) ?? [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [allTasks]);

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.dueDate) {
        const key = getLocalDateString(new Date(t.dueDate));
        const arr = map.get(key) ?? [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [allTasks]);

  const tasksByFocusedDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of allTasks) {
      const scheduledDate = getScheduledDate(t);
      if (scheduledDate) {
        const arr = map.get(scheduledDate) ?? [];
        arr.push(t);
        map.set(scheduledDate, arr);
      }
    }
    return map;
  }, [allTasks]);

  const tasksByCreatedDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.createdAt) {
        const key = getLocalDateString(new Date(t.createdAt));
        const arr = map.get(key) ?? [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [allTasks]);

  const habitLogsByDate = useMemo(() => {
    const map = new Map<string, { habitName: string; value: number }[]>();
    for (const habit of habits) {
      const logs = getHabitLogs(habit.id, 365);
      for (const log of logs) {
        if (log.value > 0) {
          const arr = map.get(log.date) ?? [];
          arr.push({ habitName: habit.name, value: log.value });
          map.set(log.date, arr);
        }
      }
    }
    return map;
  }, [habits, getHabitLogs]);

  // ── Check-in logs by date ──

  const checkInByDate = useMemo(() => {
    const map = new Map<string, (typeof dailyLogs)[number]>();
    for (const log of dailyLogs) {
      const d = log.date instanceof Date ? log.date : new Date(log.date);
      const key = getLocalDateString(d);
      map.set(key, log);
    }
    return map;
  }, [dailyLogs]);

  // ── Monthly summary stats ──

  const monthStats = useMemo(() => {
    let completed = 0;
    let habitsLogged = 0;
    let due = 0;
    let planned = 0;

    for (const day of daysInMonth) {
      const key = getLocalDateString(day);
      completed += tasksByCompletedDate.get(key)?.length ?? 0;
      habitsLogged += habitLogsByDate.get(key)?.length ?? 0;
      due += tasksByDueDate.get(key)?.length ?? 0;
      planned += tasksByFocusedDate.get(key)?.length ?? 0;
    }

    return { completed, habitsLogged, due, planned };
  }, [daysInMonth, tasksByCompletedDate, tasksByDueDate, tasksByFocusedDate, habitLogsByDate]);

  // ── Selected day details ──

  const selectedDateStr = getLocalDateString(selectedDate);
  const selectedCompleted = tasksByCompletedDate.get(selectedDateStr) ?? [];
  const selectedDue = (tasksByDueDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed');
  const selectedFocused = (tasksByFocusedDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed');
  const selectedCreated = (tasksByCreatedDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed' && !getScheduledDate(t));
  const selectedHabits = habitLogsByDate.get(selectedDateStr) ?? [];
  const selectedCheckIn = checkInByDate.get(selectedDateStr);
  const hasActivity = selectedCompleted.length > 0 || selectedDue.length > 0 || selectedFocused.length > 0 || selectedCreated.length > 0 || selectedHabits.length > 0 || !!selectedCheckIn;

  // ── Navigation ──

  const navigateMonth = (dir: -1 | 1) => {
    const d = new Date(currentYear, currentMonth + dir, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  const navigateWeek = (dir: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir * 7);
    setSelectedDate(next);
    setCurrentYear(next.getFullYear());
    setCurrentMonth(next.getMonth());
  };

  const navigateDay = (dir: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir);
    setSelectedDate(next);
    setCurrentYear(next.getFullYear());
    setCurrentMonth(next.getMonth());
  };

  const navigatePeriod = (dir: -1 | 1) => {
    if (viewMode === 'month') navigateMonth(dir);
    else if (viewMode === 'week') navigateWeek(dir);
    else navigateDay(dir);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(now);
  };

  const selectedDateLabel = selectedDate.toLocaleDateString('default', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Drag & Drop handlers ──

  const handleDragOver = (e: DragEvent<HTMLButtonElement | HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement | HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    schedule(taskId, { date: dateStr });
  };

  // ── Inline task creation ──

  const handleInlineCreate = (dateStr: string, title: string) => {
    if (!title.trim()) return;
    const newTask = createTask(
      title.trim(),
      '',
      'Personal',
      'High',
      'Low',
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { inbox: false },
    );
    schedule(newTask.id, {
      date: dateStr,
      time: inlineCreateTime,
      durationMinutes: inlineCreateTime ? 30 : undefined,
    });
    setInlineCreateDate(null);
    setInlineCreateTime(undefined);
  };

  const handleInlineKeyDown = (e: KeyboardEvent<HTMLInputElement>, dateStr: string) => {
    if (e.key === 'Enter') {
      handleInlineCreate(dateStr, (e.target as HTMLInputElement).value);
    } else if (e.key === 'Escape') {
      setInlineCreateDate(null);
      setInlineCreateTime(undefined);
    }
  };

  const openInlineCreate = (dateStr: string, time?: string) => {
    setInlineCreateDate(dateStr);
    setInlineCreateTime(time);
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  };

  const openScheduleTask = (task: Task, defaultDate = selectedDateStr) => {
    setScheduleTask(task);
    setScheduleDefaultDate(defaultDate);
  };

  // ── Inline creation input widget ──

  const InlineCreateInput = ({ dateStr }: { dateStr: string }) => {
    if (inlineCreateDate !== dateStr) return null;
    return (
      <div className="mt-1">
        <input
          ref={inlineInputRef}
          type="text"
          placeholder={inlineCreateTime ? `Task at ${inlineCreateTime}…` : 'Task title…'}
          className={`w-full text-xs px-2 py-1 rounded-lg border outline-none ${
            'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-violet-400 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:placeholder-gray-600 dark:focus:border-violet-500/50'
          }`}
          onKeyDown={(e) => handleInlineKeyDown(e, dateStr)}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              handleInlineCreate(dateStr, e.target.value);
            } else {
              setInlineCreateDate(null);
              setInlineCreateTime(undefined);
            }
          }}
        />
      </div>
    );
  };

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  return (
    <div
      className="flex gap-6"
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-500/20`}>
            <CalendarDays className={`w-5 h-5 text-violet-500 dark:text-violet-400`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold text-slate-800 dark:text-white`}>Calendar</h1>
            <p className={`text-sm text-slate-500 dark:text-gray-500`}>
              {monthStats.completed} completed · {monthStats.planned} planned · {monthStats.habitsLogged} habits · {monthStats.due} due
            </p>
          </div>
        </div>

        {/* Navigation + view toggle */}
        <div className="card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              aria-label="Previous period"
              onClick={() => navigatePeriod(-1)}
              className={`p-2 rounded-xl transition-colors hover:bg-slate-100 text-slate-500 dark:hover:bg-white/10 dark:text-gray-400`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className={`text-lg font-semibold text-slate-800 dark:text-white`}>
                {periodLabel}
              </span>
              <button
                onClick={goToToday}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
                }`}
              >
                Today
              </button>
              {/* View mode toggle */}
              <div className={`flex rounded-lg overflow-hidden border border-slate-200 dark:border-white/10`}>
                <button
                  onClick={() => setViewMode('day')}
                  className={`text-xs font-medium px-3 py-1 transition-colors ${
                    viewMode === 'day'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`text-xs font-medium px-3 py-1 transition-colors ${
                    viewMode === 'month'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`text-xs font-medium px-3 py-1 transition-colors ${
                    viewMode === 'week'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  Week
                </button>
              </div>
              {isAIConfigured() && (
                <button
                  onClick={handleAISchedule}
                  disabled={aiLoading}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                    'bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                  }`}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Schedule
                </button>
              )}
            </div>

            <button
              aria-label="Next period"
              onClick={() => navigatePeriod(1)}
              className={`p-2 rounded-xl transition-colors hover:bg-slate-100 text-slate-500 dark:hover:bg-white/10 dark:text-gray-400`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* ── MONTH VIEW ── */}
          {viewMode === 'month' && (
            <>
              {/* Weekday header */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className={`text-center text-xs font-medium py-2 text-slate-400 dark:text-gray-500`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {allDays.map((day, idx) => {
                  const dateStr = getLocalDateString(day);
                  const isCurrentMonth = day.getMonth() === currentMonth;
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDate);
                  const isDragTarget = dragOverDate === dateStr;

                  const completed = tasksByCompletedDate.get(dateStr) ?? [];
                  const dueTasks = tasksByDueDate.get(dateStr) ?? [];
                  const focused = tasksByFocusedDate.get(dateStr) ?? [];
                  const created = tasksByCreatedDate.get(dateStr) ?? [];
                  const habitEntries = habitLogsByDate.get(dateStr) ?? [];

                  const allTasksForDay = [...new Map([...completed, ...focused, ...created].map(t => [t.id, t])).values()];
                  const categoryDots = [...new Set(allTasksForDay.map((t) => t.category))].slice(0, 3);
                  const hasDue = dueTasks.length > 0;
                  const hasFocused = focused.length > 0;
                  const hasHabit = habitEntries.length > 0;
                  const hasCheckIn = checkInByDate.has(dateStr);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={`
                        relative flex flex-col items-center h-12 md:h-16 py-2 md:py-2 rounded-xl transition-colors
                        ${!isCurrentMonth ? ('text-slate-300 dark:text-gray-500') : ''}
                        ${isCurrentMonth && !isToday && !isSelected ? ('text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5') : ''}
                        ${isSelected && !isToday ? ('bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300') : ''}
                        ${isDragTarget ? ('ring-2 ring-violet-400/60 bg-violet-50 dark:bg-violet-500/10') : ''}
                      `}
                    >
                      <span
                        className={`
                          w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-xs md:text-sm font-medium shrink-0
                          ${isToday ? 'bg-violet-500 text-white' : ''}
                          ${isSelected && !isToday ? 'ring-2 ring-violet-400/50' : ''}
                        `}
                      >
                        {day.getDate()}
                      </span>

                      {/* Mobile: dot indicators */}
                      {isCurrentMonth && (
                        <div className="flex items-center gap-1 mt-1 h-2.5 md:hidden">
                          {categoryDots.map((cat) => (
                            <span
                              key={cat}
                              className={`w-1.5 h-1.5 rounded-full ${isDark ? CATEGORY_DOT_COLOR[cat]?.dark : CATEGORY_DOT_COLOR[cat]?.light}`}
                            />
                          ))}
                          {hasFocused && !categoryDots.length && <span className={`w-1.5 h-1.5 rounded-full bg-violet-300 dark:bg-violet-400/60`} />}
                          {hasHabit && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {hasCheckIn && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                          {hasDue && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                        </div>
                      )}

                      {/* Desktop: category dots + count */}
                      {isCurrentMonth && allTasksForDay.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 mt-1">
                          {[...new Set(allTasksForDay.map(t => t.category))].slice(0, 3).map(cat => (
                            <span key={cat} className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[cat]?.dark : CATEGORY_DOT_COLOR[cat]?.light}`} />
                          ))}
                          <span className={`text-xs font-medium ${
                            allTasksForDay.some(t => t.status === 'Completed')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-gray-500'
                          }`}>
                            {allTasksForDay.filter(t => t.status === 'Completed').length}/{allTasksForDay.length}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── WEEK VIEW ── */}
          {viewMode !== 'month' && (
            <div className="space-y-4">
              <div className="lg:hidden">
                <UnscheduledTaskSidebar
                  tasks={allTasks}
                  goals={goals}
                  projects={projects}
                  onOpenTask={(task) => openScheduleTask(task)}
                />
              </div>
              <CalendarTimeGrid
                days={visibleScheduleDays}
                tasks={allTasks}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onOpenTask={openScheduleTask}
                onSchedule={schedule}
                onInlineCreate={openInlineCreate}
              />
              {inlineCreateDate && visibleScheduleDays.some((day) => getLocalDateString(day) === inlineCreateDate) && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/20 dark:bg-violet-500/10">
                  <p className="mb-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                    New task · {inlineCreateDate}{inlineCreateTime ? ` at ${inlineCreateTime}` : ''}
                  </p>
                  <InlineCreateInput dateStr={inlineCreateDate} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── AI SUGGESTIONS PANEL ── */}
        {aiPanelOpen && (
          <div className={`card rounded-2xl p-6 border border-amber-200 dark:border-amber-500/20`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 text-amber-500 dark:text-amber-400`} />
                <h2 className={`text-base font-semibold text-slate-800 dark:text-white`}>
                  AI Schedule Suggestions
                </h2>
              </div>
              <button
                aria-label="Close"
                onClick={() => setAiPanelOpen(false)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  'hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:hover:bg-white/10 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className={`w-5 h-5 animate-spin text-amber-500 dark:text-amber-400`} />
                <span className={`text-sm text-slate-500 dark:text-gray-400`}>Analyzing your energy patterns and tasks…</span>
              </div>
            ) : aiError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
                <p className="text-sm text-red-700 dark:text-red-300">{aiError}</p>
                <button
                  type="button"
                  onClick={handleAISchedule}
                  className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-200"
                >
                  Try again
                </button>
              </div>
            ) : aiSuggestions.filter(s => !s.dismissed).length === 0 ? (
              <p className={`text-sm py-4 text-center text-slate-400 dark:text-gray-500`}>
                {aiSuggestions.length > 0 ? 'All suggestions handled!' : 'No suggestions available. Make sure you have pending tasks and recent check-in data.'}
              </p>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.filter(s => !s.dismissed).map((suggestion) => (
                  <div
                    key={suggestion.taskTitle}
                    className={`flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-slate-700 dark:text-gray-200`}>
                        {suggestion.taskTitle}
                      </p>
                      <p className={`text-xs mt-1 text-amber-600 dark:text-amber-400/80`}>
                        → {suggestion.suggestedDay} · {suggestion.suggestedStartTime} · {suggestion.durationMinutes}m
                      </p>
                      <p className={`text-xs mt-1 text-slate-400 dark:text-gray-500`}>
                        {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {suggestion.taskId && (
                        <button
                          onClick={() => acceptSuggestion(suggestion)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                          }`}
                          title="Accept suggestion"
                          aria-label="Accept suggestion"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissSuggestion(suggestion.taskTitle)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                          'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:bg-white/5 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300'
                        }`}
                        title="Dismiss suggestion"
                        aria-label="Dismiss suggestion"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected day detail panel */}
        <div className="card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold text-slate-800 dark:text-white`}>
              {selectedDateLabel}
            </h2>
            <button
              onClick={() => openInlineCreate(selectedDateStr)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                'hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:hover:bg-white/10 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              title="Add task"
              aria-label="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {viewMode === 'month' && <InlineCreateInput dateStr={selectedDateStr} />}

          {!hasActivity && inlineCreateDate !== selectedDateStr ? (
            <p className={`text-sm text-slate-400 dark:text-gray-500`}>No activity</p>
          ) : (
            <div className="space-y-4">
              {/* Completed tasks */}
              {selectedCompleted.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed ({selectedCompleted.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedCompleted.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm text-slate-600 dark:text-gray-300`}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focused/planned tasks */}
              {selectedFocused.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    Planned ({selectedFocused.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedFocused.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm text-slate-600 dark:text-gray-300`}>{t.title}</span>
                        <span className={`text-xs ml-auto text-slate-400 dark:text-gray-400`}>{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created tasks (pending, not focused) */}
              {selectedCreated.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <Circle className="w-3.5 h-3.5" />
                    Created ({selectedCreated.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedCreated.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm text-slate-600 dark:text-gray-300`}>{t.title}</span>
                        <span className={`text-xs ml-auto text-slate-400 dark:text-gray-400`}>{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Due tasks */}
              {selectedDue.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <Clock className="w-3.5 h-3.5" />
                    Due ({selectedDue.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedDue.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <Circle className={`w-3 h-3 ${t.status === 'Completed' ? ('text-emerald-500 dark:text-emerald-400') : ('text-red-500 dark:text-red-400')}`} />
                        <span className={`text-sm text-slate-600 dark:text-gray-300`}>{t.title}</span>
                        <span className={`text-xs ml-auto ${t.status === 'Completed' ? ('text-emerald-600 dark:text-emerald-500') : ('text-red-600 dark:text-red-500')}`}>
                          {t.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Habits */}
              {selectedHabits.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <Flame className="w-3.5 h-3.5" />
                    Habits ({selectedHabits.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedHabits.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400`} />
                        <span className={`text-sm text-slate-600 dark:text-gray-300`}>{h.habitName}</span>
                        <span className={`text-xs ml-auto text-slate-400 dark:text-gray-500`}>×{h.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily Check-In */}
              {selectedCheckIn && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-gray-500`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    Check-In
                    {selectedCheckIn.energyLevel && (
                      <span className={`ml-auto normal-case tracking-normal px-2 py-1 rounded-full ${
                        selectedCheckIn.energyLevel <= 3 ? 'bg-red-500/20 text-red-400'
                        : selectedCheckIn.energyLevel <= 6 ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        Energy {selectedCheckIn.energyLevel}/10
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      { html: selectedCheckIn.wins, icon: '✓', color: 'text-emerald-500', label: 'Wins' },
                      { html: selectedCheckIn.challenges, icon: '!', color: 'text-red-400', label: 'Challenges' },
                      { html: selectedCheckIn.learnings, icon: '💡', color: 'text-amber-400', label: 'Learnings' },
                      { html: selectedCheckIn.tomorrowFocus, icon: '→', color: 'text-violet-400', label: 'Focus' },
                    ].filter(s => s.html).map((section) => {
                      const el = document.createElement('div');
                      el.innerHTML = section.html!;
                      const items = Array.from(el.querySelectorAll('li'));
                      const lines = items.length > 0
                        ? items.map(li => li.textContent?.trim()).filter(Boolean)
                        : (el.textContent || '').split('\n').map(s => s.trim()).filter(Boolean);
                      if (lines.length === 0) return null;
                      return (
                        <div key={section.label}>
                          <p className={`text-xs font-medium mb-1 ${section.color}`}>{section.label}</p>
                          {lines.map((line, i) => (
                            <p key={i} className={`text-xs pl-3 text-slate-600 dark:text-gray-300`}>
                              <span className={section.color}>•</span> {line}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── UNSCHEDULED TASK SIDEBAR (desktop only) ── */}
      <div className="hidden w-80 shrink-0 lg:block">
        <div className="sticky top-6">
          <UnscheduledTaskSidebar
            tasks={allTasks}
            goals={goals}
            projects={projects}
            onOpenTask={(task) => openScheduleTask(task)}
          />
        </div>
      </div>

      <ScheduleTaskSheet
        key={scheduleTask?.id ?? 'closed'}
        task={scheduleTask}
        defaultDate={scheduleDefaultDate}
        onClose={() => setScheduleTask(null)}
        onSchedule={schedule}
        onUnschedule={unschedule}
      />
    </div>
  );
}
