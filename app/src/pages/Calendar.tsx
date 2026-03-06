import { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Flame } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useHabitContext } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import type { Task } from '../types';

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const CATEGORY_DOT_COLOR: Record<string, { dark: string; light: string }> = {
  Personal: { dark: 'bg-violet-400', light: 'bg-violet-500' },
  Professional: { dark: 'bg-blue-400', light: 'bg-blue-500' },
  Financial: { dark: 'bg-amber-400', light: 'bg-amber-500' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar() {
  const { tasks } = useTaskContext();
  const { habits, getHabitLogs } = useHabitContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday-based
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

  // Pre-index tasks by date for efficient lookup
  const tasksByCompletedDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.status === 'Completed' && t.completedAt) {
        const key = getDateString(new Date(t.completedAt));
        const arr = map.get(key) ?? [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [tasks]);

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.dueDate) {
        const key = getDateString(new Date(t.dueDate));
        const arr = map.get(key) ?? [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [tasks]);

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

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let completed = 0;
    let habitsLogged = 0;
    let due = 0;

    for (const day of daysInMonth) {
      const key = getDateString(day);
      completed += tasksByCompletedDate.get(key)?.length ?? 0;
      habitsLogged += habitLogsByDate.get(key)?.length ?? 0;
      due += tasksByDueDate.get(key)?.length ?? 0;
    }

    return { completed, habitsLogged, due };
  }, [daysInMonth, tasksByCompletedDate, tasksByDueDate, habitLogsByDate]);

  // Selected day details
  const selectedDateStr = getDateString(selectedDate);
  const selectedCompleted = tasksByCompletedDate.get(selectedDateStr) ?? [];
  const selectedDue = tasksByDueDate.get(selectedDateStr) ?? [];
  const selectedHabits = habitLogsByDate.get(selectedDateStr) ?? [];
  const hasActivity = selectedCompleted.length > 0 || selectedDue.length > 0 || selectedHabits.length > 0;

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentYear, currentMonth + dir, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
          <CalendarDays className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Calendar</h1>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {monthStats.completed} tasks completed · {monthStats.habitsLogged} habits logged · {monthStats.due} due
          </p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{monthLabel}</span>
            <button
              onClick={goToToday}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}
            >
              Today
            </button>
          </div>
          <button
            onClick={() => navigate(1)}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

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
            const dateStr = getDateString(day);
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);

            const completed = tasksByCompletedDate.get(dateStr) ?? [];
            const dueTasks = tasksByDueDate.get(dateStr) ?? [];
            const habitEntries = habitLogsByDate.get(dateStr) ?? [];

            const categoryDots = [...new Set(completed.map((t) => t.category))].slice(0, 3);
            const hasDue = dueTasks.length > 0;
            const hasHabit = habitEntries.length > 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative flex flex-col items-center py-1.5 md:py-2 rounded-xl transition-colors
                  ${!isCurrentMonth ? (isDark ? 'text-gray-700' : 'text-slate-300') : ''}
                  ${isCurrentMonth && !isToday && !isSelected ? (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50') : ''}
                  ${isSelected && !isToday ? (isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700') : ''}
                `}
              >
                <span
                  className={`
                    w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-xs md:text-sm font-medium
                    ${isToday ? 'bg-violet-500 text-white' : ''}
                    ${isSelected && !isToday ? 'ring-2 ring-violet-400/50' : ''}
                  `}
                >
                  {day.getDate()}
                </span>

                {/* Indicators */}
                {isCurrentMonth && (
                  <div className="flex items-center gap-0.5 mt-0.5 h-2.5">
                    {categoryDots.map((cat) => (
                      <span
                        key={cat}
                        className={`w-1.5 h-1.5 rounded-full ${isDark ? CATEGORY_DOT_COLOR[cat]?.dark : CATEGORY_DOT_COLOR[cat]?.light}`}
                      />
                    ))}
                    {hasHabit && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    {hasDue && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      <div className="card rounded-2xl p-5">
        <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {selectedDateLabel}
        </h2>

        {!hasActivity ? (
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
          </div>
        )}
      </div>
    </div>
  );
}
