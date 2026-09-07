import { createElement, useMemo, useState, useEffect } from 'react';
import { Trophy, Lock, Star, Flame, Zap, Target, Award, Crown, Medal, CheckCircle2, TrendingUp, Sparkles, Calendar, Clock, Sunrise, Moon, Brain, Gift, X, Gem, Shield, Swords, BookOpen, Heart, Rocket, User, Scroll, MapPin, Compass, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useGamification } from '../context/GamificationContext';
import { useAuth } from '../context/AuthContext';
import { saveSettings } from '../store/unifiedStore';
import type { Achievement, AchievementType, UserStats } from '../types';

// ============ TITLES SYSTEM ============
const UNLOCKABLE_TITLES: { id: string; title: string; achievementId: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[] = [
  { id: 'newcomer', title: 'Newcomer', achievementId: 'first-blood', rarity: 'common' },
  { id: 'task-initiate', title: 'Task Initiate', achievementId: 'getting-started', rarity: 'common' },
  { id: 'warrior', title: 'Warrior', achievementId: 'task-warrior', rarity: 'rare' },
  { id: 'centurion', title: 'Centurion', achievementId: 'centurion', rarity: 'rare' },
  { id: 'task-master', title: 'Task Master', achievementId: 'task-master', rarity: 'epic' },
  { id: 'flame-keeper', title: 'Flame Keeper', achievementId: 'on-fire', rarity: 'common' },
  { id: 'unstoppable', title: 'Unstoppable', achievementId: 'unstoppable', rarity: 'rare' },
  { id: 'iron-will', title: 'Iron Will', achievementId: 'iron-discipline', rarity: 'epic' },
  { id: 'discipline-legend', title: 'Discipline Legend', achievementId: 'discipline-legend', rarity: 'legendary' },
  { id: 'planner', title: 'The Planner', achievementId: 'day-planner', rarity: 'common' },
  { id: 'architect', title: 'Architect', achievementId: 'planner-architect', rarity: 'epic' },
  { id: 'early-riser', title: 'Early Riser', achievementId: 'early-bird', rarity: 'common' },
  { id: 'night-owl', title: 'Night Owl', achievementId: 'night-owl', rarity: 'common' },
  { id: 'perfectionist', title: 'Perfectionist', achievementId: 'perfectionist', rarity: 'rare' },
  { id: 'grandmaster', title: 'Grandmaster', achievementId: 'level-50', rarity: 'legendary' },
  { id: 'legend', title: 'Living Legend', achievementId: 'legendary-dedication', rarity: 'legendary' },
];

const TITLE_RARITY_STYLES = {
  common: { bg: 'bg-[var(--surface-subtle)]', text: 'text-[var(--ink-disabled)]', border: 'border-[var(--rule-strong)]' },
  rare: { bg: 'bg-[var(--action-soft)]', text: 'text-[var(--action)]', border: 'border-[var(--action)]' },
  epic: { bg: 'bg-[var(--action-soft)]', text: 'text-[var(--action)]', border: 'border-[var(--action)]' },
  legendary: { bg: 'bg-[var(--warning-soft)]', text: 'text-[var(--warning)]', border: 'border-[var(--warning)]' },
};

// ============ HIDDEN/SECRET ACHIEVEMENTS ============
const SECRET_ACHIEVEMENTS = new Set([
  'midnight-warrior',    // Secret: Complete tasks at midnight
  'perfect-month',       // Secret: 30 days flawless
  'legendary-dedication', // Secret: 100 day streak
  'task-master',         // Secret: 500 tasks
  'xp-10000',           // Secret: 10k XP
]);

// ============ DAILY CHALLENGES SYSTEM ============
const DAILY_CHALLENGES = [
  { id: 'early-start', name: 'Early Start', description: 'Complete a task before 9 AM', xpReward: 25, icon: Sunrise, requirement: { type: 'early_task', value: 1 } },
  { id: 'triple-threat', name: 'Triple Threat', description: 'Complete 3 tasks today', xpReward: 30, icon: Target, requirement: { type: 'tasks_today', value: 3 } },
  { id: 'planning-pro', name: 'Planning Pro', description: 'Plan your day before noon', xpReward: 20, icon: Calendar, requirement: { type: 'plan_day', value: 1 } },
  { id: 'focus-hour', name: 'Focus Hour', description: 'Work for 1 hour without breaks', xpReward: 35, icon: Clock, requirement: { type: 'focus_time', value: 60 } },
  { id: 'goal-getter', name: 'Goal Getter', description: 'Make progress on a goal', xpReward: 25, icon: Trophy, requirement: { type: 'goal_progress', value: 1 } },
  { id: 'streak-keeper', name: 'Streak Keeper', description: 'Maintain your daily streak', xpReward: 15, icon: Flame, requirement: { type: 'maintain_streak', value: 1 } },
  { id: 'night-shift', name: 'Night Shift', description: 'Complete a task after 8 PM', xpReward: 20, icon: Moon, requirement: { type: 'late_task', value: 1 } },
  { id: 'five-alive', name: 'Five Alive', description: 'Complete 5 tasks today', xpReward: 50, icon: Star, requirement: { type: 'tasks_today', value: 5 } },
];

// Get today's challenges (rotates daily based on date)
const getTodaysChallenges = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const shuffled = [...DAILY_CHALLENGES].sort((a, b) => {
    const hashA = (dayOfYear * 31 + a.id.charCodeAt(0)) % 100;
    const hashB = (dayOfYear * 31 + b.id.charCodeAt(0)) % 100;
    return hashA - hashB;
  });
  return shuffled.slice(0, 3); // Return 3 daily challenges
};

// ============ STREAK MULTIPLIER SYSTEM ============
const getStreakMultiplier = (streak: number): { multiplier: number; label: string; color: string } => {
  if (streak >= 30) return { multiplier: 2.0, label: '2x', color: 'text-[var(--warning)]' };
  if (streak >= 14) return { multiplier: 1.5, label: '1.5x', color: 'text-[var(--action)]' };
  if (streak >= 7) return { multiplier: 1.25, label: '1.25x', color: 'text-[var(--action)]' };
  if (streak >= 3) return { multiplier: 1.1, label: '1.1x', color: 'text-green-400' };
  return { multiplier: 1.0, label: '1x', color: 'text-[var(--ink-muted)]' };
};

// ============ SOUND EFFECTS SYSTEM ============
const SOUND_ENABLED_KEY = 'achievement_sounds_enabled';
const playSound = (type: 'unlock' | 'click' | 'rare' | 'legendary') => {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  if (!enabled) return;

  // Using Web Audio API for simple sounds
  try {
    const AudioContextCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sounds for different events
    switch (type) {
      case 'legendary':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.3); // C6
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'rare':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.1); // C#5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.35);
        break;
      case 'unlock':
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.1); // C5
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
    }
  } catch {
    // Audio not supported, fail silently
  }
};

// ============ CONFETTI COMPONENT ============
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: (i * 37) % 100,
    delay: (i % 6) * 0.08,
    duration: 1 + (i % 8) * 0.12,
    color: ['#fbbf24', '#0f766e', '#44403c', '#10b981', '#dc2626'][i % 5],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden motion-reduce:hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Achievement tier based on XP reward
const getTier = (xpReward: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary' => {
  if (xpReward >= 1000) return 'legendary';
  if (xpReward >= 500) return 'platinum';
  if (xpReward >= 250) return 'gold';
  if (xpReward >= 100) return 'silver';
  return 'bronze';
};

