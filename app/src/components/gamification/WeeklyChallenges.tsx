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
  { bg: 'bg-red-500/15', border: 'border-red-500/25', text: 'text-red-400', badgeBg: 'bg-red-500/20', badgeText: 'text-red-400', light: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badgeBg: 'bg-red-100', badgeText: 'text-red-600' } },
  { bg: 'bg-blue-500/15', border: 'border-blue-500/25', text: 'text-blue-400', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-400', light: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-600' } },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/25', text: 'text-amber-400', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400', light: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badgeBg: 'bg-amber-100', badgeText: 'text-amber-600' } },
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
    } catch {
      setError('Failed to generate challenges. Try again.');
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
      <div className={`rounded-xl border p-4 bg-white border-slate-200 dark:bg-white/[0.03] dark:border-white/10`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords size={18} className={'text-amber-500 dark:text-amber-400'} />
            <span className={`text-sm font-semibold text-slate-800 dark:text-white`}>Weekly Challenges</span>
          </div>
        </div>
        {error && <p className={`text-xs mb-2 text-red-500 dark:text-red-400`}>{error}</p>}
        <button
          onClick={generateChallenges}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            loading
              ? 'bg-violet-50 text-violet-400 dark:bg-violet-500/10 dark:text-violet-400/60'
              : 'bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
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
    <div className={`rounded-xl border overflow-hidden bg-white border-slate-200 dark:bg-white/[0.03] dark:border-white/10`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5`}>
        <div className="flex items-center gap-2">
          <Swords size={18} className={'text-amber-500 dark:text-amber-400'} />
          <span className={`text-sm font-semibold text-slate-800 dark:text-white`}>Weekly Challenges</span>
          <span className={`text-xs text-slate-500 dark:text-gray-500`}>{completedCount}/{challenges.length}</span>
        </div>
        <button
          onClick={generateChallenges}
          disabled={loading}
          className={`p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:hover:bg-white/10 dark:text-gray-400 dark:hover:text-white`}
          title="Regenerate challenges"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {error && <p className={`text-xs px-4 pt-2 text-red-500 dark:text-red-400`}>{error}</p>}

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
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                done
                  ? 'bg-emerald-50 border-emerald-200 opacity-70 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                  : `${c.bg} ${c.border}`
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                done
                  ? 'bg-emerald-100 dark:bg-emerald-500/20'
                  : c.badgeBg
              }`}>
                {done
                  ? <Check size={18} className={'text-emerald-600 dark:text-emerald-400'} />
                  : <Icon size={18} className={c.text} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${done ? 'line-through' : ''} text-slate-800 dark:text-white`}>
                    {challenge.title}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    done
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : `${c.badgeBg} ${c.badgeText}`
                  }`}>
                    +{challenge.xpReward} XP
                  </span>
                </div>
                <p className={`text-xs mt-1 text-slate-500 dark:text-gray-400`}>
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
