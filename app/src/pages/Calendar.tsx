import { useState, useMemo, useCallback, useRef, type DragEvent, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Flame, Plus, BookOpen, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useProjectContext } from '../context/ProjectContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { useTheme } from '../context/ThemeContext';
import { askAIJson, isAIConfigured } from '../lib/ai';
import type { Task } from '../types';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { getLocalDateString } from '../lib/dateUtils';

type ViewMode = 'month' | 'week';

interface AIScheduleSuggestion {
  taskTitle: string;
  suggestedDay: string;
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

const STATUS_ICON_COLOR: Record<string, { dark: string; light: string }> = {
  Completed: { dark: 'text-emerald-400', light: 'text-emerald-500' },
  Pending: { dark: 'text-gray-500', light: 'text-slate-400' },
  'Carried Forward': { dark: 'text-amber-400', light: 'text-amber-500' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar() {
  const { tasks, createTask, updateTask, addToToday, getTodaysTasks } = useTaskContext();
  const { getTasksBySubProject, subProjects, projects } = useProjectContext();
  const { habits, getHabitLogs } = useHabitContext();
  const { dailyLogs, getRecentLogs } = useDailyLogContext();

  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date();
  const todayStr = getLocalDateString(today);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [inlineCreateDate, setInlineCreateDate] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // ── AI Smart Scheduling state ──
  const [aiSuggestions, setAiSuggestions] = useState<AIScheduleSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleAISchedule = useCallback(async () => {
    setAiLoading(true);
    setAiPanelOpen(true);
    try {
      const pendingTasks = allTasks
        .filter(t => t.status === 'Pending' && !t.isRecurring)
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
      const weekDistribution = wkDays.map(d => {
        const key = getLocalDateString(d);
        const dayTasks = allTasks.filter(t => {
          if (t.focusedDate === key) return true;
          if (t.completedAt && getLocalDateString(new Date(t.completedAt)) === key) return true;
          if (getLocalDateString(new Date(t.createdAt)) === key) return true;
          return false;
        });
        return { day: DAY_NAMES[d.getDay()], taskCount: dayTasks.length };
      });

      const prompt = `You are a productivity scheduling assistant. Based on the user's energy patterns and pending tasks, suggest optimal task scheduling for this week. Energy by day of week: ${JSON.stringify(energyData)}. Current week distribution: ${JSON.stringify(weekDistribution)}. Pending tasks: ${JSON.stringify(pendingTasks.slice(0, 20))}. Respond with JSON: {"suggestions": [{"taskTitle": string, "suggestedDay": string (day name), "reason": string}]}`;

      const result = await askAIJson<{ suggestions: AIScheduleSuggestion[] }>(prompt, {
        temperature: 0.4,
      });

      const mapped = (result.suggestions ?? []).map(s => {
        const match = pendingTasks.find(
          t => t.title.toLowerCase() === s.taskTitle.toLowerCase()
            || t.title.toLowerCase().includes(s.taskTitle.toLowerCase())
            || s.taskTitle.toLowerCase().includes(t.title.toLowerCase()),
        );
        return { ...s, taskId: match?.id, dismissed: false };
      });

      setAiSuggestions(mapped);
    } catch (err) {
      console.error('AI scheduling failed:', err);
      setAiSuggestions([]);
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
    if (dateStr === todayStr) {
      addToToday(suggestion.taskId);
    } else {
      updateTask(suggestion.taskId, { focusedDate: dateStr, isFocusedToday: false });
    }

    setAiSuggestions(prev =>
      prev.map(s => s.taskTitle === suggestion.taskTitle ? { ...s, dismissed: true } : s),
    );
  }, [selectedDate, todayStr, addToToday, updateTask]);

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
      if (t.focusedDate) {
        const arr = map.get(t.focusedDate) ?? [];
        arr.push(t);
        map.set(t.focusedDate, arr);
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

  // ── Helpers: get all unique tasks for a day ──

  const getAllTasksForDate = useCallback((dateStr: string): Task[] => {
    const completed = tasksByCompletedDate.get(dateStr) ?? [];
    const focused = tasksByFocusedDate.get(dateStr) ?? [];
    const created = tasksByCreatedDate.get(dateStr) ?? [];
    return [...new Map([...completed, ...focused, ...created].map(t => [t.id, t])).values()];
  }, [tasksByCompletedDate, tasksByFocusedDate, tasksByCreatedDate]);

  // ── Selected day details ──

  const selectedDateStr = getLocalDateString(selectedDate);
  const selectedCompleted = tasksByCompletedDate.get(selectedDateStr) ?? [];
  const selectedDue = (tasksByDueDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed');
  const selectedFocused = (tasksByFocusedDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed');
  const selectedCreated = (tasksByCreatedDate.get(selectedDateStr) ?? []).filter(t => t.status !== 'Completed' && !t.focusedDate);
  const selectedHabits = habitLogsByDate.get(selectedDateStr) ?? [];
  const selectedCheckIn = checkInByDate.get(selectedDateStr);
  const hasActivity = selectedCompleted.length > 0 || selectedDue.length > 0 || selectedFocused.length > 0 || selectedCreated.length > 0 || selectedHabits.length > 0 || !!selectedCheckIn;

  // ── Today's schedule sidebar data ──

  const todaysTasks = useMemo(() => {
    const regularToday = getTodaysTasks();
    const todayKey = getLocalDateString(today);
    const projectToday = projectTasksToTasks(subProjects, projects, getTasksBySubProject)
      .filter(t => {
        if (t.focusedDate === todayKey) return true;
        if (t.status === 'Completed' && t.completedAt && getLocalDateString(new Date(t.completedAt)) === todayKey) return true;
        return false;
      });
    const seen = new Set(regularToday.map(t => t.id));
    const merged = [...regularToday, ...projectToday.filter(t => !seen.has(t.id))];
    return merged.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return 0;
    });
  }, [getTodaysTasks, today, subProjects, projects, getTasksBySubProject]);

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

    if (dateStr === todayStr) {
      addToToday(taskId);
    } else {
      updateTask(taskId, { focusedDate: dateStr, isFocusedToday: false });
    }
  };

  // ── Inline task creation ──

  const handleInlineCreate = (dateStr: string, title: string) => {
    if (!title.trim()) return;
    const newTask = createTask(title.trim(), '', 'Personal', 'High', 'Low', false);
    if (dateStr === todayStr) {
      addToToday(newTask.id);
    } else {
      updateTask(newTask.id, { focusedDate: dateStr, isFocusedToday: false });
    }
    setInlineCreateDate(null);
  };

  const handleInlineKeyDown = (e: KeyboardEvent<HTMLInputElement>, dateStr: string) => {
    if (e.key === 'Enter') {
      handleInlineCreate(dateStr, (e.target as HTMLInputElement).value);
    } else if (e.key === 'Escape') {
      setInlineCreateDate(null);
    }
  };

  const openInlineCreate = (dateStr: string) => {
    setInlineCreateDate(dateStr);
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  };

  // ── Inline creation input widget ──

  const InlineCreateInput = ({ dateStr }: { dateStr: string }) => {
    if (inlineCreateDate !== dateStr) return null;
    return (
      <div className="mt-1">
        <input
          ref={inlineInputRef}
          type="text"
          placeholder="Task title…"
          className={`w-full text-xs px-2 py-1 rounded-lg border outline-none ${
            isDark
              ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-600 focus:border-violet-500/50'
              : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-violet-400'
          }`}
          onKeyDown={(e) => handleInlineKeyDown(e, dateStr)}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              handleInlineCreate(dateStr, e.target.value);
            } else {
              setInlineCreateDate(null);
            }
          }}
        />
      </div>
    );
  };

  // ── Render: task card for week view ──

  const TaskCard = ({ task }: { task: Task }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
      isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
    } transition-colors`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? CATEGORY_DOT_COLOR[task.category]?.dark : CATEGORY_DOT_COLOR[task.category]?.light}`} />
      <span className={`truncate ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{task.title}</span>
      {task.status === 'Completed' ? (
        <CheckCircle2 className={`w-3 h-3 shrink-0 ml-auto ${isDark ? STATUS_ICON_COLOR.Completed.dark : STATUS_ICON_COLOR.Completed.light}`} />
      ) : (
        <Circle className={`w-3 h-3 shrink-0 ml-auto ${isDark ? STATUS_ICON_COLOR[task.status]?.dark : STATUS_ICON_COLOR[task.status]?.light}`} />
      )}
    </div>
  );

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <CalendarDays className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Calendar</h1>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {monthStats.completed} completed · {monthStats.planned} planned · {monthStats.habitsLogged} habits · {monthStats.due} due
            </p>
          </div>
        </div>

        {/* Navigation + view toggle */}
        <div className="card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              aria-label="Previous period"
              onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {viewMode === 'month' ? monthLabel : weekLabel}
              </span>
              <button
                onClick={goToToday}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                }`}
              >
                Today
              </button>
              {/* View mode toggle */}
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  onClick={() => setViewMode('month')}
                  className={`text-xs font-medium px-2.5 py-1 transition-colors ${
                    viewMode === 'month'
                      ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`text-xs font-medium px-2.5 py-1 transition-colors ${
                    viewMode === 'week'
                      ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Week
                </button>
              </div>
              {isAIConfigured() && (
                <button
                  onClick={handleAISchedule}
                  disabled={aiLoading}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50'
                  }`}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Schedule
                </button>
              )}
            </div>

            <button
              aria-label="Next period"
              onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
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
                    className={`text-center text-xs font-medium py-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}
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
                        relative flex flex-col items-center h-12 md:h-16 py-1.5 md:py-2 rounded-xl transition-colors
                        ${!isCurrentMonth ? (isDark ? 'text-gray-700' : 'text-slate-300') : ''}
                        ${isCurrentMonth && !isToday && !isSelected ? (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50') : ''}
                        ${isSelected && !isToday ? (isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700') : ''}
                        ${isDragTarget ? (isDark ? 'ring-2 ring-violet-400/60 bg-violet-500/10' : 'ring-2 ring-violet-400/60 bg-violet-50') : ''}
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
                        <div className="flex items-center gap-0.5 mt-0.5 h-2.5 md:hidden">
                          {categoryDots.map((cat) => (
                            <span
                              key={cat}
                              className={`w-1.5 h-1.5 rounded-full ${isDark ? CATEGORY_DOT_COLOR[cat]?.dark : CATEGORY_DOT_COLOR[cat]?.light}`}
                            />
                          ))}
                          {hasFocused && !categoryDots.length && <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-violet-400/60' : 'bg-violet-300'}`} />}
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
                          <span className={`text-[11px] font-medium ${
                            allTasksForDay.some(t => t.status === 'Completed')
                              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                              : isDark ? 'text-gray-500' : 'text-slate-400'
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
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dateStr = getLocalDateString(day);
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDate);
                const allTasksForDay = getAllTasksForDate(dateStr);
                const dueTasks = tasksByDueDate.get(dateStr) ?? [];
                const allUnique = [...new Map([...allTasksForDay, ...dueTasks].map(t => [t.id, t])).values()];

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`
                      rounded-xl p-2 min-h-[140px] cursor-pointer transition-colors border
                      ${isToday
                        ? isDark ? 'border-violet-500/40 bg-violet-500/5' : 'border-violet-300 bg-violet-50/50'
                        : isSelected
                          ? isDark ? 'border-violet-500/25 bg-white/[0.02]' : 'border-violet-200 bg-violet-50/30'
                          : isDark ? 'border-white/5 hover:border-white/10' : 'border-slate-100 hover:border-slate-200'
                      }
                      ${dragOverDate === dateStr ? (isDark ? 'ring-2 ring-violet-400/60' : 'ring-2 ring-violet-400/60') : ''}
                    `}
                  >
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-medium uppercase ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                          {WEEKDAYS[weekDays.indexOf(day)]}
                        </span>
                        <span
                          className={`
                            w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                            ${isToday ? 'bg-violet-500 text-white' : isDark ? 'text-gray-300' : 'text-slate-600'}
                          `}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openInlineCreate(dateStr); }}
                        className={`w-5 h-5 flex items-center justify-center rounded-md transition-colors ${
                          isDark ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <InlineCreateInput dateStr={dateStr} />

                    {/* Task cards */}
                    <div className="space-y-1">
                      {allUnique.map((task) => (
                        <div
                          key={task.id}
                          draggable="true"
                          onDragStart={(e: DragEvent<HTMLDivElement>) => {
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <TaskCard task={task} />
                        </div>
                      ))}
                      {allUnique.length === 0 && (
                        <p className={`text-[11px] ${isDark ? 'text-gray-700' : 'text-slate-300'}`}>No tasks</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI SUGGESTIONS PANEL ── */}
        {aiPanelOpen && (
          <div className={`card rounded-2xl p-5 border ${isDark ? 'border-amber-500/20' : 'border-amber-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  AI Schedule Suggestions
                </h2>
              </div>
              <button
                aria-label="Close"
                onClick={() => setAiPanelOpen(false)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Analyzing your energy patterns and tasks…</span>
              </div>
            ) : aiSuggestions.filter(s => !s.dismissed).length === 0 ? (
              <p className={`text-sm py-4 text-center ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                {aiSuggestions.length > 0 ? 'All suggestions handled!' : 'No suggestions available. Make sure you have pending tasks and recent check-in data.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {aiSuggestions.filter(s => !s.dismissed).map((suggestion) => (
                  <div
                    key={suggestion.taskTitle}
                    className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                        {suggestion.taskTitle}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                        → {suggestion.suggestedDay}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                        {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {suggestion.taskId && (
                        <button
                          onClick={() => acceptSuggestion(suggestion)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            isDark
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
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
                          isDark
                            ? 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
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
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {selectedDateLabel}
            </h2>
            <button
              onClick={() => openInlineCreate(selectedDateStr)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
              title="Add task"
              aria-label="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <InlineCreateInput dateStr={selectedDateStr} />

          {!hasActivity && inlineCreateDate !== selectedDateStr ? (
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>No activity</p>
          ) : (
            <div className="space-y-4">
              {/* Completed tasks */}
              {selectedCompleted.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed ({selectedCompleted.length})
                  </div>
                  <ul className="space-y-1.5">
                    {selectedCompleted.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focused/planned tasks */}
              {selectedFocused.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    Planned ({selectedFocused.length})
                  </div>
                  <ul className="space-y-1.5">
                    {selectedFocused.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t.title}</span>
                        <span className={`text-xs ml-auto ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created tasks (pending, not focused) */}
              {selectedCreated.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <Circle className="w-3.5 h-3.5" />
                    Created ({selectedCreated.length})
                  </div>
                  <ul className="space-y-1.5">
                    {selectedCreated.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t.title}</span>
                        <span className={`text-xs ml-auto ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Due tasks */}
              {selectedDue.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    Due ({selectedDue.length})
                  </div>
                  <ul className="space-y-1.5">
                    {selectedDue.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <Circle className={`w-3 h-3 ${t.status === 'Completed' ? (isDark ? 'text-emerald-400' : 'text-emerald-500') : (isDark ? 'text-red-400' : 'text-red-500')}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t.title}</span>
                        <span className={`text-xs ml-auto ${t.status === 'Completed' ? (isDark ? 'text-emerald-500' : 'text-emerald-600') : (isDark ? 'text-red-500' : 'text-red-600')}`}>
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
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <Flame className="w-3.5 h-3.5" />
                    Habits ({selectedHabits.length})
                  </div>
                  <ul className="space-y-1.5">
                    {selectedHabits.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{h.habitName}</span>
                        <span className={`text-xs ml-auto ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>×{h.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily Check-In */}
              {selectedCheckIn && (
                <div>
                  <div className={`flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    Check-In
                    {selectedCheckIn.energyLevel && (
                      <span className={`ml-auto normal-case tracking-normal px-1.5 py-0.5 rounded-full ${
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
                          <p className={`text-[11px] font-medium mb-0.5 ${section.color}`}>{section.label}</p>
                          {lines.map((line, i) => (
                            <p key={i} className={`text-xs pl-3 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
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

      {/* ── TODAY'S SCHEDULE SIDEBAR (desktop only) ── */}
      <div className={`hidden md:block w-72 shrink-0`}>
        <div className={`card rounded-2xl p-4 sticky top-6`}>
          <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Today&apos;s Schedule
          </h3>
          {todaysTasks.length === 0 ? (
            <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No tasks planned for today</p>
          ) : (
            <ul className="space-y-1.5">
              {todaysTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isDark ? CATEGORY_DOT_COLOR[t.category]?.dark : CATEGORY_DOT_COLOR[t.category]?.light}`} />
                  <span className={`text-xs truncate ${
                    t.status === 'Completed'
                      ? isDark ? 'text-gray-600 line-through' : 'text-slate-400 line-through'
                      : isDark ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    {t.title}
                  </span>
                  {t.status === 'Completed' && (
                    <CheckCircle2 className={`w-3 h-3 shrink-0 ml-auto ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className={`mt-3 pt-3 border-t text-xs ${isDark ? 'border-white/5 text-gray-500' : 'border-slate-100 text-slate-400'}`}>
            {todaysTasks.filter(t => t.status === 'Completed').length}/{todaysTasks.length} completed
          </div>
        </div>
      </div>
    </div>
  );
}