// ============ PROGRESS PREDICTION ============
const getProgressPrediction = (achievement: Achievement, _userStats: UserStats, currentXP: number, currentLevel: number): string | null => {
  if (achievement.isUnlocked) return null;

  const req = achievement.requirement;
  const remaining = (req.value || 0) - ((req as { current?: number }).current ?? 0);

  if (remaining <= 0) return null;

  switch (req.type) {
    case 'tasks_completed':
      return `${remaining} more task${remaining === 1 ? '' : 's'} to go`;
    case 'streak_days':
      return `${remaining} more day${remaining === 1 ? '' : 's'} streak needed`;
    case 'goals_completed':
      return `${remaining} more goal${remaining === 1 ? '' : 's'} to complete`;
    case 'level_reached': {
      const levelsNeeded = (req.value || 0) - currentLevel;
      return levelsNeeded > 0 ? `Reach level ${req.value}` : null;
    }
    case 'xp_earned': {
      const xpNeeded = (req.value || 0) - currentXP;
      return xpNeeded > 0 ? `${xpNeeded.toLocaleString()} more XP needed` : null;
    }
    case 'days_active':
      return `${remaining} more active day${remaining === 1 ? '' : 's'}`;
    case 'tasks_in_day':
      return `Complete ${req.value} tasks in one day`;
    case 'early_tasks':
      return `${remaining} more early task${remaining === 1 ? '' : 's'}`;
    case 'late_tasks':
      return `${remaining} more late task${remaining === 1 ? '' : 's'}`;
    default:
      return null;
  }
};

type AchievementTier = ReturnType<typeof getTier>;
type AchievementSetId = 'discipline' | 'momentum' | 'planning' | 'creation' | 'mastery' | 'timing';

const ACHIEVEMENT_SETS: Record<AchievementSetId, { label: string; description: string; icon: typeof Star; ids: string[] }> = {
  discipline: {
    label: 'Discipline',
    description: 'Streaks, consistency, and long-term commitment.',
    icon: Shield,
    ids: [
      'on-fire',
      'unstoppable',
      'month-warrior',
      'iron-discipline',
      'discipline-legend',
      'weekly-warrior',
      'fortnight-fighter',
      'monthly-master',
      'legendary-dedication',
      'regular',
      'committed',
      'dedicated',
      'veteran',
    ],
  },
  momentum: {
    label: 'Momentum',
    description: 'High-output days and sustained execution.',
    icon: TrendingUp,
    ids: [
      'productive-day',
      'productivity-streak',
      'productivity-machine',
      'productive-month',
      'productive-legend',
      'perfect-day',
      'perfectionist',
      'perfect-week',
      'flawless-execution',
      'perfect-month',
    ],
  },
  planning: {
    label: 'Planning',
    description: 'Intentional work: plan first, win more.',
    icon: Calendar,
    ids: ['day-planner', 'organized-mind', 'planner-consistency', 'master-planner', 'planner-architect'],
  },
  creation: {
    label: 'Creation',
    description: 'Build systems, not just days.',
    icon: BookOpen,
    ids: ['creator', 'task-architect', 'prolific-planner', 'focus-mode', 'daily-driver', 'focus-champion'],
  },
  mastery: {
    label: 'Mastery',
    description: 'Levels and growth milestones.',
    icon: Crown,
    ids: ['level-5', 'level-10', 'level-25', 'level-50', 'xp-1000', 'xp-5000', 'xp-10000'],
  },
  timing: {
    label: 'Timing',
    description: 'Own your schedule. Win the edges.',
    icon: Sunrise,
    ids: ['early-bird', 'sunrise-champion', 'night-owl', 'midnight-warrior'],
  },
};

// Complete lore for ALL achievements
const ACHIEVEMENT_LORE: Record<string, string> = {
  // TASK MILESTONES
  'first-blood': 'A single strike. A new path begins.',
  'getting-started': 'Ten steps forward. Momentum ignites.',
  'task-warrior': 'Fifty victories. The warrior emerges.',
  'centurion': 'A hundred conquests. Legend in the making.',
  'task-master': 'Five hundred quests. True mastery achieved.',

  // STREAKS
  'welcome-back': 'You returned. That takes courage.',
  'on-fire': 'Three days ablaze. The flame grows.',
  'weekly-warrior': 'Seven suns. Seven victories.',
  'month-warrior': 'A full moon cycle. Iron will.',
  'iron-discipline': 'Sixty days forged in fire.',
  'discipline-legend': 'Ninety sunrises. Living legend.',
  'legendary-dedication': 'A hundred dawns. Immortal dedication.',

  'day-planner': 'Your first blueprint. Clarity begins.',
  'master-planner': 'Twenty-five strategies. Master tactician.',
  'planner-architect': 'Fifty blueprints. Architect of destiny.',

  'productive-day': 'Five tasks crushed. A productive dawn.',
  'productivity-machine': 'Seven days of output. Machine mode.',
  'productive-legend': 'Sixty days of fire. Legend status.',
  'perfect-month': 'Thirty flawless days. Godlike precision.',

  'early-bird': 'Dawn conquered. Victory before sunrise.',
  'night-owl': 'Midnight mastery. The night is yours.',

  'unstoppable': 'Two weeks of fury. Unstoppable force.',
  'fortnight-fighter': 'Fourteen dawns. Unbroken resolve.',
  'monthly-master': 'Thirty days of dominance.',

  // DAYS ACTIVE
  'regular': 'Seven days of presence. Consistency awakens.',
  'committed': 'Fourteen visits. Commitment solidifies.',
  'dedicated': 'Thirty appearances. Dedication defined.',
  'veteran': 'Sixty days logged. Battle-tested warrior.',

  // PLANNING
  'organized-mind': 'Five plans crafted. Order from chaos.',
  'planner-consistency': 'Ten days mapped. The path is clear.',

  // CREATION
  'creator': 'Ten tasks born. The creator awakens.',
  'task-architect': 'Twenty-five constructs. Systems emerge.',
  'prolific-planner': 'Fifty creations. Ideas flow endlessly.',
  'focus-mode': 'Deep work initiated. Distractions fade.',
  'daily-driver': 'Five days of adding. Momentum builds.',
  'focus-champion': 'Focus mastered. The mind is sharp.',

  // PRODUCTIVITY
  'productivity-streak': 'Three high-output days. The streak lives.',
  'productive-month': 'Thirty productive suns. Relentless.',
  'perfect-day': 'Every task done. Flawless execution.',
  'perfectionist': 'Three perfect days. Excellence standard.',
  'flawless-execution': 'Seven days without flaw. Perfection.',
  'perfect-week': 'Seven perfect suns. Untouchable.',

  // TIMING
  'sunrise-champion': 'Ten early mornings. Master of dawn.',
  'midnight-warrior': 'Ten late nights. Shadow warrior.',

  // GOALS
  'goal-setter': 'First goal achieved. Vision realized.',
  'goal-crusher': 'Five goals conquered. Unstoppable force.',
  'goal-master': 'Twenty-five victories. Goal master ascends.',

  // MASTERY & LEVELS
  'level-5': 'Level 5 reached. The apprentice rises.',
  'level-10': 'Level 10 unlocked. Journeyman status.',
  'level-25': 'Level 25 achieved. Expert tier unlocked.',
  'level-50': 'Level 50 mastered. Grandmaster emerges.',
  'xp-1000': 'One thousand XP. Power accumulates.',
  'xp-5000': 'Five thousand XP. Strength overflows.',
  'xp-10000': 'Ten thousand XP. Legendary power.',
};

