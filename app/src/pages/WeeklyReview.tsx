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
  FolderKanban,
  Newspaper,
  Lightbulb,
  AlertTriangle,
  Heart,
  Activity,
  BarChart3,
} from 'lucide-react';
import { askAIJson, isAIConfigured } from '../lib/ai';
import { useTaskContext } from '../context/TaskContext';
import { useProjectContext } from '../context/ProjectContext';
import { useGoalContext } from '../context/GoalContext';
import { useHabitContext } from '../context/HabitContext';
import { useDailyLogContext } from '../context/DailyLogContext';
import { useFeed } from '../context/FeedContext';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { formatAIText } from '../lib/formatAIText';

interface WeeklyInsight {
  achievements: string[];
  slacked_areas: string[];
  delayed_items: string[];
  energy_pattern: string;
  habit_analysis: string;
  actionable_focus: string[];
  motivational_note: string;
}

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
  const { subProjects, projects, projectTasks, getTasksBySubProject, getProject } = useProjectContext();
  const { getRecentLogs } = useDailyLogContext();
  const { articles } = useFeed();
  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  const { goals } = useGoalContext();
  const { habits, getHabitStreak, getHabitLogs } = useHabitContext();
  const { getTotalXP, getTotalLevel, getTitle, userStats } = useGamification();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const thisWeek = useMemo(() => getWeekRange(0), []);
  const lastWeek = useMemo(() => getWeekRange(1), []);

  const completedThisWeek = useMemo(
    () => allTasks.filter(t => t.status === 'Completed' && isInRange(t.completedAt, thisWeek.start, thisWeek.end)),
    [allTasks, thisWeek],
  );
  const completedLastWeek = useMemo(
    () => allTasks.filter(t => t.status === 'Completed' && isInRange(t.completedAt, lastWeek.start, lastWeek.end)),
    [allTasks, lastWeek],
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

  const [aiInsight, setAiInsight] = useState<WeeklyInsight | string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateInsight = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      if (!isAIConfigured()) {
        setAiInsight('No AI API key configured. Add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY to .env.local.');
        return;
      }

      const now = new Date();
      const recentLogs = getRecentLogs(7);
      const dailyCheckIns = recentLogs.map(log => ({
        date: log.date,
        energyLevel: log.energyLevel,
        wins: log.wins,
        challenges: log.challenges,
        learnings: log.learnings,
        tomorrowFocus: log.tomorrowFocus,
      }));

      const overdueTasks = allTasks
        .filter(t => t.status === 'Pending' && t.dueDate && new Date(t.dueDate) < now)
        .map(t => ({ title: t.title, dueDate: t.dueDate }));

      const carriedForwardCount = allTasks.filter(t => t.status === 'Carried Forward').length;

      const delayedTasks = allTasks
        .filter(t => t.dueDate && isInRange(t.dueDate, thisWeek.start, thisWeek.end) && t.status !== 'Completed')
        .map(t => ({ title: t.title, dueDate: t.dueDate }));

      const brokenStreaks = habits
        .filter(h => {
          const streak = getHabitStreak(h.id);
          if (streak !== 0) return false;
          const allLogs = getHabitLogs(h.id, 365);
          return allLogs.some(l => new Date(l.date) < thisWeek.start);
        })
        .map(h => h.name);

      const weekData = {
        tasksCompleted: completedThisWeek.length,
        tasksLastWeek: completedLastWeek.length,
        tasksByCategory: {
          Personal: completedThisWeek.filter(t => t.category === 'Personal').length,
          Financial: completedThisWeek.filter(t => t.category === 'Financial').length,
          Professional: completedThisWeek.filter(t => t.category === 'Professional').length,
        },
        highPriorityDone: completedThisWeek.filter(t => t.priority === 'High').length,
        pendingTasks: tasks.filter(t => t.status === 'Pending').length,
        streak: userStats.currentStreak,
        level: getTotalLevel(),
        xp: getTotalXP(),
        activeGoals: goals.filter(g => g.status === 'Active').map(g => ({ title: g.title, progress: g.progress })),
        habits: habits.map(h => ({ name: h.name, streak: getHabitStreak(h.id), logs7d: getHabitLogs(h.id, 7).filter(l => l.value > 0).length })),
        dailyCheckIns,
        overdueTasks,
        carriedForwardTasks: carriedForwardCount,
        delayedTasks,
        brokenStreaks,
      };

      const prompt = `You are a supportive but honest productivity coach. Based on this user's weekly data including their daily check-ins, provide a detailed weekly review.

WEEKLY DATA:
${JSON.stringify(weekData, null, 2)}

Respond ONLY with valid JSON matching this exact schema:
{
  "achievements": ["specific things accomplished with numbers"],
  "slacked_areas": ["where consistency dropped or tasks were skipped"],
  "delayed_items": ["tasks/goals that fell behind schedule"],
  "energy_pattern": "observation about energy levels through the week",
  "habit_analysis": "which habits were maintained vs dropped",
  "actionable_focus": ["3 specific things to focus on next week"],
  "motivational_note": "a brief encouraging message"
}`;

      const result = await askAIJson<WeeklyInsight>(prompt, { temperature: 0.5 });
      setAiInsight(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (typeof e === 'object' && e !== null && 'message' in e) {
        setAiInsight(`Error: ${msg}`);
      } else {
        setAiInsight(`Error: ${msg}`);
      }
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, completedThisWeek, completedLastWeek, tasks, allTasks, thisWeek, userStats, getTotalLevel, getTotalXP, goals, habits, getHabitStreak, getHabitLogs, getRecentLogs]);

  const pendingCount = useMemo(
    () => allTasks.filter(t => t.status === 'Pending' || t.status === 'Carried Forward').length,
    [allTasks],
  );

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'Active'), [goals]);

  // Project breakdown: tasks completed this week by project
  const projectCompletedThisWeek = useMemo(
    () => projectTasks.filter(
      t => t.status === 'Done' && t.completedAt && isInRange(t.completedAt, thisWeek.start, thisWeek.end)
    ),
    [projectTasks, thisWeek],
  );
  const byProject = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    projectCompletedThisWeek.forEach(t => {
      const project = getProject(t.projectId);
      const title = project?.title ?? 'Project';
      const cur = map.get(t.projectId);
      map.set(t.projectId, { title, count: (cur?.count ?? 0) + 1 });
    });
    return Array.from(map.entries()).map(([id, v]) => ({ projectId: id, ...v }));
  }, [projectCompletedThisWeek, getProject]);

  // Feed summary: articles read/bookmarked this week
  const feedSummary = useMemo(() => {
    const weekStart = thisWeek.start.getTime();
    const weekEnd = thisWeek.end.getTime();
    const inWeek = (d: string | null) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= weekStart && t <= weekEnd;
    };
    const read = articles.filter(a => a.read && (inWeek(a.published_at ?? null) || inWeek(a.created_at)));
    const bookmarked = articles.filter(a => a.bookmarked && (inWeek(a.published_at ?? null) || inWeek(a.created_at)));
    const recentRead = read.slice(0, 3).map(a => a.title || 'Untitled');
    return { readCount: read.length, bookmarkedCount: bookmarked.length, recentTitles: recentRead };
  }, [articles, thisWeek]);

  // Rule-based actionable insights (no AI)
  const ruleBasedInsights = useMemo(() => {
    const bullets: string[] = [];
    if (pendingCount > 8) {
      bullets.push(`You have ${pendingCount} pending tasks – consider picking your top 3 for tomorrow.`);
    }
    if (delta < 0 && completedThisWeek.length > 0) {
      bullets.push('Fewer tasks completed than last week – small steps still count. Focus on one win tomorrow.');
    }
    if (byCategory.Personal > 0 && byCategory.Professional === 0 && tasks.some(t => t.category === 'Professional')) {
      bullets.push('No professional tasks completed this week – add one high-impact item for next week.');
    }
    const perfectHabits = habits.filter(h => {
      const weekLogs = (h.logs || []).filter(
        log => log.value > 0 && isInRange(log.date, thisWeek.start, thisWeek.end)
      );
      const uniqueDays = new Set(weekLogs.map(l => l.date)).size;
      return uniqueDays >= 7;
    });
    if (perfectHabits.length > 0) {
      bullets.push(`Great week for ${perfectHabits.map(h => h.name).join(', ')} – keep it up!`);
    }
    if (activeGoals.some(g => g.progress >= 90)) {
      const nearlyDone = activeGoals.filter(g => g.progress >= 90);
      bullets.push(`${nearlyDone.map(g => g.title).join(', ')} ${nearlyDone.length === 1 ? 'is' : 'are'} almost there – one more push!`);
    }
    if (bullets.length === 0) {
      bullets.push('Review your goals and plan 1–2 key tasks for next week.');
    }
    return bullets;
  }, [pendingCount, delta, completedThisWeek, byCategory, tasks, habits, thisWeek, activeGoals]);

  const cardClass = `rounded-2xl ${isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Weekly Review</h1>
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

        <div className="relative px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{thisWeek.label}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tasks completed */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Completed</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{completedThisWeek.length}</span>
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
              <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{completedLastWeek.length}</span>
            </div>

            {/* Streak */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Streak</p>
              <div className="flex items-center gap-1.5">
                <Flame className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{userStats.currentStreak}</span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>days</span>
              </div>
            </div>

            {/* XP / Level */}
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Level</p>
              <div className="flex items-center gap-1.5">
                <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{getTotalLevel()}</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
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

      {/* ── 2b. PROJECT BREAKDOWN ───────────────────── */}
      {byProject.length > 0 && (
        <div>
          <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            <FolderKanban size={16} /> Project progress this week
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {byProject.map(({ projectId, title, count }) => (
              <div key={projectId} className={cardClass + ' p-4'}>
                <p className={`text-xs font-medium truncate mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{title}</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
                  <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{count}</span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ── 4b. FEED SUMMARY ────────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Newspaper size={16} /> Feed this week
        </h2>
        <div className={cardClass + ' p-4'}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Read <strong className={isDark ? 'text-white' : 'text-slate-800'}>{feedSummary.readCount}</strong>
            </span>
            <span className={isDark ? 'text-gray-600' : 'text-slate-300'}>·</span>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              Bookmarked <strong className={isDark ? 'text-white' : 'text-slate-800'}>{feedSummary.bookmarkedCount}</strong>
            </span>
          </div>
          {feedSummary.recentTitles.filter(Boolean).length > 0 && (
            <p className={`text-xs mt-2 truncate max-w-full ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              Recent: {feedSummary.recentTitles.filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── 4c. QUICK INSIGHTS (rule-based) ──────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Lightbulb size={16} /> Quick insights
        </h2>
        <div className={cardClass + ' p-4'}>
          <ul className="space-y-2">
            {ruleBasedInsights.map((text, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                <span className={isDark ? 'text-amber-400' : 'text-amber-500'} aria-hidden>•</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 5. AI WEEKLY INSIGHT ────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          <Sparkles size={16} /> AI Coach
        </h2>

        {aiInsight && typeof aiInsight === 'object' ? (
          <div className="space-y-3">
            {/* Achievements */}
            {aiInsight.achievements?.length > 0 && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-emerald-500/[0.06] border border-emerald-500/15' : 'bg-emerald-50 border border-emerald-100'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 size={15} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Achievements</h3>
                </div>
                <ul className="space-y-1.5">
                  {aiInsight.achievements.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-emerald-200/80' : 'text-emerald-800'}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Slacked Areas */}
            {aiInsight.slacked_areas?.length > 0 && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-amber-500/[0.06] border border-amber-500/15' : 'bg-amber-50 border border-amber-100'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle size={15} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Slacked Areas</h3>
                </div>
                <ul className="space-y-1.5">
                  {aiInsight.slacked_areas.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Delayed Items */}
            {aiInsight.delayed_items?.length > 0 && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-red-500/[0.06] border border-red-500/15' : 'bg-red-50 border border-red-100'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingDown size={15} className={isDark ? 'text-red-400' : 'text-red-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-red-400' : 'text-red-700'}`}>Delayed Items</h3>
                </div>
                <ul className="space-y-1.5">
                  {aiInsight.delayed_items.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-red-200/80' : 'text-red-800'}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-red-400' : 'bg-red-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Energy Pattern */}
            {aiInsight.energy_pattern && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-sky-500/[0.06] border border-sky-500/15' : 'bg-sky-50 border border-sky-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={15} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>Energy Pattern</h3>
                </div>
                <p className={`text-sm ${isDark ? 'text-sky-200/80' : 'text-sky-800'}`}>{aiInsight.energy_pattern}</p>
              </div>
            )}

            {/* Habit Analysis */}
            {aiInsight.habit_analysis && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-orange-500/[0.06] border border-orange-500/15' : 'bg-orange-50 border border-orange-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={15} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Habit Analysis</h3>
                </div>
                <p className={`text-sm ${isDark ? 'text-orange-200/80' : 'text-orange-800'}`}>{aiInsight.habit_analysis}</p>
              </div>
            )}

            {/* Actionable Focus */}
            {aiInsight.actionable_focus?.length > 0 && (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-violet-500/[0.06] border border-violet-500/15' : 'bg-violet-50 border border-violet-100'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Target size={15} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>Focus Next Week</h3>
                </div>
                <ul className="space-y-1.5">
                  {aiInsight.actionable_focus.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-violet-200/80' : 'text-violet-800'}`}>
                      <span className={`mt-0.5 text-xs font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Motivational Note */}
            {aiInsight.motivational_note && (
              <div className={`rounded-2xl p-4 text-center ${isDark ? 'bg-pink-500/[0.06] border border-pink-500/15' : 'bg-pink-50 border border-pink-100'}`}>
                <Heart size={16} className={`mx-auto mb-2 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
                <p className={`text-sm italic ${isDark ? 'text-pink-200/80' : 'text-pink-700'}`}>{aiInsight.motivational_note}</p>
              </div>
            )}

            <div className="pt-1">
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className={`text-xs font-medium ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
              >
                {aiLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        ) : aiInsight && typeof aiInsight === 'string' ? (
          <div className={cardClass + ' p-5'}>
            <div className="space-y-3">
              <div
                className={`text-sm leading-relaxed space-y-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                dangerouslySetInnerHTML={{ __html: formatAIText(aiInsight) }}
              />
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className={`text-xs font-medium ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className={cardClass + ' p-5'}>
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
          </div>
        )}
      </div>
    </div>
  );
}
