import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { CheckSquare, Zap, Flame, Trophy, TrendingUp, Clock, AlertTriangle, Lightbulb, Target, Sparkles, Activity, BarChart3, Loader2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useHabitContext } from '../context/HabitContext';
import { useGoalContext } from '../context/GoalContext';
import { useProjectContext } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { SkillTreeViz } from '../components/gamification/SkillTreeViz';
import { askAIJson, isAIConfigured } from '../lib/ai';
import { projectTasksToTasks } from '../lib/mergeProjectTasks';
import { getLocalDateString } from '../lib/dateUtils';

export function Stats() {
  const { tasks } = useTaskContext();
  const { habits, getHabitLogs } = useHabitContext();
  const { goals } = useGoalContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { subProjects, projects, getTasksBySubProject } = useProjectContext();
  const { 
    userStats, 
    getUnlockedAchievements,
  } = useGamification();

  const allTasks = useMemo(
    () => [...tasks, ...projectTasksToTasks(subProjects, projects, getTasksBySubProject)],
    [tasks, subProjects, projects, getTasksBySubProject],
  );
  
  const completedTasks = allTasks.filter(t => t.status === 'Completed');
  const pendingTasks = allTasks.filter(t => t.status !== 'Completed');
  
  const personalTasks = completedTasks.filter(t => t.category === 'Personal');
  const financialTasks = completedTasks.filter(t => t.category === 'Financial');
  const professionalTasks = completedTasks.filter(t => t.category === 'Professional');
  
  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'High').length;
  const highEffortCompleted = completedTasks.filter(t => t.effort === 'High').length;

  const unlockedAchievements = getUnlockedAchievements();

  // Weekly completion rate
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const completedThisWeek = completedTasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekStart);
    const totalThisWeek = allTasks.filter(t => new Date(t.createdAt) >= weekStart || (t.completedAt && new Date(t.completedAt) >= weekStart));
    const rate = totalThisWeek.length > 0 ? Math.round((completedThisWeek.length / totalThisWeek.length) * 100) : 0;
    return { completed: completedThisWeek.length, total: totalThisWeek.length, rate };
  }, [allTasks, completedTasks]);

  // Most productive time of day
  const productiveTime = useMemo(() => {
    const hours: Record<string, number> = {};
    completedTasks.forEach(t => {
      if (!t.completedAt) return;
      const h = new Date(t.completedAt).getHours();
      const bucket = h < 6 ? 'Night (12-6 AM)' : h < 12 ? 'Morning (6 AM-12 PM)' : h < 18 ? 'Afternoon (12-6 PM)' : 'Evening (6 PM-12 AM)';
      hours[bucket] = (hours[bucket] ?? 0) + 1;
    });
    const sorted = Object.entries(hours).sort(([, a], [, b]) => b - a);
    return sorted.length > 0 ? { time: sorted[0][0], count: sorted[0][1], breakdown: sorted } : null;
  }, [completedTasks]);

  // Habit streak alerts
  const habitAlerts = useMemo(() => {
    const todayStr = new Date().toDateString();
    return habits.filter(h => {
      if (h.streakCount <= 0) return false;
      if (h.lastCompletedDate && new Date(h.lastCompletedDate).toDateString() === todayStr) return false;
      return true;
    });
  }, [habits]);

  // Chart data: last 14 days completions
  const weeklyTrendData = useMemo(() => {
    const days: { date: string; completed: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = getLocalDateString(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const count = completedTasks.filter(t => {
        if (!t.completedAt) return false;
        const completed = new Date(t.completedAt);
        return completed >= d && completed <= dayEnd;
      }).length;
      days.push({
        date: dateStr,
        completed: count,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return days;
  }, [completedTasks]);

  // Category pie data
  const categoryPieData = useMemo(() => [
    { name: 'Personal', value: personalTasks.length, color: '#3b82f6' },
    { name: 'Financial', value: financialTasks.length, color: '#10b981' },
    { name: 'Professional', value: professionalTasks.length, color: '#64748b' },
  ].filter(d => d.value > 0), [personalTasks.length, financialTasks.length, professionalTasks.length]);

  // Time of day bar data
  const timeOfDayData = useMemo(() => {
    if (!productiveTime?.breakdown?.length) return [];
    return productiveTime.breakdown.map(([time, count]) => ({ time, count }));
  }, [productiveTime]);

  // Habit completion count per day (how many habits done each day)
  const habitChartData = useMemo(() => {
    if (habits.length === 0) return [];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekStart = new Date();
    const day = weekStart.getDay();
    const monOffset = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + monOffset);
    weekStart.setHours(0, 0, 0, 0);
    const points: { day: string; done: number; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = getLocalDateString(d);
      let done = 0;
      habits.forEach(h => {
        const logs = getHabitLogs(h.id, 14);
        const val = logs.find(l => l.date === dateStr)?.value ?? 0;
        const target = h.dailyTarget || 1;
        if (val >= target) done++;
      });
      points.push({ day: dayLabels[i], done, total: habits.length });
    }
    return points;
  }, [habits, getHabitLogs]);

  // Personalized recommendations
  const recommendations = useMemo(() => {
    const tips: { icon: typeof Lightbulb; text: string; type: 'warning' | 'tip' | 'success' }[] = [];
    if (weeklyStats.rate < 50 && weeklyStats.total > 0) {
      tips.push({ icon: AlertTriangle, text: `Weekly completion at ${weeklyStats.rate}%. Consider reducing scope or breaking tasks smaller.`, type: 'warning' });
    }
    if (habitAlerts.length > 0) {
      tips.push({ icon: Flame, text: `${habitAlerts.length} habit streak${habitAlerts.length > 1 ? 's' : ''} at risk today. Complete them to keep your momentum!`, type: 'warning' });
    }
    const overdue = allTasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date());
    if (overdue.length > 0) {
      tips.push({ icon: AlertTriangle, text: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Reschedule or complete them to reduce mental load.`, type: 'warning' });
    }
    const activeGoals = goals.filter(g => g.status === 'Active');
    if (activeGoals.length === 0 && allTasks.length >= 5) {
      tips.push({ icon: Target, text: `You have ${allTasks.length} tasks but no active goals. Create goals to give your tasks purpose.`, type: 'tip' });
    }
    if (weeklyStats.rate >= 80) {
      tips.push({ icon: TrendingUp, text: `Great week! ${weeklyStats.rate}% completion rate. You're in the zone.`, type: 'success' });
    }
    if (userStats.currentStreak >= 7) {
      tips.push({ icon: Flame, text: `${userStats.currentStreak} day streak! Consistency is your superpower.`, type: 'success' });
    }
    if (productiveTime) {
      tips.push({ icon: Clock, text: `You're most productive in the ${productiveTime.time.split(' ')[0].toLowerCase()} (${productiveTime.count} tasks completed). Schedule important work then.`, type: 'tip' });
    }
    return tips;
  }, [weeklyStats, habitAlerts, allTasks, goals, userStats, productiveTime]);

  // AI Deep Analysis
  interface AIAnalysis {
    trends: string[];
    predictions: string[];
    comparisons: string[];
    patterns: string[];
    actionable: string[];
  }

  const AI_CACHE_KEY = 'assisy-ai-stats-analysis';

  const getCachedAnalysis = useCallback((): AIAnalysis | null => {
    try {
      const raw = localStorage.getItem(AI_CACHE_KEY);
      if (!raw) return null;
      const { date, data } = JSON.parse(raw);
      if (date === getLocalDateString()) return data as AIAnalysis;
    } catch { /* ignore */ }
    return null;
  }, []);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(getCachedAnalysis);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateAIAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const now = new Date();

      // Weekly completion rates for last 4 weeks
      const weeklyRates: { week: string; completed: number; total: number; rate: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const wStart = new Date(now);
        wStart.setDate(wStart.getDate() - wStart.getDay() + 1 - w * 7);
        wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);
        const wCompleted = completedTasks.filter(t => t.completedAt && new Date(t.completedAt) >= wStart && new Date(t.completedAt) <= wEnd).length;
        const wTotal = allTasks.filter(t => (new Date(t.createdAt) >= wStart && new Date(t.createdAt) <= wEnd) || (t.completedAt && new Date(t.completedAt) >= wStart && new Date(t.completedAt) <= wEnd)).length;
        weeklyRates.push({
          week: `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          completed: wCompleted,
          total: wTotal,
          rate: wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0,
        });
      }

      // Habit consistency over last 30 days
      const habitConsistency = habits.map(h => {
        const logs = getHabitLogs(h.id, 30);
        const target = h.dailyTarget || 1;
        const daysCompleted = logs.filter(l => l.value >= target).length;
        return { name: h.name, streak: h.streakCount, daysCompleted, rate: Math.round((daysCompleted / 30) * 100) };
      });

      // Goal progress
      const activeGoals = goals.filter(g => g.status === 'Active');
      const goalProgress = activeGoals.map(g => ({
        title: g.title,
        level: g.level,
        progress: g.progress,
        milestonesCompleted: g.milestones.filter(m => m.isCompleted).length,
        milestonesTotal: g.milestones.length,
      }));

      // Tasks by category and priority
      const byCategory = { Personal: personalTasks.length, Financial: financialTasks.length, Professional: professionalTasks.length };
      const byPriority = { High: completedTasks.filter(t => t.priority === 'High').length, Low: completedTasks.filter(t => t.priority === 'Low').length };

      const statsPayload = {
        totalCompleted: completedTasks.length,
        totalPending: pendingTasks.length,
        byCategory,
        byPriority,
        weeklyRates,
        habitConsistency,
        goalProgress,
        streaks: { current: userStats.currentStreak, longest: userStats.longestStreak, loginStreak: userStats.dailyLoginStreak },
        productiveTime: productiveTime ? { peak: productiveTime.time, count: productiveTime.count } : null,
        totalXP: userStats.totalXPEarned,
        daysActive: userStats.totalDaysActive,
        productiveDays: userStats.productiveDays,
        perfectDays: userStats.perfectDays,
      };

      const result = await askAIJson<AIAnalysis>(
        `You are a productivity analyst. Provide a deep analysis of this user's patterns. Stats: ${JSON.stringify(statsPayload)}. Respond with JSON: {"trends": [string], "predictions": [string], "comparisons": [string], "patterns": [string], "actionable": [string]}. Each array should have 2-4 concise bullet points.`,
      );

      setAiAnalysis(result);
      localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ date: getLocalDateString(), data: result }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setAiLoading(false);
    }
  }, [completedTasks, allTasks, pendingTasks, habits, getHabitLogs, goals, personalTasks, financialTasks, professionalTasks, userStats, productiveTime]);

  const analysisSections = useMemo(() => {
    if (!aiAnalysis) return [];
    return [
      { key: 'trends', title: 'Trends', items: aiAnalysis.trends, icon: TrendingUp, color: 'blue' },
      { key: 'predictions', title: 'Predictions', items: aiAnalysis.predictions, icon: Sparkles, color: 'teal' },
      { key: 'comparisons', title: 'Comparisons', items: aiAnalysis.comparisons, icon: BarChart3, color: 'amber' },
      { key: 'patterns', title: 'Patterns', items: aiAnalysis.patterns, icon: Activity, color: 'emerald' },
      { key: 'actionable', title: 'Actionable Items', items: aiAnalysis.actionable, icon: Target, color: 'red' },
    ].filter(s => s.items && s.items.length > 0);
  }, [aiAnalysis]);

  return (
    <div className="space-y-8">
      <SkillTreeViz />

      {/* Overview Stats */}
      <section className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
        <h2 className="border-b border-[var(--rule)] px-4 py-3 text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">
          Record summary
        </h2>
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--rule)] md:grid-cols-4 md:divide-y-0">
        {[
          { icon: Zap, label: 'Total XP', value: userStats.totalXPEarned.toLocaleString(), color: 'amber' },
          { icon: CheckSquare, label: 'Completed', value: userStats.totalTasksCompleted, color: 'emerald' },
          { icon: Flame, label: 'Best Streak', value: `${userStats.longestLoginStreak}d`, color: 'orange' },
          { icon: Trophy, label: 'Achievements', value: unlockedAchievements.length, color: 'teal' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 p-4 sm:p-5">
            <Icon className="h-5 w-5 text-[var(--action)]" />
            <div>
              <div className="text-2xl font-bold tabular-nums text-[var(--ink)]">{value}</div>
              <p className="font-mono text-xs uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
            </div>
          </div>
        ))}
        </div>
      </section>

      {/* Insights & Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
            <Lightbulb size={14} /> Insights
          </h2>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-md ${
                rec.type === 'warning'
                  ? 'bg-[var(--warning-soft)] border border-[var(--warning)]'
                  : rec.type === 'success'
                    ? 'bg-[var(--success-soft)] border border-[var(--success)]'
                    : 'bg-[var(--action-soft)] border border-[var(--action)]'
              }`}>
                <rec.icon size={16} className={`flex-shrink-0 mt-1 ${
                  rec.type === 'warning' ? 'text-[var(--warning)]'
                    : rec.type === 'success' ? 'text-[var(--success)]'
                    : 'text-[var(--action)]'
                }`} />
                <p className={`text-sm text-[var(--ink-secondary)]`}>{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Deep Analysis */}
      {isAIConfigured() && (
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-semibold flex items-center gap-2 text-[var(--ink-secondary)]`}>
              <Sparkles size={14} className="text-[var(--action)]" /> AI desk analysis
            </h2>
            <button
              onClick={generateAIAnalysis}
              disabled={aiLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${
                aiLoading
                  ? 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] cursor-not-allowed'
                  : 'bg-[var(--action-soft)] text-[var(--action)] hover:bg-[var(--selected)]'
              }`}
            >
              {aiLoading ? <><Loader2 size={12} className="animate-spin" /> Analyzing...</> : <><Sparkles size={12} /> Generate Analysis</>}
            </button>
          </div>

          {aiError && (
            <div className={`p-3 rounded-md text-sm mb-4 bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)]`}>
              {aiError}
            </div>
          )}

          {analysisSections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisSections.map(({ key, title, items, icon: Icon, color }) => (
                <div key={key} className={`p-4 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isDark ? `bg-${color}-500/20` : `bg-${color}-50`}`}>
                      <Icon size={13} className={isDark ? `text-${color}-400` : `text-${color}-500`} />
                    </div>
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? `text-${color}-400` : `text-${color}-600`}`}>{title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className={`text-sm leading-relaxed flex gap-2 text-[var(--ink-secondary)]`}>
                        <span className={`mt-2 w-1 h-1 rounded-full flex-shrink-0 ${isDark ? `bg-${color}-400` : `bg-${color}-500`}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : !aiLoading && (
            <p className={`text-sm text-center py-6 text-[var(--ink-muted)]`}>
              Click "Generate Analysis" to get AI-powered insights about your productivity patterns.
            </p>
          )}
        </div>
      )}

      {/* Weekly Performance */}
      <section className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
        <h2 className="border-b border-[var(--rule)] px-4 py-3 text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">Weekly metrics</h2>
        <div className="grid grid-cols-1 divide-y divide-[var(--rule)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className={'text-[var(--success)]'} />
            <p className={`text-sm font-medium text-[var(--ink-secondary)]`}>This Week</p>
          </div>
          <div className={`text-2xl font-bold text-[var(--ink)]`}>{weeklyStats.rate}%</div>
          <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>
            {weeklyStats.completed} of {weeklyStats.total} tasks completed
          </p>
          <div className={`h-1.5 rounded-full overflow-hidden mt-2 bg-[var(--surface-subtle)]`}>
            <div className={`h-full rounded-full transition-all duration-500 ${weeklyStats.rate >= 70 ? 'bg-[var(--success)]' : weeklyStats.rate >= 40 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`} style={{ width: `${weeklyStats.rate}%` }} />
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className={'text-[var(--action)]'} />
            <p className={`text-sm font-medium text-[var(--ink-secondary)]`}>Peak Productivity</p>
          </div>
          {productiveTime ? (
            <>
              <div className={`text-lg font-bold text-[var(--ink)]`}>{productiveTime.time.split(' ')[0]}</div>
              <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>{productiveTime.count} tasks completed in this window</p>
            </>
          ) : (
            <p className={`text-sm text-[var(--ink-muted)]`}>Complete tasks to see patterns</p>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className={habitAlerts.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'} />
            <p className={`text-sm font-medium text-[var(--ink-secondary)]`}>Habit Health</p>
          </div>
          {habitAlerts.length > 0 ? (
            <>
              <div className="text-lg font-bold text-[var(--warning)]">{habitAlerts.length} at risk</div>
              <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>
                {habitAlerts.map(h => h.name).join(', ')}
              </p>
            </>
          ) : habits.length > 0 ? (
            <>
              <div className={`text-lg font-bold text-[var(--success)]`}>All good</div>
              <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>All habit streaks are safe today</p>
            </>
          ) : (
            <p className={`text-sm text-[var(--ink-muted)]`}>Create habits to track</p>
          )}
        </div>
        </div>
      </section>

      {/* Charts */}
      <div className="space-y-6">
        <h2 className={`text-sm font-semibold text-[var(--ink-secondary)]`}>Charts</h2>
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <p className={`text-sm font-medium mb-3 text-[var(--ink-secondary)]`}>Completions (last 14 days)</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--rule)', color: 'var(--ink)' }} formatter={(value) => [value ?? 0, 'Completed']} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
                <Bar dataKey="completed" fill="var(--action)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
            <p className={`text-sm font-medium mb-3 text-[var(--ink-secondary)]`}>By category</p>
            {categoryPieData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {categoryPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value ?? 0, 'Tasks']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={`text-sm py-8 text-center text-[var(--ink-muted)]`}>Complete tasks to see breakdown</p>
            )}
          </div>
          <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
            <p className={`text-sm font-medium mb-3 text-[var(--ink-secondary)]`}>Productive time of day</p>
            {timeOfDayData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDayData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                    <YAxis type="category" dataKey="time" width={100} tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                    <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--rule)', color: 'var(--ink)' }} />
                    <Bar dataKey="count" fill="var(--info)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={`text-sm py-8 text-center text-[var(--ink-muted)]`}>Complete tasks to see patterns</p>
            )}
          </div>
        </div>
        {habits.length > 0 && (
          <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
            <p className={`text-sm font-medium mb-3 text-[var(--ink-secondary)]`}>Habits completed this week</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                  <YAxis domain={[0, habits.length]} allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--ink-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--rule)', color: 'var(--ink)' }} formatter={(value) => [`${value}/${habits.length}`, 'Habits done']} />
                  <Bar dataKey="done" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Activity Metrics */}
      <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className={`text-sm font-semibold mb-4 text-[var(--ink-secondary)]`}>Activity</h2>
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--rule)] border-y border-[var(--rule)] md:grid-cols-4 md:divide-y-0">
          {[
            { label: 'Days Active', value: userStats.totalDaysActive },
            { label: 'Productive Days', value: userStats.productiveDays },
            { label: 'Perfect Days', value: userStats.perfectDays },
            { label: 'Tasks Created', value: userStats.totalTasksCreated },
            { label: 'Days Planned', value: userStats.totalDaysPlanned },
            { label: 'Pending Tasks', value: pendingTasks.length },
            { label: 'Early Bird', value: userStats.earlyBirdCount },
            { label: 'Night Owl', value: userStats.nightOwlCount },
          ].map(({ label, value }) => (
            <div key={label} className="p-3">
              <p className={`text-xs text-[var(--ink-muted)]`}>{label}</p>
              <p className={`text-lg font-bold mt-1 text-[var(--ink)]`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className={`text-sm font-semibold mb-4 text-[var(--ink-secondary)]`}>Completed by Category</h2>
        <div className="space-y-4">
          {[
            { label: 'Personal', count: personalTasks.length, color: 'text-[var(--action)]', bg: 'bg-[var(--action)]' },
            { label: 'Financial', count: financialTasks.length, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]' },
            { label: 'Professional', count: professionalTasks.length, color: 'text-[var(--ink-secondary)]', bg: 'bg-[var(--rule-strong)]' },
          ].map(cat => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className={`font-medium ${cat.color}`}>{cat.label}</span>
                <span className={'text-[var(--ink-muted)]'}>{cat.count}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
                <div className={`h-full ${cat.bg} rounded-full transition-all duration-500`} style={{ width: `${completedTasks.length > 0 ? (cat.count / completedTasks.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority & Effort — compact */}
      <div className="grid grid-cols-1 divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)] bg-[var(--surface)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <p className={`text-sm text-[var(--ink-muted)]`}>High Priority Completed</p>
          <div className="text-2xl font-bold text-[var(--danger)] mt-1">{highPriorityCompleted}</div>
          <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>
            {completedTasks.length > 0 ? `${Math.round((highPriorityCompleted / completedTasks.length) * 100)}% of total` : 'No tasks yet'}
          </p>
        </div>
        <div className="border-y border-[var(--rule-strong)] bg-[var(--surface)] p-4 sm:p-6">
          <p className={`text-sm text-[var(--ink-muted)]`}>High Effort Completed</p>
          <div className="text-2xl font-bold text-[var(--warning)] mt-1">{highEffortCompleted}</div>
          <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>
            {completedTasks.length > 0 ? `${Math.round((highEffortCompleted / completedTasks.length) * 100)}% of total` : 'No tasks yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