type QuestObjective = {
  label: string;
  current: number;
  target: number;
  percent: number; // 0-100
};

function getQuestObjective(
  achievement: Achievement,
  userStats: UserStats,
  getTotalLevel: () => number,
  getTotalXP: () => number
): QuestObjective {
  const req = achievement.requirement;
  const target = req.value || 1;
  let current = 0;

  switch (req.type) {
    case 'tasks_completed':
      current = userStats.totalTasksCompleted;
      break;
    case 'streak_days':
      current = userStats.longestStreak;
      break;
    case 'goals_completed':
      current = userStats.goalsCompleted;
      break;
    case 'level_reached':
      current = getTotalLevel();
      break;
    case 'xp_earned':
      current = getTotalXP();
      break;
    case 'login_streak':
      current = userStats.longestLoginStreak;
      break;
    case 'days_active':
      current = userStats.totalDaysActive;
      break;
    case 'days_planned':
      current = userStats.totalDaysPlanned;
      break;
    case 'tasks_created':
      current = userStats.totalTasksCreated;
      break;
    case 'tasks_added_today':
      current = userStats.tasksAddedToToday;
      break;
    case 'productive_days':
      current = userStats.productiveDays;
      break;
    case 'perfect_days':
      current = userStats.perfectDays;
      break;
    case 'early_bird':
      current = userStats.earlyBirdCount;
      break;
    case 'night_owl':
      current = userStats.nightOwlCount;
      break;
    default:
      current = 0;
  }

  const percent = Math.min(100, Math.floor((current / target) * 100));
  const label = achievement.description;
  return { label, current, target, percent };
}
// Tier colors and styles
const getTierStyles = (tier: string) => {
  switch (tier) {
    case 'legendary':
      return {
        bg: 'bg-[var(--warning-soft)]',
        border: 'border-[var(--warning)]',
        icon: 'text-[var(--warning)]',
        badge: 'bg-[var(--warning)] text-[var(--ink-inverse)]',
        glow: '',
        ring: 'ring-1 ring-[var(--warning)]',
      };
    case 'platinum':
      return {
        bg: 'bg-[var(--action-soft)]',
        border: 'border-[var(--action)]',
        icon: 'text-[var(--action)]',
        badge: 'bg-[var(--action)] text-[var(--action-ink)]',
        glow: '',
        ring: 'ring-1 ring-[var(--action)]',
      };
    case 'gold':
      return {
        bg: 'bg-[var(--warning-soft)]',
        border: 'border-[var(--warning)]',
        icon: 'text-[var(--warning)]',
        badge: 'bg-[var(--warning)] text-[var(--ink-inverse)]',
        glow: '',
        ring: '',
      };
    case 'silver':
      return {
        bg: 'bg-[var(--surface-subtle)]',
        border: 'border-[var(--rule-strong)]',
        icon: 'text-[var(--ink-secondary)]',
        badge: 'bg-[var(--ink-secondary)] text-[var(--ink-inverse)]',
        glow: '',
        ring: '',
      };
    default: // bronze
      return {
        bg: 'bg-[var(--surface-subtle)]',
        border: 'border-[var(--rule-strong)]',
        icon: 'text-[var(--warning)]',
        badge: 'bg-[var(--ink-secondary)] text-[var(--ink-inverse)]',
        glow: '',
        ring: '',
      };
  }
};

// Map achievement icons with better icons
const getAchievementIcon = (achievement: Achievement) => {
  const iconMap: Record<string, typeof Star> = {
    'first-blood': Swords,
    'getting-started': Rocket,
    'task-warrior': Shield,
    'centurion': Medal,
    'task-master': Crown,
    'welcome-back': Heart,
    'weekly-warrior': Flame,
    'fortnight-fighter': TrendingUp,
    'monthly-master': Trophy,
    'legendary-dedication': Gem,
    'on-fire': Flame,
    'unstoppable': Zap,
    'month-warrior': Medal,
    'iron-discipline': Shield,
    'discipline-legend': Crown,
    'day-planner': Calendar,
    'organized-mind': Brain,
    'master-planner': Target,
    'planner-consistency': Calendar,
    'planner-architect': Award,
    'creator': BookOpen,
    'task-architect': Award,
    'prolific-planner': Sparkles,
    'focus-mode': Target,
    'daily-driver': Rocket,
    'focus-champion': Crown,
    'productive-day': Star,
    'productivity-streak': TrendingUp,
    'productivity-machine': Zap,
    'productive-month': TrendingUp,
    'productive-legend': Zap,
    'perfect-day': Gem,
    'perfectionist': Sparkles,
    'flawless-execution': Crown,
    'perfect-week': Star,
    'perfect-month': Trophy,
    'early-bird': Sunrise,
    'sunrise-champion': Sunrise,
    'night-owl': Moon,
    'midnight-warrior': Moon,
    'goal-setter': Target,
    'goal-crusher': Zap,
    'goal-master': Trophy,
    'level-5': TrendingUp,
    'level-10': Award,
    'level-25': Medal,
    'level-50': Crown,
    'xp-1000': Sparkles,
    'xp-5000': Gem,
    'xp-10000': Crown,
    'regular': Calendar,
    'committed': Heart,
    'dedicated': Shield,
    'veteran': Trophy,
  };
  return iconMap[achievement.id] || Star;
};

