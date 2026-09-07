import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTaskContext } from '../../context/TaskContext';
import { useHabitContext } from '../../context/HabitContext';
import { useGoalContext } from '../../context/GoalContext';
import { useGamification } from '../../context/GamificationContext';
import { Swords, Shield, Crown, Loader2, RefreshCw, Check, Sparkles } from 'lucide-react';
import { askAIJson, isAIConfigured } from '../../lib/ai';

interface Challenge {
  title: string;
  description: string;
  xpReward: number;
  type: 'task' | 'habit' | 'goal';
  target: number;
}

interface CachedChallenges {
  challenges: Challenge[];
  completed: boolean[];
}

function getWeekKey(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const CHALLENGE_ICONS = [Swords, Shield, Crown];
const CHALLENGE_COLORS = [
  { bg: 'bg-[var(--danger-soft)]', border: 'border-[var(--danger)]', text: 'text-[var(--danger)]', badgeBg: 'bg-[var(--danger-soft)]', badgeText: 'text-[var(--danger)]', light: { bg: 'bg-[var(--danger-soft)]', border: 'border-[var(--danger)]', text: 'text-[var(--danger)]', badgeBg: 'bg-[var(--danger-soft)]', badgeText: 'text-[var(--danger)]' } },
  { bg: 'bg-[var(--action)]/15', border: 'border-blue-500/25', text: 'text-[var(--action)]', badgeBg: 'bg-[var(--action-soft)]', badgeText: 'text-[var(--action)]', light: { bg: 'bg-[var(--action-soft)]', border: 'border-[var(--action)]', text: 'text-[var(--action)]', badgeBg: 'bg-[var(--action-soft)]', badgeText: 'text-[var(--action)]' } },
  { bg: 'bg-[var(--warning-soft)]', border: 'border-amber-500/25', text: 'text-[var(--warning)]', badgeBg: 'bg-[var(--warning-soft)]', badgeText: 'text-[var(--warning)]', light: { bg: 'bg-[var(--warning-soft)]', border: 'border-[var(--warning)]', text: 'text-[var(--warning)]', badgeBg: 'bg-[var(--warning-soft)]', badgeText: 'text-[var(--warning)]' } },
];

export function WeeklyChallenges() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { tasks } = useTaskContext();
  const { habits } = useHabitContext();
  const { goals } = useGoalContext();
  const { userStats } = useGamification();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekKey = getWeekKey();
  const cacheKey = `assisy_weekly_challenges_${weekKey}`;

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data: CachedChallenges = JSON.parse(cached);
        setChallenges(data.challenges);
        setCompleted(data.completed);
      } catch { /* ignore corrupt cache */ }
    }
  }, [cacheKey]);

  const saveToCache = useCallback((c: Challenge[], comp: boolean[]) => {
    localStorage.setItem(cacheKey, JSON.stringify({ challenges: c, completed: comp }));
  }, [cacheKey]);

  const generateChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
      const brokenStreaks = habits
        .filter(h => h.streakCount === 0 && h.logs.length > 0)
        .map(h => h.name);
      const lowProgressGoals = goals
        .filter(g => g.status === 'Active' && g.progress < 30)
        .map(g => `${g.title} (${g.progress}%)`);

      const result = await askAIJson<{ challenges: Challenge[] }>(
        `Generate 3 personalized weekly challenges based on the user's recent activity. Focus on areas of improvement. Tasks pending: ${pendingTasks}, habits with broken streaks: ${brokenStreaks.length > 0 ? brokenStreaks.join(', ') : 'none'}, goals with low progress: ${lowProgressGoals.length > 0 ? lowProgressGoals.join(', ') : 'none'}, current streak: ${userStats.currentStreak} days, total tasks completed: ${userStats.totalTasksCompleted}. Respond with JSON: {"challenges": [{"title": string, "description": string, "xpReward": number (50-200), "type": "task"|"habit"|"goal", "target": number}]}`,
      );

      if (result.challenges && result.challenges.length > 0) {
        const newChallenges = result.challenges.slice(0, 3);
        const newCompleted = newChallenges.map(() => false);
        setChallenges(newChallenges);
        setCompleted(newCompleted);
        saveToCache(newChallenges, newCompleted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenges could not be generated. Try again.');
    } finally {
      setLoading(false);
    }
  }, [tasks, habits, goals, userStats, saveToCache]);

  const toggleComplete = (index: number) => {
    const newCompleted = [...completed];
    newCompleted[index] = !newCompleted[index];
    setCompleted(newCompleted);
    saveToCache(challenges, newCompleted);
  };

  if (!isAIConfigured()) return null;

  if (challenges.length === 0) {
    return (
      <div className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords size={18} className={'text-[var(--warning)]'} />
            <span className={`text-sm font-semibold text-[var(--ink)]`}>Weekly Challenges</span>
          </div>
        </div>
        {error && <p className={`text-xs mb-2 text-[var(--danger)]`}>{error}</p>}
        <button
          onClick={generateChallenges}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            loading
              ? 'bg-[var(--surface-disabled)] text-[var(--ink-disabled)]'
              : 'bg-[var(--action)] text-[var(--action-ink)] hover:bg-[var(--action-hover)]'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generating...' : 'Generate Weekly Challenges'}
        </button>
      </div>
    );
  }

  const completedCount = completed.filter(Boolean).length;

  return (
    <div className="overflow-hidden border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-[var(--rule)]`}>
        <div className="flex items-center gap-2">
          <Swords size={18} className={'text-[var(--warning)]'} />
          <span className={`text-sm font-semibold text-[var(--ink)]`}>Weekly Challenges</span>
          <span className={`text-xs text-[var(--ink-muted)]`}>{completedCount}/{challenges.length}</span>
        </div>
        <button
          onClick={generateChallenges}
          disabled={loading}
          className={`p-2 rounded-sm transition-colors hover:bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] dark:hover:text-white`}
          title="Regenerate challenges"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {error && <p className={`text-xs px-4 pt-2 text-[var(--danger)]`}>{error}</p>}

      <div className="p-3 space-y-2">
        {challenges.map((challenge, i) => {
          const Icon = CHALLENGE_ICONS[i % CHALLENGE_ICONS.length];
          const colors = CHALLENGE_COLORS[i % CHALLENGE_COLORS.length];
          const c = isDark ? colors : colors.light;
          const done = completed[i];

          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleComplete(i)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-md border transition-all ${
                done
                  ? 'bg-[var(--success-soft)] border-[var(--success)] opacity-70'
                  : `${c.bg} ${c.border}`
              }`}
            >
              <div className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 ${
                done
                  ? 'bg-[var(--success-soft)]'
                  : c.badgeBg
              }`}>
                {done
                  ? <Check size={18} className={'text-[var(--success)]'} />
                  : <Icon size={18} className={c.text} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${done ? 'line-through' : ''} text-[var(--ink)]`}>
                    {challenge.title}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    done
                      ? 'bg-[var(--success-soft)] text-[var(--success)]'
                      : `${c.badgeBg} ${c.badgeText}`
                  }`}>
                    +{challenge.xpReward} XP
                  </span>
                </div>
                <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>
                  {challenge.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
