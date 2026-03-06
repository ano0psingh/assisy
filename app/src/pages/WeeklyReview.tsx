import { useMemo, useState, useCallback } from 'react';
import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Target,
  Calendar,
  Flame,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { isGeminiConfigured } from '../lib/gemini';
import { useTaskContext } from '../context/TaskContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';

function getWeekRange(weeksAgo = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const label = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return { start: monday, end: sunday, label };
}

function isInRange(date: Date | string | undefined, start: Date, end: Date): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d >= start && d <= end;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyReview() {
  const { tasks } = useTaskContext();
  const { goals } = useGoalContext();
  const { habits, getHabitStreak, getHabitLogs } = useHabitContext();
  const { getTotalXP, getTotalLevel, getTitle, userStats } = useGamification();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const thisWeek = useMemo(() => getWeekRange(0), []);
  const lastWeek = useMemo(() => getWeekRange(1), []);

  const completedThisWeek = useMemo(
    () => tasks.filter(t => t.status === 'Completed' && isInRange(t.completedAt, thisWeek.start, thisWeek.end)),
    [tasks, thisWeek],
  );
  const completedLastWeek = useMemo(
    () => tasks.filter(t => t.status === 'Completed' && isInRange(t.completedAt, lastWeek.start, lastWeek.end)),
    [tasks, lastWeek],
  );

  const delta = completedThisWeek.length - completedLastWeek.length;

  const byCategory = useMemo(() => ({
    Personal: completedThisWeek.filter(t => t.category === 'Personal').length,
    Financial: completedThisWeek.filter(t => t.category === 'Financial').length,
    Professional: completedThisWeek.filter(t => t.category === 'Professional').length,
  }), [completedThisWeek]);

  const byPriority = useMemo(() => ({
    High: completedThisWeek.filter(t => t.priority === 'High').length,
    Low: completedThisWeek.filter(t => t.priority === 'Low').length,
  }), [completedThisWeek]);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateInsight = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
      if (!GROQ_KEY && !isGeminiConfigured()) {
        setAiInsight('No AI API key configured. Add VITE_GROQ_API_KEY to .env.local.');
        return;
      }

      const weekData = {
        tasksCompleted: completedThisWeek.length,
        tasksLastWeek: completedLastWeek.length,
        tasksByCategory: { Personal: completedThisWeek.filter(t => t.category === 'Personal').length, Financial: completedThisWeek.filter(t => t.category === 'Financial').length, Professional: completedThisWeek.filter(t => t.category === 'Professional').length },
        highPriorityDone: completedThisWeek.filter(t => t.priority === 'High').length,
        pendingTasks: tasks.filter(t => t.status === 'Pending').length,
        streak: userStats.currentStreak,
        level: getTotalLevel(),
        xp: getTotalXP(),
        activeGoals: goals.filter(g => g.status === 'Active').map(g => ({ title: g.title, progress: g.progress })),
        habits: habits.map(h => ({ name: h.name, streak: getHabitStreak(h.id), logs7d: getHabitLogs(h.id, 7).filter(l => l.value > 0).length })),
      };

      const prompt = `You are a supportive productivity coach. Based on this user's weekly data, provide a brief, actionable weekly review in 3 sections. Be specific and reference actual numbers.

WEEKLY DATA:
${JSON.stringify(weekData, null, 2)}

Respond in this format:
**What went well:** (2-3 sentences about achievements)
**Where to improve:** (2-3 sentences about gaps, be constructive not harsh)
**Focus for next week:** (2-3 specific, actionable suggestions)`;

      if (GROQ_KEY) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
          }),
        });
        const data = await res.json();
        setAiInsight(data.choices?.[0]?.message?.content ?? 'No insight generated.');
      }
    } catch (e) {
      setAiInsight(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, completedThisWeek, completedLastWeek, tasks, userStats, getTotalLevel, getTotalXP, goals, habits, getHabitStreak, getHabitLogs]);

  const pendingCount = useMemo(
    () => tasks.filter(t => t.status === 'Pending' || t.status === 'Carried Forward').length,
    [tasks],
  );

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'Active'), [goals]);

  const cardClass = `rounded-2xl ${isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Weekly Review</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Your week at a glance</p>
      </div>

      {/* ── 1. WEEK AT A GLANCE ──────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border border-violet-500/15'
          : 'bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50 border border-violet-100'
      }`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-200/40'}`} />
          <div className={`absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-3xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-200/30'}`} />
        </div>

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{thisWeek.label}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tasks completed */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Completed</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{completedThisWeek.length}</span>
                <span className={`flex items-center gap-0.5 text-xs font-medium pb-1 ${
                  delta > 0
                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                    : delta < 0
                      ? isDark ? 'text-red-400' : 'text-red-500'
                      : isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  {delta > 0 ? <ArrowUp size={12} /> : delta < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                  {Math.abs(delta)} vs last week
                </span>
              </div>
            </div>

            {/* Last week */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Last Week</p>
              <span className={`text-3xl font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{completedLastWeek.length}</span>
            </div>

            {/* Streak */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Streak</p>
              <div className="flex items-center gap-1.5">
                <Flame className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                <span className={`text-3xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{userStats.currentStreak}</span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>days</span>
              </div>
            </div>

            {/* XP / Level */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Level</p>
              <div className="flex items-center gap-1.5">
                <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <span className={`text-3xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{getTotalLevel()}</span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{getTotalXP().toLocaleString()} XP · {getTitle()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TASK BREAKDOWN ────────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <ClipboardList size={16} /> Task Breakdown
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* By category */}
          {([
            { label: 'Personal', count: byCategory.Personal, color: 'blue' },
            { label: 'Financial', count: byCategory.Financial, color: 'emerald' },
            { label: 'Professional', count: byCategory.Professional, color: 'slate' },
          ] as const).map(({ label, count, color }) => (
            <div key={label} className={cardClass + ' p-4'}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isDark ? `text-${color}-400` : `text-${color}-600`}`}>{label}</span>
                <CheckCircle2 size={14} className={isDark ? `text-${color}-400/60` : `text-${color}-500/60`} />
              </div>
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{count}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          {/* By priority */}
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>High Priority</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className={isDark ? 'text-red-400' : 'text-red-500'} />
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{byPriority.High}</span>
            </div>
          </div>
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Low Priority</p>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={16} className={isDark ? 'text-sky-400' : 'text-sky-500'} />
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{byPriority.Low}</span>
            </div>
          </div>
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Still Pending</p>
            <div className="flex items-center gap-1.5">
              <ClipboardList size={16} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. HABIT SCORECARD ───────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Flame size={16} /> Habit Scorecard
        </h2>

        {habits.length === 0 ? (
          <div className={cardClass + ' p-6 text-center'}>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>No habits tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {habits.map(habit => {
              const logs = getHabitLogs(habit.id, 7);
              const streak = getHabitStreak(habit.id);

              const weekStart = getWeekRange(0).start;
              const dayDone = new Map<number, boolean>();
              logs.forEach(log => {
                const d = new Date(log.date);
                const dayIdx = Math.floor((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
                if (dayIdx >= 0 && dayIdx < 7 && log.value) dayDone.set(dayIdx, true);
              });

              return (
                <div key={habit.id} className={cardClass + ' px-4 py-3 flex items-center gap-4'}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{habit.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame size={12} className={isDark ? 'text-orange-400' : 'text-orange-500'} />
                      <span className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{streak}d streak</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {DAYS.map((dayLabel, idx) => {
                      const done = dayDone.get(idx);
                      return (
                        <div key={dayLabel} className="flex flex-col items-center gap-0.5">
                          <span className={`text-[9px] leading-none ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{dayLabel[0]}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            done
                              ? isDark ? 'bg-emerald-500/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                              : isDark ? 'bg-white/5 text-gray-700' : 'bg-slate-100 text-slate-300'
                          }`}>
                            {done ? <CheckCircle2 size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. GOAL PROGRESS ─────────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Target size={16} /> Goal Progress
        </h2>

        {activeGoals.length === 0 ? (
          <div className={cardClass + ' p-6 text-center'}>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>No active goals.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeGoals.map(goal => (
              <div key={goal.id} className={cardClass + ' px-4 py-3'}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{goal.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                  }`}>
                    {goal.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums w-8 text-right ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {goal.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. AI WEEKLY INSIGHT ────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Sparkles size={16} /> AI Coach
        </h2>
        <div className={cardClass + ' p-5'}>
          {aiInsight ? (
            <div className="space-y-3">
              <div className={`text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                {aiInsight.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className={isDark ? 'text-violet-400' : 'text-violet-600'}>{part}</strong> : <span key={i}>{part}</span>
                )}
              </div>
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className={`text-xs font-medium ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
              >
                Regenerate
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                Get an AI-powered analysis of your week
              </p>
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50`}
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiLoading ? 'Analyzing your week...' : 'Generate Weekly Insight'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