// ============ HERO BANNER COMPONENT ============
function HeroBanner({
  level,
  title,
  currentXP,
  xpToNextLevel,
  xpProgress,
  equippedTitle,
  unlockedTitles,
  onTitleChange,
  nextReward,
  userStats }: {
  level: number;
  title: string;
  currentXP: number;
  /** Cumulative XP at which the next level is reached, not the amount remaining. */
  xpToNextLevel: number;
  /** Percentage through the current level, from the single source of truth. */
  xpProgress: number;
  equippedTitle: string;
  unlockedTitles: typeof UNLOCKABLE_TITLES;
  onTitleChange: (titleId: string) => void;
  nextReward: { name: string; xpNeeded: number } | null;
  userStats: UserStats;
}) {
  const [showTitleSelector, setShowTitleSelector] = useState(false);

  // Get rank based on level
  const getRank = (lvl: number) => {
    if (lvl >= 50) return { name: 'Grandmaster', icon: Crown, color: 'text-[var(--warning)]' };
    if (lvl >= 30) return { name: 'Master', icon: Gem, color: 'text-[var(--action)]' };
    if (lvl >= 20) return { name: 'Expert', icon: Medal, color: 'text-[var(--action)]' };
    if (lvl >= 10) return { name: 'Journeyman', icon: Shield, color: 'text-[var(--action)]' };
    if (lvl >= 5) return { name: 'Apprentice', icon: Swords, color: 'text-green-400' };
    return { name: 'Initiate', icon: User, color: 'text-[var(--ink-muted)]' };
  };

  const rank = getRank(level);
  const RankIcon = rank.icon;

  const currentTitle = unlockedTitles.find(t => t.id === equippedTitle) || { title: title, rarity: 'common' as const };
  const titleStyle = TITLE_RARITY_STYLES[currentTitle.rarity];

  return (
    <div className="relative overflow-hidden border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar with prestige ring */}
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--ink)] ring-4 ring-[var(--warning-soft)]">
              <User className="h-12 w-12 text-[var(--ink-inverse)]" aria-hidden="true" />
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--warning)] px-3 py-1 text-sm font-bold text-[var(--ink-inverse)] shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              Lv.{level}
            </div>
            {/* Rank indicator */}
            <div className="absolute -left-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--action)] bg-[var(--surface)] shadow">
              <RankIcon size={16} className={rank.color} />
            </div>
          </div>

          {/* Character info */}
          <div className="flex-1 text-center md:text-left">
            {/* Name plate with decorative elements */}
            <div className="mb-3">
              {/* Name and equipped title */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative inline-block">
                  <h2 className={`text-3xl md:text-4xl font-black tracking-tight text-[var(--ink)]`}>
                    Kage
                  </h2>
                </div>

                {/* Title badge - more prominent */}
                <div className="relative">
                  <button
                    onClick={() => setShowTitleSelector(!showTitleSelector)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border-2 transition-all ${
                      currentTitle.rarity === 'legendary'
                        ? 'bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/50'
                        : currentTitle.rarity === 'epic'
                        ? 'bg-[var(--action-soft)] text-[var(--action)] border-[var(--action)]'
                        : currentTitle.rarity === 'rare'
                        ? 'bg-[var(--action-soft)] text-[var(--action)] border-blue-500/50'
                        : `${titleStyle.bg} ${titleStyle.text} ${titleStyle.border}`
                    } hover:scale-[1.02] motion-reduce:hover:scale-100`}
                  >
                    <Scroll size={16} className="opacity-80" />
                    <span className="tracking-wide">{currentTitle.title}</span>
                    <ChevronDown size={14} className={`transition-transform ${showTitleSelector ? 'rotate-180' : ''}`} />
                  </button>

                {/* Title selector dropdown */}
                {showTitleSelector && (
                  <div className={`absolute top-full left-0 mt-2 w-64 rounded-md overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.24)] z-50 bg-[var(--surface)] border border-[var(--rule)]`}>
                    <div className={`p-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)] bg-[var(--surface)]`}>
                      Equip Title
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {unlockedTitles.length === 0 ? (
                        <p className={`p-3 text-sm text-[var(--ink-muted)]`}>
                          Unlock achievements to earn titles!
                        </p>
                      ) : (
                        unlockedTitles.map((t) => {
                          const style = TITLE_RARITY_STYLES[t.rarity];
                          return (
                            <button
                              key={t.id}
                              onClick={() => { onTitleChange(t.id); setShowTitleSelector(false); }}
                              className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-all ${
                                equippedTitle === t.id
                                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                                  : 'hover:bg-[var(--surface)] text-[var(--ink-secondary)]'
                              }`}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${style.bg.replace('/20', '')}`} />
                              {t.title}
                              <span className={`ml-2 text-xs capitalize ${style.text}`}>({t.rarity})</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>

            {/* Rank & Streak row */}
            <div className={`flex items-center justify-center md:justify-start gap-4 mb-3 text-[var(--ink-secondary)]`}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-sm bg-[var(--surface-subtle)]`}>
                <RankIcon size={16} className={rank.color} />
                <span className={`text-sm font-medium ${rank.color}`}>{rank.name}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-sm bg-[var(--warning-soft)]`}>
                <Flame size={14} className="text-[var(--warning)]" />
                <span className="text-sm font-medium text-[var(--warning)]">{userStats.currentStreak} day streak</span>
              </div>
            </div>

            {/* XP Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium text-[var(--ink-secondary)]`}>
                  Experience Points
                </span>
                <span className="text-xs font-bold text-[var(--action)]">
                  {currentXP} / {xpToNextLevel} XP
                </span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
                <div
                  className="h-full rounded-full bg-[var(--action)] transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Next reward preview */}
            {nextReward && (
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-sm text-xs bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]`}>
                <Gift size={14} />
                <span>Next Reward: <strong>{nextReward.name}</strong></span>
                <span className="opacity-70">({nextReward.xpNeeded} XP away)</span>
              </div>
            )}
          </div>

          {/* Stats summary - Enhanced */}
          <div className={`hidden md:flex flex-col gap-2 p-6 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
            <div className="flex items-center gap-3 pb-2 border-b border-[var(--rule)]">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-[var(--warning-soft)]`}>
                <Zap size={20} className="text-[var(--warning)]" />
              </div>
              <div>
                <p className={`text-2xl font-black text-[var(--warning)]`}>{currentXP.toLocaleString()}</p>
                <p className={`text-xs text-[var(--ink-muted)]`}>Total XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-[var(--success-soft)]`}>
                <Target size={20} className="text-[var(--success)]" />
              </div>
              <div>
                <p className={`text-2xl font-black text-[var(--success)]`}>{userStats.totalTasksCompleted}</p>
                <p className={`text-xs text-[var(--ink-muted)]`}>Quests Completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ QUEST LOG ROADMAP COMPONENT ============
