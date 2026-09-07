import { useState, useMemo, useCallback, useEffect, useRef, type DragEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Flame, Plus, BookOpen, Sparkles, X, Check, Loader2, Download, Trophy, TriangleAlert, Lightbulb, Crosshair } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useProjectContext } from '../context/ProjectContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { askAIJson, isAIConfigured } from '../lib/ai';
import type { Task } from '../types';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { getLocalDateString, getScheduledDate, normalizeDurationMinutes, normalizeLocalTime } from '../lib/dateUtils';
import { useUnifiedTaskActions } from '../hooks/useUnifiedTaskActions';
import { CalendarTimeGrid } from '../components/calendar/CalendarTimeGrid';
import { UnscheduledTaskSidebar } from '../components/calendar/UnscheduledTaskSidebar';
import { ScheduleTaskSheet } from '../components/calendar/ScheduleTaskSheet';
import { downloadIcs } from '../lib/ics';

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

const CATEGORY_DOT_COLOR: Record<string, string> = {
  Personal: 'bg-[var(--action)]',
  Professional: 'bg-[var(--info)]',
  Financial: 'bg-[var(--warning)]',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'month';
  if (window.matchMedia('(max-width: 767px)').matches) return 'day';
  return window.matchMedia('(pointer: coarse)').matches ? 'week' : 'month';
}

