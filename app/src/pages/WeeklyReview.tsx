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
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { formatAIText } from '../lib/formatAIText';
import { WeeklyChallenges } from '../components/gamification/WeeklyChallenges';

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
        setAiInsight('AI is not configured on the server.');
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

  const cardClass = 'border-y border-[var(--rule)] bg-[var(--surface)]';

  return (
    <div className="space-y-6">
      {/* ── 1. WEEK AT A GLANCE ──────────────────────── */}
      <section className="relative overflow-hidden border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
        <div className="relative px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--rule)] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--action)]" />
              <h2 className="text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">Weekly record</h2>
            </div>
            <span className="font-mono text-xs font-medium tabular-nums text-[var(--ink-muted)]">{thisWeek.label}</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--rule)] md:grid-cols-4 md:divide-y-0">
            {/* Tasks completed */}
            <div className="p-3 first:pl-0">
              <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Completed</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl sm:text-3xl font-bold text-[var(--ink)]`}>{completedThisWeek.length}</span>
                <span className={`flex items-center gap-1 text-xs font-medium pb-1 ${
                  delta > 0
                    ? 'text-[var(--success)]'
                    : delta < 0
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--ink-muted)]'
                }`}>
                  {delta > 0 ? <ArrowUp size={12} /> : delta < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                  {Math.abs(delta)} vs last week
                </span>
              </div>
            </div>

            {/* Last week */}
            <div className="p-3">
              <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Last Week</p>
              <span className={`text-2xl sm:text-3xl font-bold text-[var(--ink-muted)]`}>{completedLastWeek.length}</span>
            </div>

            {/* Streak */}
            <div className="p-3">
              <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Streak</p>
              <div className="flex items-center gap-2">
                <Flame className={`w-5 h-5 text-[var(--warning)]`} />
                <span className={`text-2xl sm:text-3xl font-bold text-[var(--warning)]`}>{userStats.currentStreak}</span>
                <span className={`text-xs text-[var(--ink-muted)]`}>days</span>
              </div>
            </div>

            {/* XP / Level */}
            <div className="p-3 pr-0">
              <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Level</p>
              <div className="flex items-center gap-2">
                <Zap className={`w-5 h-5 text-[var(--warning)]`} />
                <span className={`text-2xl sm:text-3xl font-bold text-[var(--warning)]`}>{getTotalLevel()}</span>
              </div>
              <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>{getTotalXP().toLocaleString()} XP · {getTitle()}</p>
            </div>
          </div>
        </div>
      </section>

      <WeeklyChallenges />

      {/* ── 2. TASK BREAKDOWN ────────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <ClipboardList size={16} /> Task Breakdown
        </h2>

        <div className="grid grid-cols-1 divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {/* By category */}
          {([
            { label: 'Personal', count: byCategory.Personal },
            { label: 'Financial', count: byCategory.Financial },
            { label: 'Professional', count: byCategory.Professional },
          ] as const).map(({ label, count }) => (
            <div key={label} className={cardClass + ' p-4'}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--action)]">{label}</span>
                <CheckCircle2 size={14} className="text-[var(--action)]" />
              </div>
              <span className={`text-2xl font-bold text-[var(--ink)]`}>{count}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {/* By priority */}
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>High Priority</p>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={'text-[var(--danger)]'} />
              <span className={`text-2xl font-bold text-[var(--ink)]`}>{byPriority.High}</span>
            </div>
          </div>
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Low Priority</p>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className={'text-[var(--action)]'} />
              <span className={`text-2xl font-bold text-[var(--ink)]`}>{byPriority.Low}</span>
            </div>
          </div>
          <div className={cardClass + ' p-4'}>
            <p className={`text-xs mb-1 text-[var(--ink-muted)]`}>Still Pending</p>
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className={'text-[var(--warning)]'} />
              <span className={`text-2xl font-bold text-[var(--ink)]`}>{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2b. PROJECT BREAKDOWN ───────────────────── */}
      {byProject.length > 0 && (
        <div>
          <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
            <FolderKanban size={16} /> Project progress this week
          </h2>
          <div className="grid grid-cols-1 divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)] md:grid-cols-3 md:divide-x md:divide-y-0">
            {byProject.map(({ projectId, title, count }) => (
              <div key={projectId} className={cardClass + ' p-4'}>
                <p className={`text-xs font-medium truncate mb-1 text-[var(--ink-muted)]`}>{title}</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className={'text-[var(--success)]'} />
                  <span className={`text-xl font-bold text-[var(--ink)]`}>{count}</span>
                  <span className={`text-xs text-[var(--ink-muted)]`}>done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. HABIT SCORECARD ───────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <Flame size={16} /> Habit Scorecard
        </h2>

        {habits.length === 0 ? (
          <div className={cardClass + ' p-6 text-center'}>
            <p className={`text-sm text-[var(--ink-muted)]`}>No habits tracked yet.</p>
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
                    <p className={`text-sm font-medium truncate text-[var(--ink)]`}>{habit.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Flame size={12} className={'text-[var(--warning)]'} />
                      <span className={`text-xs text-[var(--warning)]`}>{streak}d streak</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {DAYS.map((dayLabel, idx) => {
                      const done = dayDone.get(idx);
                      return (
                        <div key={dayLabel} className="flex flex-col items-center gap-1">
                          <span className={`text-xs leading-none text-[var(--ink-muted)]`}>{dayLabel[0]}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            done
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'bg-[var(--surface-subtle)] text-[var(--ink-disabled)]'
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
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <Target size={16} /> Goal Progress
        </h2>

        {activeGoals.length === 0 ? (
          <div className={cardClass + ' p-6 text-center'}>
            <p className={`text-sm text-[var(--ink-muted)]`}>No active goals.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeGoals.map(goal => (
              <div key={goal.id} className={cardClass + ' px-4 py-3'}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium text-[var(--ink)]`}>{goal.title}</p>
                  <span className="border border-[var(--rule)] px-2 py-1 font-mono text-xs text-[var(--ink-muted)]">
                    {goal.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-2 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
                    <div
                      className="h-full rounded-full bg-[var(--action)] transition-all duration-500 motion-reduce:transition-none"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums w-8 text-right text-[var(--ink-muted)]`}>
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
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <Newspaper size={16} /> Feed this week
        </h2>
        <div className={cardClass + ' p-4'}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm text-[var(--ink-secondary)]`}>
              Read <strong className={'text-[var(--ink)]'}>{feedSummary.readCount}</strong>
            </span>
            <span className={'text-[var(--ink-disabled)]'}>·</span>
            <span className={`text-sm text-[var(--ink-secondary)]`}>
              Bookmarked <strong className={'text-[var(--ink)]'}>{feedSummary.bookmarkedCount}</strong>
            </span>
          </div>
          {feedSummary.recentTitles.filter(Boolean).length > 0 && (
            <p className={`text-xs mt-2 truncate max-w-full text-[var(--ink-muted)]`}>
              Recent: {feedSummary.recentTitles.filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── 4c. QUICK INSIGHTS (rule-based) ──────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <Lightbulb size={16} /> Quick insights
        </h2>
        <div className={cardClass + ' p-4'}>
          <ul className="space-y-2">
            {ruleBasedInsights.map((text, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 text-[var(--ink-secondary)]`}>
                <span className={'text-[var(--warning)]'} aria-hidden>•</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 5. AI WEEKLY INSIGHT ────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
          <Sparkles size={16} /> AI Coach
        </h2>

        {aiInsight && typeof aiInsight === 'object' ? (
          <div className="space-y-3">
            {/* Achievements */}
            {aiInsight.achievements?.length > 0 && (
              <div className={`rounded-md p-4 bg-[var(--success-soft)] border border-[var(--success)]`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={15} className={'text-[var(--success)]'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide text-[var(--success)]`}>Achievements</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsight.achievements.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 text-[var(--success)]`}>
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--success)]`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Slacked Areas */}
            {aiInsight.slacked_areas?.length > 0 && (
              <div className={`rounded-md p-4 bg-[var(--warning-soft)] border border-[var(--warning)]`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className={'text-[var(--warning)]'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide text-[var(--warning)]`}>Slacked Areas</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsight.slacked_areas.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 text-[var(--warning)]`}>
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--warning)]`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Delayed Items */}
            {aiInsight.delayed_items?.length > 0 && (
              <div className={`rounded-md p-4 bg-[var(--danger-soft)] border border-[var(--danger)]`}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={15} className={'text-[var(--danger)]'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide text-[var(--danger)]`}>Delayed Items</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsight.delayed_items.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 text-[var(--danger)]`}>
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--danger)] dark:bg-red-400`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Energy Pattern */}
            {aiInsight.energy_pattern && (
              <div className={`rounded-md p-4 bg-[var(--action-soft)] border border-[var(--action)]`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={15} className={'text-[var(--action)]'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide text-[var(--action)]`}>Energy Pattern</h3>
                </div>
                <p className={`text-sm text-blue-800 dark:text-blue-200/80`}>{aiInsight.energy_pattern}</p>
              </div>
            )}

            {/* Habit Analysis */}
            {aiInsight.habit_analysis && (
              <div className={`rounded-md p-4 bg-[var(--warning-soft)] border border-[var(--warning)]`}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={15} className={'text-[var(--warning)]'} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide text-[var(--warning)]`}>Habit Analysis</h3>
                </div>
                <p className={`text-sm text-[var(--warning)]`}>{aiInsight.habit_analysis}</p>
              </div>
            )}

            {/* Actionable Focus */}
            {aiInsight.actionable_focus?.length > 0 && (
              <div className="border border-[var(--action)] bg-[var(--action-soft)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={15} className="text-[var(--action)]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--action)]">Focus Next Week</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsight.actionable_focus.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink)]">
                      <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center bg-[var(--action-soft)] text-xs font-bold text-[var(--action)]">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Motivational Note */}
            {aiInsight.motivational_note && (
              <div className={`rounded-md p-4 text-center bg-[var(--warning-soft)] border border-[var(--warning)]`}>
                <Heart size={16} className={`mx-auto mb-2 text-[var(--warning)]`} />
                <p className={`text-sm italic text-[var(--ink-secondary)]`}>{aiInsight.motivational_note}</p>
              </div>
            )}

            <div className="pt-1">
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className="text-xs font-medium text-[var(--action)] hover:text-[var(--action-hover)]"
              >
                {aiLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        ) : aiInsight && typeof aiInsight === 'string' ? (
          <div className={cardClass + ' p-6'}>
            <div className="space-y-3">
              <div
                className={`text-sm leading-relaxed space-y-1 text-[var(--ink-secondary)]`}
                dangerouslySetInnerHTML={{ __html: formatAIText(aiInsight) }}
              />
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className="text-xs font-medium text-[var(--action)] hover:text-[var(--action-hover)]"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className={cardClass + ' p-6'}>
            <div className="text-center py-2">
              <p className={`text-sm mb-3 text-[var(--ink-muted)]`}>
                Get an AI-powered analysis of your week
              </p>
              <button
                onClick={generateInsight}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 bg-[var(--action)] px-4 py-2 text-sm font-medium text-[var(--action-ink)] transition-colors hover:bg-[var(--action-hover)] disabled:opacity-50 motion-reduce:transition-none"
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