function QuestLogRoadmap({
  userStats,
  getTotalLevel }: {
  userStats: UserStats;
  getTotalLevel: () => number;
}) {
  // Define quest paths with milestones
  const questPaths = [
    {
      id: 'tasks',
      name: 'Task Mastery',
      icon: Target,
      color: 'teal',
      current: userStats.totalTasksCompleted,
      milestones: [
        { value: 1, name: 'First Blood', achievementId: 'first-blood' },
        { value: 10, name: 'Getting Started', achievementId: 'getting-started' },
        { value: 50, name: 'Task Warrior', achievementId: 'task-warrior' },
        { value: 100, name: 'Centurion', achievementId: 'centurion' },
        { value: 500, name: 'Task Master', achievementId: 'task-master' },
      ],
    },
    {
      id: 'streaks',
      name: 'Streak Legend',
      icon: Flame,
      color: 'orange',
      current: userStats.longestStreak,
      milestones: [
        { value: 3, name: 'On Fire', achievementId: 'on-fire' },
        { value: 7, name: 'Weekly Warrior', achievementId: 'weekly-warrior' },
        { value: 14, name: 'Unstoppable', achievementId: 'unstoppable' },
        { value: 30, name: 'Month Warrior', achievementId: 'month-warrior' },
        { value: 100, name: 'Legendary', achievementId: 'legendary-dedication' },
      ],
    },
    {
      id: 'goals',
      name: 'Goal Conquest',
      icon: Trophy,
      color: 'amber',
      current: userStats.goalsCompleted,
      milestones: [
        { value: 1, name: 'Goal Setter', achievementId: 'goal-setter' },
        { value: 5, name: 'Goal Crusher', achievementId: 'goal-crusher' },
        { value: 25, name: 'Goal Master', achievementId: 'goal-master' },
      ],
    },
    {
      id: 'mastery',
      name: 'Level Mastery',
      icon: Crown,
      color: 'blue',
      current: getTotalLevel(),
      milestones: [
        { value: 5, name: 'Level 5', achievementId: 'level-5' },
        { value: 10, name: 'Level 10', achievementId: 'level-10' },
        { value: 25, name: 'Level 25', achievementId: 'level-25' },
        { value: 50, name: 'Level 50', achievementId: 'level-50' },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; progress: string; text: string; icon: string }> = {
    teal: { bg: 'bg-[var(--action-soft)]', progress: 'bg-[var(--action)]', text: 'text-[var(--action)]', icon: 'text-[var(--action)]' },
    orange: { bg: 'bg-[var(--warning-soft)]', progress: 'bg-[var(--warning)]', text: 'text-[var(--warning)]', icon: 'text-[var(--warning)]' },
    amber: { bg: 'bg-[var(--warning-soft)]', progress: 'bg-[var(--warning)]', text: 'text-[var(--warning)]', icon: 'text-[var(--warning)]' },
    blue: { bg: 'bg-[var(--action-soft)]', progress: 'bg-[var(--action)]', text: 'text-[var(--action)]', icon: 'text-[var(--action)]' },
  };

  return (
    <div className={`p-6 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center bg-[var(--action-soft)]">
          <Compass size={20} className="text-[var(--action)]" />
        </div>
        <div>
          <h2 className={`text-lg font-bold text-[var(--ink)]`}>
            Quest Log
          </h2>
          <p className={`text-xs text-[var(--ink-muted)]`}>
            Your journey to mastery
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questPaths.map((path) => {
          const Icon = path.icon;
          const colors = colorMap[path.color];

          // Find current milestone and next milestone
          const completedMilestones = path.milestones.filter(m => path.current >= m.value);
          const nextMilestone = path.milestones.find(m => path.current < m.value);
          const progress = nextMilestone
            ? Math.min(100, (path.current / nextMilestone.value) * 100)
            : 100;

          return (
            <div
              key={path.id}
              className={`p-4 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${colors.bg}`}>
                  <Icon size={18} className={colors.icon} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm text-[var(--ink)]`}>
                    {path.name}
                  </h3>
                  <p className={`text-xs text-[var(--ink-muted)]`}>
                    {completedMilestones.length}/{path.milestones.length} milestones
                  </p>
                </div>
                <span className={`text-lg font-bold ${colors.text}`}>
                  {path.current}
                </span>
              </div>

              {/* Progress bar */}
              <div className={`h-2 rounded-full overflow-hidden mb-3 bg-[var(--surface-inset)]`}>
                <div
                  className={`h-full ${colors.progress} rounded-full transition-all duration-300 motion-reduce:transition-none`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Milestones */}
              <div className="flex items-center gap-1">
                {path.milestones.map((milestone, idx) => {
                  const isComplete = path.current >= milestone.value;
                  const isCurrent = nextMilestone?.value === milestone.value;
                  return (
                    <div key={milestone.value} className="flex-1 flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isComplete
                            ? `${colors.progress} text-[var(--ink-inverse)]`
                            : isCurrent
                              ? `${colors.bg} ${colors.text} ring-2 ring-current`
                              : 'bg-[var(--surface-inset)] text-[var(--ink-muted)]'
                        }`}
                        title={milestone.name}
                      >
                        {isComplete ? '✓' : idx + 1}
                      </div>
                      {idx < path.milestones.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 ${isComplete ? `${colors.progress}` : 'bg-[var(--surface-inset)]'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next milestone info */}
              {nextMilestone && (
                <p className={`mt-3 text-xs text-[var(--ink-secondary)]`}>
                  <span className="font-medium">Next:</span> {nextMilestone.name}
                  <span className={`ml-1 ${colors.text}`}>({nextMilestone.value - path.current} to go)</span>
                </p>
              )}
              {!nextMilestone && (
                <p className={`mt-3 text-xs font-medium ${colors.text}`}>
                  All milestones complete.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ STREAK BONUS VISUALIZATION ============
function StreakBonusBanner({ streak }: { streak: number }) {
  const bonus = getStreakMultiplier(streak);
  const nextBonus = streak < 3 ? { days: 3, multiplier: '1.1x' }
    : streak < 7 ? { days: 7, multiplier: '1.25x' }
    : streak < 14 ? { days: 14, multiplier: '1.5x' }
    : streak < 30 ? { days: 30, multiplier: '2x' }
    : null;

  if (streak === 0) return null;

  return (
    <div className={`relative overflow-hidden border-y border-[var(--warning)] bg-[var(--warning-soft)]`}>
      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Fire icon with glow */}
          <div className={`relative w-14 h-14 rounded-md flex items-center justify-center bg-[var(--warning-soft)]`}>
            <Flame size={28} className="text-[var(--warning)] animate-pulse motion-reduce:animate-none" />
            {bonus.multiplier > 1 && (
              <div className="absolute inset-0 rounded-md animate-unlock-glow motion-reduce:animate-none" style={{ boxShadow: '0 0 20px rgba(251, 146, 60, 0.4)' }} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${bonus.color}`}>{streak}</span>
              <span className={`text-sm font-medium text-[var(--ink-secondary)]`}>Day Streak</span>
            </div>
            <p className={`text-xs text-[var(--ink-muted)]`}>
              {nextBonus
                ? `${nextBonus.days - streak} more days until ${nextBonus.multiplier} bonus!`
                : 'Maximum streak bonus active!'
              }
            </p>
          </div>
        </div>

        {/* Multiplier badge */}
        <div className={`px-4 py-2 rounded-md bg-[var(--warning-soft)] border border-[var(--warning)]`}>
          <p className={`text-xs font-medium text-[var(--warning)]`}>XP Multiplier</p>
          <p className={`text-2xl font-black ${bonus.color}`}>{bonus.label}</p>
        </div>
      </div>
    </div>
  );
}

// ============ DAILY CHALLENGES COMPONENT ============
function DailyChallenges({ userStats }: { userStats: UserStats }) {
  const challenges = getTodaysChallenges();

  // Simple progress check (in a real app, this would be more sophisticated)
  const getProgress = (challenge: typeof DAILY_CHALLENGES[0]) => {
    switch (challenge.requirement.type) {
      case 'tasks_today':
        return Math.min(100, (userStats.totalTasksCompleted % 10) / challenge.requirement.value * 100);
      case 'maintain_streak':
        return userStats.currentStreak > 0 ? 100 : 0;
      default: {
        const stableSeed = `${challenge.id}-${new Date().toDateString()}`
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return stableSeed % 80;
      }
    }
  };

  return (
    <div className={`p-6 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-[var(--success-soft)]`}>
            <Zap size={20} className="text-[var(--success)]" />
          </div>
          <div>
            <h2 className={`font-bold text-[var(--ink)]`}>Daily Challenges</h2>
            <p className={`text-xs text-[var(--ink-muted)]`}>Resets at midnight</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold bg-[var(--success-soft)] text-[var(--success)]`}>
          +{challenges.reduce((sum, c) => sum + c.xpReward, 0)} XP Available
        </div>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          const progress = getProgress(challenge);
          const isComplete = progress >= 100;

          return (
            <div
              key={challenge.id}
              className={`p-3 rounded-md transition-all ${
                isComplete
                  ? 'bg-[var(--success-soft)] border border-[var(--success)]'
                  : 'bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                  isComplete
                    ? 'bg-[var(--success-soft)]'
                    : 'bg-[var(--surface-subtle)]'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 size={20} className="text-[var(--success)]" />
                  ) : (
                    <Icon size={20} className={'text-[var(--ink-muted)]'} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium text-sm text-[var(--ink)]`}>
                      {challenge.name}
                    </p>
                    <span className={`text-xs font-bold ${isComplete ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                      +{challenge.xpReward} XP
                    </span>
                  </div>
                  <p className={`text-xs text-[var(--ink-muted)]`}>
                    {challenge.description}
                  </p>
                  {!isComplete && (
                    <div className={`mt-2 h-1.5 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
                      <div
                        className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Enhanced Achievement Card
function AchievementCard({
  achievement,
  progress,
  onClick,
  isNew = false,
  prediction,
}: {
  achievement: Achievement;
  progress: number;
  onClick: () => void;
  isNew?: boolean;
  prediction?: string | null;
}) {
  const isSecret = SECRET_ACHIEVEMENTS.has(achievement.id);
  const isUnlocked = achievement.isUnlocked;
  const showAsSecret = isSecret && !isUnlocked;

  const tier = getTier(achievement.xpReward) as AchievementTier;
  const tierStyles = getTierStyles(tier);

  return (
    <div
      onClick={() => { onClick(); playSound('click'); }}
      className={`rarity-card rarity-${tier} ${isUnlocked ? 'rarity-unlocked' : 'rarity-locked'} relative w-4/5 mx-auto rounded-md overflow-hidden cursor-pointer transition-all duration-300 motion-reduce:transition-none aspect-square ${
        'bg-[var(--surface)] border border-[var(--rule)]'
      } ${isUnlocked ? '' : 'opacity-80'} hover:-translate-y-1 ${isNew ? 'animate-unlock-glow motion-reduce:animate-none' : ''}`}
    >
      {isUnlocked && <div className={`absolute inset-0 opacity-60 ${tierStyles.bg}`} />}

      <div className="relative z-10 h-full p-2 flex flex-col">
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-[0.14em] font-semibold ${
            isUnlocked ? tierStyles.badge : ('bg-[var(--surface-inset)] text-[var(--ink-secondary)]')
          }`}>
            {tier}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-[0.14em] font-semibold ${
            'bg-[var(--surface-subtle)] text-[var(--ink-muted)]'
          }`}>
            {achievement.type}
          </span>
        </div>

        {/* Center badge */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`relative w-[80px] h-[80px] rounded-[1.35rem] flex items-center justify-center border ${
            'bg-[var(--surface)] border-[var(--rule)]'
          } ${showAsSecret ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
            {showAsSecret ? (
              <span className="text-3xl font-bold text-[var(--action)]">?</span>
            ) : isUnlocked ? createElement(showAsSecret ? Sparkles : getAchievementIcon(achievement), {
                size: 46,
                className: tierStyles.icon,
              }) : (
              <Lock size={38} className={'text-[var(--ink-muted)]'} />
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div>
          <h3 className={`font-bold text-sm leading-tight line-clamp-2 text-[var(--ink)]`}>
            {showAsSecret ? '???' : achievement.name}
          </h3>

          <div className="mt-1 flex items-center justify-between">
            {isUnlocked ? (
              <div className={`flex items-center gap-2 text-xs font-bold ${tierStyles.icon}`}>
                <Zap size={11} className="opacity-90" />
                +{achievement.xpReward}
              </div>
            ) : showAsSecret ? (
              <div className="text-xs font-bold text-[var(--action)]">
                ???
              </div>
            ) : (
              <div className={`text-xs font-bold text-[var(--ink-secondary)]`}>
                {progress}%
              </div>
            )}
            <div className={`text-xs text-[var(--ink-muted)]`}>
              {isUnlocked ? 'Earned' : showAsSecret ? 'Hidden' : 'Locked'}
            </div>
          </div>

          {!isUnlocked && !showAsSecret && (
            <div className="mt-2">
              <div className={`h-1 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
                <div
                  className="h-full bg-[var(--action)] transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {prediction && (
                <p className={`mt-1 text-xs truncate text-[var(--ink-muted)]`}>
                  {prediction}
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Achievement Detail Modal
function AchievementModal({
  achievement,
  progress,
  lore,
  objective,
  onClose
}: {
  achievement: Achievement;
  progress: number;
  lore: string;
  objective: QuestObjective;
  onClose: () => void;
}) {
  const tier = getTier(achievement.xpReward);
  const tierStyles = getTierStyles(tier);
  const isUnlocked = achievement.isUnlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-[var(--surface-overlay)]`}
        onClick={onClose}
      />
      <div className={`relative w-full max-w-md rounded-md overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.24)] ${
        'bg-[var(--surface)] dark:bg-[#12121a]'
      }`}>
        <div className={`relative border-b border-[var(--rule)] p-4 sm:p-8 ${isUnlocked ? tierStyles.bg : 'bg-[var(--surface)]'}`}>
          {/* Close button */}
          <button
            aria-label="Close"
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              'hover:bg-[var(--surface-subtle)] text-[var(--ink-muted)]'
            }`}
          >
            <X size={20} />
          </button>

          {/* Icon */}
          <div className={`w-24 h-24 mx-auto rounded-md flex items-center justify-center mb-4 ${
            isUnlocked
              ? `bg-[var(--surface)] ${tierStyles.ring}`
              : 'bg-[var(--surface-subtle)]'
          }`}>
            {isUnlocked ? createElement(
              getAchievementIcon(achievement),
              { size: 48, className: tierStyles.icon },
            ) : (
              <Lock size={40} className={'text-[var(--ink-muted)]'} />
            )}
          </div>

          {/* Badge */}
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-2 text-[var(--ink)]`}>
              {achievement.name}
            </h2>
            <p className={`text-sm italic text-[var(--ink-secondary)]`}>
              {lore}
            </p>
            {isUnlocked && (
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${tierStyles.badge}`}>
                <CheckCircle2 size={16} />
                {tier.toUpperCase()} TIER
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 text-[var(--ink-muted)]`}>
              Quest
            </h3>
            <p className={`text-lg text-[var(--ink)]`}>
              {achievement.description}
            </p>
            <p className={`mt-2 text-sm text-[var(--ink-secondary)]`}>
              Objective: <span className="font-semibold">{objective.current}</span>/<span className="font-semibold">{objective.target}</span>
            </p>
          </div>

          {/* Progress */}
          {!isUnlocked && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]`}>
                  Progress
                </h3>
                <span className={`text-sm font-bold text-[var(--ink)]`}>
                  {progress}%
                </span>
              </div>
              <div className={`h-4 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    progress >= 80 ? 'bg-[var(--success)]' :
                    progress >= 50 ? 'bg-[var(--warning)]' :
                    'bg-[var(--action)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-md bg-[var(--surface)]`}>
            <div className="text-center">
              <p className={`text-2xl font-bold ${tierStyles.icon}`}>
                +{achievement.xpReward}
              </p>
              <p className={`text-xs text-[var(--ink-muted)]`}>XP Reward</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold capitalize text-[var(--ink)]`}>
                {achievement.type}
              </p>
              <p className={`text-xs text-[var(--ink-muted)]`}>Category</p>
            </div>
          </div>

          {/* Unlock info */}
          {isUnlocked && achievement.unlockedAt && (
            <div className={`flex items-center justify-center gap-2 text-sm text-[var(--ink-muted)]`}>
              <Gift size={16} />
              <span>
                Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Achievements() {
  const {
    achievements,
    userStats,
    getUnlockedAchievements,
    getLockedAchievements,
    getAchievementProgress,
    getTotalLevel,
    getTitle,
    getTotalXP,
    getLevelProgress,
  } = useGamification();

  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [typeFilter, setTypeFilter] = useState<AchievementType | 'all'>('all');
  const [setFilter, setSetFilter] = useState<AchievementSetId | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentCutoff] = useState(() => Date.now() - 24 * 60 * 60 * 1000);

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
    }
    return true;
  });

  const { user } = useAuth();
  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem(SOUND_ENABLED_KEY, String(newValue));
    saveSettings({ achievement_sounds_enabled: String(newValue) }, user?.id ?? null);
    if (newValue) playSound('click');
  };
  // Equipped title state (persisted to localStorage / cloud)
  const [equippedTitle, setEquippedTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('equippedTitle') || 'newcomer';
    }
    return 'newcomer';
  });

  // Save equipped title to localStorage / cloud
  useEffect(() => {
    localStorage.setItem('equippedTitle', equippedTitle);
    saveSettings({ equippedTitle }, user?.id ?? null);
  }, [equippedTitle, user?.id]);

  // Track recently unlocked achievements (within last 24 hours)
  const recentlyUnlocked = useMemo(() => {
    return new Set(
      achievements
        .filter(a => a.isUnlocked && a.unlockedAt && new Date(a.unlockedAt).getTime() > recentCutoff)
        .map(a => a.id)
    );
  }, [achievements, recentCutoff]);

  const unlockedAchievements = getUnlockedAchievements();
  const lockedAchievements = getLockedAchievements();

  // Get unlocked titles based on achievements
  const unlockedTitles = useMemo(() => {
    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));
    return UNLOCKABLE_TITLES.filter(t => unlockedIds.has(t.achievementId));
  }, [unlockedAchievements]);

  // Calculate next reward
  const nextReward = useMemo(() => {
    const currentXP = getTotalXP();
    const nextAchievement = lockedAchievements
      .filter(a => {
        if (a.requirement.type === 'xp_earned') {
          return (a.requirement.value || 0) > currentXP;
        }
        return false;
      })
      .sort((a, b) => (a.requirement.value || 0) - (b.requirement.value || 0))[0];

    if (nextAchievement) {
      return {
        name: nextAchievement.name,
        xpNeeded: (nextAchievement.requirement.value || 0) - currentXP,
      };
    }

    // Fallback to next level
    const currentLevel = getTotalLevel();
    const xpForNextLevel = currentLevel * 100;
    return {
      name: `Level ${currentLevel + 1}`,
      xpNeeded: xpForNextLevel - currentXP,
    };
  }, [getTotalXP, getTotalLevel, lockedAchievements]);

  const setIdByAchievementId = useMemo(() => {
    const map = new Map<string, AchievementSetId>();
    (Object.keys(ACHIEVEMENT_SETS) as AchievementSetId[]).forEach((sid) => {
      ACHIEVEMENT_SETS[sid].ids.forEach((id) => map.set(id, sid));
    });
    return map;
  }, []);

  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    const statusMatch = statusFilter === 'all' ||
      (statusFilter === 'unlocked' && a.isUnlocked) ||
      (statusFilter === 'locked' && !a.isUnlocked);
    const typeMatch = typeFilter === 'all' || a.type === typeFilter;
    const setMatch = setFilter === 'all' || setIdByAchievementId.get(a.id) === setFilter;
    return statusMatch && typeMatch && setMatch;
  });

  // Sort: unlocked first, then by XP reward (highest first), then by progress
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.isUnlocked && !b.isUnlocked) return -1;
    if (!a.isUnlocked && b.isUnlocked) return 1;
    if (a.isUnlocked && b.isUnlocked) {
      return b.xpReward - a.xpReward;
    }
    return getAchievementProgress(b) - getAchievementProgress(a);
  });

  // Calculate XP stats
  const totalXPFromAchievements = unlockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);
  const potentialXP = lockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);

  // Count by tier
  const tierCounts = {
    legendary: unlockedAchievements.filter(a => getTier(a.xpReward) === 'legendary').length,
    platinum: unlockedAchievements.filter(a => getTier(a.xpReward) === 'platinum').length,
    gold: unlockedAchievements.filter(a => getTier(a.xpReward) === 'gold').length,
    silver: unlockedAchievements.filter(a => getTier(a.xpReward) === 'silver').length,
    bronze: unlockedAchievements.filter(a => getTier(a.xpReward) === 'bronze').length,
  };

  // Get closest to unlock
  const closestToUnlock = lockedAchievements
    .map(a => ({ achievement: a, progress: getAchievementProgress(a) }))
    .filter(a => a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  const setStats = useMemo(() => {
    const unlocked = new Set(unlockedAchievements.map((a) => a.id));
    return (Object.keys(ACHIEVEMENT_SETS) as AchievementSetId[]).map((setId) => {
      const ids = ACHIEVEMENT_SETS[setId].ids;
      const total = ids.length;
      const done = ids.filter((id) => unlocked.has(id)).length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return { setId, total, done, percent, ...ACHIEVEMENT_SETS[setId] };
    });
  }, [unlockedAchievements]);

  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'quests'>('overview');

  return (
  <>
    <div className="space-y-6 achievements-ambient">
      {/* Hero Banner - RPG Profile */}
      <HeroBanner
        level={getTotalLevel()}
        title={getTitle()}
        currentXP={getTotalXP()}
        xpToNextLevel={getTotalLevel() * 100}
        xpProgress={getLevelProgress().percent}
        equippedTitle={equippedTitle}
        unlockedTitles={unlockedTitles}
        onTitleChange={setEquippedTitle}
        nextReward={nextReward}
        userStats={userStats}
      />

      {/* Confetti Effect */}
      <Confetti active={showConfetti} />

      {/* Tab navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-full overflow-x-auto rounded-md border border-[var(--rule)] max-sm:mr-16">
          {([
            { id: 'overview' as const, label: 'Overview' },
            { id: 'all' as const, label: 'All Achievements' },
            { id: 'quests' as const, label: 'Quests & Missions' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`min-h-11 shrink-0 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                activeTab === id
                  ? 'bg-[var(--action-soft)] text-[var(--action)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleSound}
          className={`flex min-h-11 items-center gap-2 self-start rounded-sm px-3 py-2 text-xs transition-colors ${
            soundEnabled
              ? 'bg-[var(--action)] text-[var(--action-ink)]'
              : 'border border-[var(--danger)] text-[var(--danger)]'
          }`}
        >
          {soundEnabled ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
          <span>{soundEnabled ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────── */}
      {activeTab === 'overview' && <>
        {/* Daily Challenges */}
        <DailyChallenges userStats={userStats} />

        {/* Active Missions */}
        {closestToUnlock.length > 0 && (
          <div className={`p-6 rounded-md bg-[var(--success-soft)] border border-[var(--success)]`}>
            <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 text-[var(--success)]`}>
              <MapPin className="w-4 h-4" /> Active Missions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {closestToUnlock.map(({ achievement, progress }) => {
                const Icon = getAchievementIcon(achievement);
                return (
                  <div key={achievement.id} onClick={() => setSelectedAchievement(achievement)} className={`p-3 rounded-md cursor-pointer transition-all hover:scale-[1.02] motion-reduce:hover:scale-100 bg-[var(--surface)] hover:bg-[var(--surface)]`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-sm flex items-center justify-center bg-[var(--surface)]`}>
                        <Icon size={16} className={'text-[var(--success)]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate text-[var(--ink)]`}>{achievement.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex-1 h-1.5 rounded-full bg-[var(--surface-inset)]`}>
                            <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-xs font-bold text-[var(--success)]`}>{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hall of Glory */}
        {unlockedAchievements.length > 0 && (
          <div className={`p-6 rounded-md bg-[var(--warning-soft)] border border-[var(--warning)]`}>
            <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 text-[var(--warning)]`}>
              <Crown className="w-4 h-4" /> Hall of Glory
            </h2>
            <div className="flex items-center justify-center gap-8">
              {unlockedAchievements.sort((a, b) => b.xpReward - a.xpReward).slice(0, 3).map((achievement, index) => {
                const Icon = getAchievementIcon(achievement);
                const tier = getTier(achievement.xpReward);
                const tierStyles = getTierStyles(tier);
                return (
                  <div key={achievement.id} className={`text-center ${index === 0 ? 'scale-110 -mt-2' : ''}`} onClick={() => setSelectedAchievement(achievement)}>
                    <div className={`w-16 h-16 mx-auto rounded-md flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100 bg-[var(--surface)] ${tierStyles.ring} ${tierStyles.glow}`}>
                      <Icon size={28} className={tierStyles.icon} />
                    </div>
                    <p className={`mt-2 text-xs font-medium text-[var(--ink)]`}>{achievement.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact archive summary */}
        <section className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)]">
          <h2 className="border-b border-[var(--rule)] px-4 py-3 text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">Achievement archive</h2>
          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--rule)] md:grid-cols-4 md:divide-y-0">
          <div className="p-4">
            <div className="text-2xl font-bold text-[var(--action)]">{unlockedAchievements.length}/{achievements.length}</div>
            <p className="text-xs text-[var(--action)]">Discovered</p>
          </div>
          <div className="p-4">
            <div className={`text-2xl font-bold text-[var(--warning)]`}>{totalXPFromAchievements.toLocaleString()}</div>
            <p className={`text-xs text-[var(--ink-muted)]`}>XP Claimed</p>
          </div>
          <div className="p-4">
            <div className={`text-2xl font-bold text-[var(--success)]`}>{potentialXP.toLocaleString()}</div>
            <p className={`text-xs text-[var(--ink-muted)]`}>XP Unclaimed</p>
          </div>
          <div className="p-4">
            <div className={`text-2xl font-bold text-[var(--warning)]`}>{userStats.currentStreak}</div>
            <p className={`text-xs text-[var(--ink-muted)]`}>Day Streak</p>
          </div>
          </div>
        </section>

        {/* Streak Bonus */}
        <StreakBonusBanner streak={userStats.currentStreak} />
      </>}

      {/* ── QUESTS TAB ──────────────────────────────── */}
      {activeTab === 'quests' && <>
        <QuestLogRoadmap userStats={userStats} getTotalLevel={getTotalLevel} />
        {/* Guild Collections */}
        <div className={`p-4 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 text-[var(--ink-secondary)]`}>Guild Collections</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {setStats.map((set) => {
              const SetIcon = set.icon;
              const isActive = setFilter === set.setId;
              return (
                <button key={set.setId} onClick={() => setSetFilter(isActive ? 'all' : set.setId)} className={`min-w-[200px] border p-3 text-left transition-colors ${isActive ? 'border-[var(--action)] bg-[var(--action-soft)]' : 'border-[var(--rule)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <SetIcon size={16} className={'text-[var(--ink-secondary)]'} />
                    <span className={`text-sm font-semibold text-[var(--ink)]`}>{set.label}</span>
                    <span className={`text-xs ml-auto font-bold text-[var(--ink-secondary)]`}>{set.done}/{set.total}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
                    <div className="h-full bg-[var(--action)] transition-all duration-300 motion-reduce:transition-none" style={{ width: `${set.percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>}

      {/* ── ALL ACHIEVEMENTS TAB ────────────────────── */}
      {activeTab === 'all' && <>
        {/* Artifact Vault by Rarity */}
        <div className={`p-6 rounded-md bg-[var(--surface)] border border-[var(--rule)]`}>
          <h2 className={`text-sm font-bold mb-3 text-[var(--ink)]`}>By Rarity</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(['legendary', 'platinum', 'gold', 'silver', 'bronze'] as const).map(tier => {
              const tierStyles = getTierStyles(tier);
              const total = achievements.filter(a => getTier(a.xpReward) === tier).length;
              const unlocked = tierCounts[tier];
              return (
                <div key={tier} className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-sm flex items-center justify-center mb-1 ${unlocked > 0 ? `${tierStyles.bg} ${tierStyles.ring}` : 'bg-[var(--surface-subtle)]'}`}>
                    {tier === 'legendary' && <Gem size={20} className={unlocked > 0 ? tierStyles.icon : 'text-[var(--ink-muted)]'} />}
                    {tier === 'platinum' && <Star size={20} className={unlocked > 0 ? tierStyles.icon : 'text-[var(--ink-muted)]'} />}
                    {tier === 'gold' && <Medal size={20} className={unlocked > 0 ? tierStyles.icon : 'text-[var(--ink-muted)]'} />}
                    {tier === 'silver' && <Award size={20} className={unlocked > 0 ? tierStyles.icon : 'text-[var(--ink-muted)]'} />}
                    {tier === 'bronze' && <Shield size={20} className={unlocked > 0 ? tierStyles.icon : 'text-[var(--ink-muted)]'} />}
                  </div>
                  <p className={`text-xs font-bold text-[var(--ink)]`}>{unlocked}/{total}</p>
                  <p className={`text-xs capitalize text-[var(--ink-muted)]`}>{tier}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters — compact */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex rounded-sm overflow-hidden border border-[var(--rule)]`}>
            {(['all', 'unlocked', 'locked'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 text-xs font-medium capitalize transition-all ${statusFilter === status ? 'bg-[var(--action-soft)] text-[var(--action)]' : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]'}`}>
                {status}
              </button>
            ))}
          </div>
          <div className={`flex rounded-sm overflow-hidden border border-[var(--rule)]`}>
            {(['all', 'milestone', 'streak', 'mastery', 'special'] as const).map((type) => (
              <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-2 text-xs font-medium capitalize transition-all ${typeFilter === type ? 'bg-[var(--action-soft)] text-[var(--action)]' : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]'}`}>
                {type}
              </button>
            ))}
          </div>
          <span className={`text-xs ml-auto text-[var(--ink-muted)]`}>{sortedAchievements.length} achievements</span>
        </div>

        {/* Achievement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedAchievements.map((achievement) => {
          const isNew = recentlyUnlocked.has(achievement.id);
          const prediction = getProgressPrediction(achievement, userStats, getTotalXP(), getTotalLevel());
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              progress={getAchievementProgress(achievement)}
              isNew={isNew}
              prediction={prediction}
              onClick={() => {
                setSelectedAchievement(achievement);
                if (isNew && achievement.isUnlocked) {
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 2000);
                  const tier = getTier(achievement.xpReward);
                  if (tier === 'legendary') playSound('legendary');
                  else if (tier === 'platinum' || tier === 'gold') playSound('rare');
                  else playSound('unlock');
                }
              }}
            />
          );
        })}
      </div>
      {sortedAchievements.length === 0 && (
        <div className={`rounded-md p-12 text-center bg-[var(--surface)] border border-[var(--rule)]`}>
          <Trophy className="mx-auto mb-3 h-10 w-10 text-[var(--warning)]" />
          <h3 className={`text-lg font-bold mb-1 text-[var(--ink)]`}>No achievements match</h3>
          <p className={`text-sm text-[var(--ink-muted)]`}>Try adjusting filters.</p>
        </div>
      )}
      </>}

    </div>

    {/* Achievement Detail Modal */}
    {selectedAchievement && (
      <AchievementModal
        achievement={selectedAchievement}
        progress={getAchievementProgress(selectedAchievement)}
        objective={getQuestObjective(selectedAchievement, userStats, getTotalLevel, getTotalXP)}
        lore={ACHIEVEMENT_LORE[selectedAchievement.id] || 'A mystery yet to be uncovered.'}
        onClose={() => setSelectedAchievement(null)}
      />
    )}
  </>
  );
}