export function Calendar() {
  const [searchParams] = useSearchParams();
  const { tasks, createTask, skipOccurrence, rescheduleOccurrence, endRecurringFrom, deleteTask } = useTaskContext();
  const { getTasksBySubProject, subProjects, projects } = useProjectContext();
  const { goals } = useGoalContext();
  const { schedule, unschedule } = useUnifiedTaskActions();
  const { habits, getHabitLogs } = useHabitContext();
  const { dailyLogs, getRecentLogs } = useDailyLogContext();

  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  const upcomingBlocks = useMemo(() => {
    const todayString = getLocalDateString();
    return allTasks.filter(task =>
      task.status !== 'Completed'
      && Boolean(task.scheduledTime)
      && (getScheduledDate(task) ?? '') >= todayString
    );
  }, [allTasks]);
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
  const openedDeepLinkRef = useRef<string | null>(null);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId || openedDeepLinkRef.current === taskId) return;
    const linkedTask = allTasks.find(task => task.id === taskId);
    if (!linkedTask) return;
    openedDeepLinkRef.current = taskId;
    setScheduleDefaultDate(getScheduledDate(linkedTask) ?? getLocalDateString());
    setScheduleTask(linkedTask);
  }, [allTasks, searchParams]);

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
          className="ui-field-control w-full px-2 py-2 text-xs"
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
        <header className="flex items-start justify-between gap-4 border-b border-[var(--rule)] pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">Calendar desk</h1>
              <p className="text-sm tabular-nums text-[var(--ink-muted)]">
                {monthStats.planned} blocks · {monthStats.due} due · {monthStats.completed} completed
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={upcomingBlocks.length === 0}
            onClick={() => downloadIcs(upcomingBlocks, 'assisy-upcoming-blocks', 'Assisy upcoming blocks')}
            className="ui-control ui-button ui-button--secondary min-h-10 px-3 text-xs font-medium disabled:opacity-40"
            title="Export all upcoming timed blocks"
          >
            <Download className="mr-1 inline h-4 w-4" /> Export
          </button>
        </header>

        {/* Navigation + view toggle */}
        <section className="border-y border-[var(--rule)] bg-[var(--surface)] py-4" aria-label="Calendar controls and schedule">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2 sm:flex-nowrap">
            <button
              aria-label="Previous period"
              onClick={() => navigatePeriod(-1)}
              className="ui-control p-2 text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
              <span className="text-base font-semibold text-[var(--ink)] sm:text-lg">
                {periodLabel}
              </span>
              <button
                onClick={goToToday}
                className="ui-control min-h-11 border border-[var(--rule)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--action)] hover:bg-[var(--state-hover)]"
              >
                Today
              </button>
              {/* View mode toggle */}
              <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)]" role="group" aria-label="Calendar view">
                <button
                  onClick={() => setViewMode('day')}
                  className={`min-h-11 px-3 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'day'
                      ? 'bg-[var(--action-soft)] text-[var(--action)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`min-h-11 px-3 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-[var(--action-soft)] text-[var(--action)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`min-h-11 px-3 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-[var(--action-soft)] text-[var(--action)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  Week
                </button>
              </div>
              {isAIConfigured() && (
                <button
                  onClick={handleAISchedule}
                  disabled={aiLoading}
                  className="ui-control flex items-center gap-2 border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)] transition-colors hover:bg-[var(--state-hover)] disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Schedule
                </button>
              )}
            </div>

            <button
              aria-label="Next period"
              onClick={() => navigatePeriod(1)}
              className="ui-control p-2 text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]"
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
                    className="py-2 text-center text-xs font-medium text-[var(--ink-muted)]"
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
                        relative flex h-12 flex-col items-center border-r border-t border-[var(--rule)] py-2 transition-colors md:h-16 md:py-2
                        ${!isCurrentMonth ? 'bg-[var(--surface-subtle)] text-[var(--ink-disabled)]' : ''}
                        ${isCurrentMonth && !isToday && !isSelected ? 'text-[var(--ink)] hover:bg-[var(--state-hover)]' : ''}
                        ${isSelected && !isToday ? 'bg-[var(--action-soft)] text-[var(--action)]' : ''}
                        ${isDragTarget ? 'bg-[var(--action-soft)] ring-2 ring-inset ring-[var(--action)]' : ''}
                      `}
                    >
                      <span
                        className={`
                          flex h-7 w-7 shrink-0 items-center justify-center text-xs font-medium md:h-8 md:w-8 md:text-sm
                          ${isToday ? 'bg-[var(--action)] text-[var(--action-ink)]' : ''}
                          ${isSelected && !isToday ? 'border-b-2 border-[var(--action)]' : ''}
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
                              className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT_COLOR[cat]}`}
                            />
                          ))}
                          {hasFocused && !categoryDots.length && <span className="h-1.5 w-1.5 rounded-full bg-[var(--action)]" />}
                          {hasHabit && <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />}
                          {hasCheckIn && <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" />}
                          {hasDue && <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />}
                        </div>
                      )}

                      {/* Desktop: category dots + count */}
                      {isCurrentMonth && allTasksForDay.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 mt-1">
                          {[...new Set(allTasksForDay.map(t => t.category))].slice(0, 3).map(cat => (
                            <span key={cat} className={`h-2 w-2 rounded-full ${CATEGORY_DOT_COLOR[cat]}`} />
                          ))}
                          <span className={`text-xs font-medium ${
                            allTasksForDay.some(t => t.status === 'Completed')
                              ? 'text-[var(--success)]'
                              : 'text-[var(--ink-muted)]'
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
                <div className="border-y border-[var(--action)] bg-[var(--action-soft)] p-3">
                  <p className="mb-2 text-xs font-medium text-[var(--action)]">
                    New task · {inlineCreateDate}{inlineCreateTime ? ` at ${inlineCreateTime}` : ''}
                  </p>
                  <InlineCreateInput dateStr={inlineCreateDate} />
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── AI SUGGESTIONS PANEL ── */}
        {aiPanelOpen && (
          <section className="border-y border-[var(--warning)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--warning)]" />
                <h2 className="text-xl font-bold tracking-[-0.015em] text-[var(--ink)]">
                  AI Schedule Suggestions
                </h2>
              </div>
              <button
                aria-label="Close"
                onClick={() => setAiPanelOpen(false)}
                className="ui-control flex h-9 w-9 items-center justify-center text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--warning)]" />
                <span className="text-sm text-[var(--ink-secondary)]">Analyzing your energy patterns and tasks…</span>
              </div>
            ) : aiError ? (
              <div className="border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-center">
                <p className="text-sm text-[var(--danger)]">{aiError}</p>
                <button
                  type="button"
                  onClick={handleAISchedule}
                  className="ui-control mt-3 border border-[var(--danger)] px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--state-hover)]"
                >
                  Try again
                </button>
              </div>
            ) : aiSuggestions.filter(s => !s.dismissed).length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--ink-muted)]">
                {aiSuggestions.length > 0 ? 'All suggestions handled!' : 'No suggestions available. Make sure you have pending tasks and recent check-in data.'}
              </p>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.filter(s => !s.dismissed).map((suggestion) => (
                  <div
                    key={suggestion.taskTitle}
                    className="flex items-start gap-3 border-t border-[var(--rule)] bg-[var(--surface-subtle)] p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {suggestion.taskTitle}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--warning)]">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {suggestion.suggestedDay} · {suggestion.suggestedStartTime} · {suggestion.durationMinutes}m
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {suggestion.taskId && (
                        <button
                          onClick={() => acceptSuggestion(suggestion)}
                          className="ui-control flex h-9 w-9 items-center justify-center border border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)] transition-colors hover:bg-[var(--state-hover)]"
                          title="Accept suggestion"
                          aria-label="Accept suggestion"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissSuggestion(suggestion.taskTitle)}
                        className="ui-control flex h-9 w-9 items-center justify-center border border-[var(--rule)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
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
          </section>
        )}

        {/* Selected day detail panel */}
        <section className="border-t border-[var(--rule)] py-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-[-0.015em] text-[var(--ink)]">
              {selectedDateLabel}
            </h2>
            <button
              onClick={() => openInlineCreate(selectedDateStr)}
              className="ui-control flex h-10 w-10 items-center justify-center text-[var(--action)] transition-colors hover:bg-[var(--action-soft)]"
              title="Add calendar block"
              aria-label={`Add calendar block on ${selectedDateLabel}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {viewMode === 'month' && <InlineCreateInput dateStr={selectedDateStr} />}

          {!hasActivity && inlineCreateDate !== selectedDateStr ? (
            <div className="py-4 text-sm text-[var(--ink-muted)]">
              <p>No calendar blocks or activity.</p>
              <button type="button" onClick={() => openInlineCreate(selectedDateStr)} className="mt-2 font-medium text-[var(--action)] hover:underline">
                Add a calendar block
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Completed tasks */}
              {selectedCompleted.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed ({selectedCompleted.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedCompleted.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT_COLOR[t.category]}`} />
                        <span className="text-sm text-[var(--ink-secondary)]">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focused/planned tasks */}
              {selectedFocused.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Calendar blocks ({selectedFocused.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedFocused.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT_COLOR[t.category]}`} />
                        <span className="text-sm text-[var(--ink-secondary)]">{t.title}</span>
                        <span className="ml-auto text-xs text-[var(--ink-muted)]">{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created tasks (pending, not focused) */}
              {selectedCreated.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <Circle className="w-3.5 h-3.5" />
                    Created ({selectedCreated.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedCreated.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT_COLOR[t.category]}`} />
                        <span className="text-sm text-[var(--ink-secondary)]">{t.title}</span>
                        <span className="ml-auto text-xs text-[var(--ink-muted)]">{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Due tasks */}
              {selectedDue.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    Due ({selectedDue.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedDue.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <Circle className={`h-3 w-3 ${t.status === 'Completed' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`} />
                        <span className="text-sm text-[var(--ink-secondary)]">{t.title}</span>
                        <span className={`ml-auto text-xs ${t.status === 'Completed' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
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
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <Flame className="w-3.5 h-3.5" />
                    Habits ({selectedHabits.length})
                  </div>
                  <ul className="space-y-2">
                    {selectedHabits.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                        <span className="text-sm text-[var(--ink-secondary)]">{h.habitName}</span>
                        <span className="ml-auto text-xs text-[var(--ink-muted)]">×{h.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily Check-In */}
              {selectedCheckIn && (
                <div>
                  <div className="mb-2 flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    <BookOpen className="w-3.5 h-3.5" />
                    Check-In
                    {selectedCheckIn.energyLevel && (
                      <span className={`ml-auto border px-2 py-1 normal-case tracking-normal ${
                        selectedCheckIn.energyLevel <= 3 ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                        : selectedCheckIn.energyLevel <= 6 ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                      }`}>
                        Energy {selectedCheckIn.energyLevel}/10
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      { html: selectedCheckIn.wins, Icon: Trophy, color: 'text-[var(--success)]', label: 'Wins' },
                      { html: selectedCheckIn.challenges, Icon: TriangleAlert, color: 'text-[var(--danger)]', label: 'Challenges' },
                      { html: selectedCheckIn.learnings, Icon: Lightbulb, color: 'text-[var(--warning)]', label: 'Learnings' },
                      { html: selectedCheckIn.tomorrowFocus, Icon: Crosshair, color: 'text-[var(--action)]', label: 'Focus' },
                    ].filter(s => s.html).map((section) => {
                      const el = document.createElement('div');
                      el.innerHTML = section.html!;
                      const items = Array.from(el.querySelectorAll('li'));
                      const lines = items.length > 0
                        ? items.map(li => li.textContent?.trim()).filter(Boolean)
                        : (el.textContent || '').split('\n').map(s => s.trim()).filter(Boolean);
                      if (lines.length === 0) return null;
                      return (
                        <div key={section.label} className="border-b border-[var(--rule)] pb-2 last:border-0">
                          <p className={`mb-1 flex items-center gap-1 text-xs font-medium ${section.color}`}>
                            <section.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {section.label}
                          </p>
                          {lines.map((line, i) => (
                            <p key={i} className="pl-5 text-xs text-[var(--ink-secondary)]">
                              {line}
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
        </section>
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
        tasks={allTasks}
        onSkipOccurrence={skipOccurrence}
        onRescheduleOccurrence={rescheduleOccurrence}
        onEndSeries={endRecurringFrom}
        onDeleteSeries={deleteTask}
      />
    </div>
  );
}
