import { useMemo, useState, useEffect } from 'react';
import { Trophy, Lock, Star, Flame, Zap, Target, Award, Crown, Medal, CheckCircle2, TrendingUp, Sparkles, Calendar, Clock, Sunrise, Moon, Brain, Gift, X, Gem, Shield, Swords, BookOpen, Heart, Rocket, User, Scroll, MapPin, Compass, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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
  common: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
};

// ============ SEASON SYSTEM ============
const CURRENT_SEASON = {
  id: 'season-1',
  name: 'Season 1: The Path of Focus',
  description: 'Master the art of deep work and unlock exclusive seasonal badges.',
  endsAt: new Date('2026-03-31'),
  theme: 'focus',
  exclusiveBadges: ['focus-initiate', 'deep-worker', 'flow-state-master'],
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
  if (streak >= 30) return { multiplier: 2.0, label: '2x', color: 'text-amber-400' };
  if (streak >= 14) return { multiplier: 1.5, label: '1.5x', color: 'text-purple-400' };
  if (streak >= 7) return { multiplier: 1.25, label: '1.25x', color: 'text-blue-400' };
  if (streak >= 3) return { multiplier: 1.1, label: '1.1x', color: 'text-green-400' };
  return { multiplier: 1.0, label: '1x', color: 'text-gray-400' };
};

// ============ SOUND EFFECTS SYSTEM ============
const SOUND_ENABLED_KEY = 'achievement_sounds_enabled';
const playSound = (type: 'unlock' | 'click' | 'rare' | 'legendary') => {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  if (!enabled) return;
  
  // Using Web Audio API for simple sounds
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch (e) {
    // Audio not supported, fail silently
  }
};

// ============ CONFETTI COMPONENT ============
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1,
    color: ['#fbbf24', '#a855f7', '#3b82f6', '#10b981', '#f43f5e', '#06b6d4'][Math.floor(Math.random() * 6)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
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
    case 'level_reached':
      const levelsNeeded = (req.value || 0) - currentLevel;
      return levelsNeeded > 0 ? `Reach level ${req.value}` : null;
    case 'xp_earned':
      const xpNeeded = (req.value || 0) - currentXP;
      return xpNeeded > 0 ? `${xpNeeded.toLocaleString()} more XP needed` : null;
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
const getTierStyles = (tier: string, isDark: boolean) => {
  switch (tier) {
    case 'legendary':
      return {
        bg: isDark ? 'from-amber-500/30 via-yellow-500/20 to-orange-500/30' : 'from-amber-100 via-yellow-50 to-orange-100',
        border: isDark ? 'border-amber-400/50' : 'border-amber-300',
        icon: isDark ? 'text-amber-300' : 'text-amber-500',
        badge: isDark ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black' : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white',
        glow: 'shadow-lg shadow-amber-500/30',
        ring: 'ring-2 ring-amber-400/50',
      };
    case 'platinum':
      return {
        bg: isDark ? 'from-cyan-500/20 via-slate-500/20 to-blue-500/20' : 'from-cyan-50 via-slate-50 to-blue-50',
        border: isDark ? 'border-cyan-400/40' : 'border-cyan-300',
        icon: isDark ? 'text-cyan-300' : 'text-cyan-500',
        badge: isDark ? 'bg-gradient-to-r from-cyan-400 to-blue-400 text-black' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
        glow: 'shadow-lg shadow-cyan-500/20',
        ring: 'ring-2 ring-cyan-400/30',
      };
    case 'gold':
      return {
        bg: isDark ? 'from-yellow-500/20 to-amber-500/20' : 'from-yellow-50 to-amber-50',
        border: isDark ? 'border-yellow-500/30' : 'border-yellow-300',
        icon: isDark ? 'text-yellow-400' : 'text-yellow-500',
        badge: isDark ? 'bg-yellow-500 text-black' : 'bg-yellow-500 text-white',
        glow: '',
        ring: '',
      };
    case 'silver':
      return {
        bg: isDark ? 'from-slate-400/20 to-gray-500/20' : 'from-slate-100 to-gray-100',
        border: isDark ? 'border-slate-400/30' : 'border-slate-300',
        icon: isDark ? 'text-slate-300' : 'text-slate-500',
        badge: isDark ? 'bg-slate-400 text-black' : 'bg-slate-400 text-white',
        glow: '',
        ring: '',
      };
    default: // bronze
      return {
        bg: isDark ? 'from-orange-800/20 to-amber-900/20' : 'from-orange-100 to-amber-100',
        border: isDark ? 'border-orange-700/30' : 'border-orange-300',
        icon: isDark ? 'text-orange-400' : 'text-orange-600',
        badge: isDark ? 'bg-orange-700 text-white' : 'bg-orange-600 text-white',
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
  isDark,
  level,
  title,
  currentXP,
  xpToNextLevel,
  equippedTitle,
  unlockedTitles,
  onTitleChange,
  nextReward,
  userStats,
}: {
  isDark: boolean;
  level: number;
  title: string;
  currentXP: number;
  xpToNextLevel: number;
  equippedTitle: string;
  unlockedTitles: typeof UNLOCKABLE_TITLES;
  onTitleChange: (titleId: string) => void;
  nextReward: { name: string; xpNeeded: number } | null;
  userStats: UserStats;
}) {
  const [showTitleSelector, setShowTitleSelector] = useState(false);
  const xpProgress = (currentXP % 100) / 100 * 100;
  
  // Get rank based on level
  const getRank = (lvl: number) => {
    if (lvl >= 50) return { name: 'Grandmaster', icon: Crown, color: 'text-amber-400' };
    if (lvl >= 30) return { name: 'Master', icon: Gem, color: 'text-purple-400' };
    if (lvl >= 20) return { name: 'Expert', icon: Medal, color: 'text-cyan-400' };
    if (lvl >= 10) return { name: 'Journeyman', icon: Shield, color: 'text-blue-400' };
    if (lvl >= 5) return { name: 'Apprentice', icon: Swords, color: 'text-green-400' };
    return { name: 'Initiate', icon: User, color: 'text-slate-400' };
  };
  
  const rank = getRank(level);
  const RankIcon = rank.icon;
  
  const currentTitle = unlockedTitles.find(t => t.id === equippedTitle) || { title: title, rarity: 'common' as const };
  const titleStyle = TITLE_RARITY_STYLES[currentTitle.rarity];

  return (
    <div className={`relative overflow-hidden rounded-3xl ${isDark ? 'bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900 border border-violet-500/20' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border border-violet-200'}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-violet-500/20' : 'bg-violet-300/30'}`} />
        <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-200/30'}`} />
      </div>
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar with prestige ring */}
          <div className="relative">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-violet-600 to-purple-700' : 'bg-gradient-to-br from-violet-500 to-purple-600'} ring-4 ring-amber-400/50 shadow-lg shadow-violet-500/30`}>
              <span className="text-5xl">🥷</span>
            </div>
            {/* Level badge */}
            <div className={`absolute -bottom-1 -right-1 px-3 py-1 rounded-full text-sm font-bold ${isDark ? 'bg-amber-500 text-black' : 'bg-amber-500 text-white'} shadow-lg`}>
              Lv.{level}
            </div>
            {/* Rank indicator */}
            <div className={`absolute -top-1 -left-1 w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-white'} border-2 border-violet-400 shadow`}>
              <RankIcon size={16} className={rank.color} />
            </div>
          </div>
          
          {/* Character info */}
          <div className="flex-1 text-center md:text-left">
            {/* Name plate with decorative elements */}
            <div className="mb-3">
              {/* Name with glow effect */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative inline-block">
                  <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white' : 'text-slate-800'}`}>
                    Kage
                  </h2>
                  {isDark && <div className="absolute inset-0 blur-lg bg-gradient-to-r from-violet-500/30 to-purple-500/30 -z-10" />}
                </div>
                
                {/* Title badge - more prominent */}
                <div className="relative">
                  <button
                    onClick={() => setShowTitleSelector(!showTitleSelector)}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all shadow-lg ${
                      currentTitle.rarity === 'legendary' 
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20' 
                        : currentTitle.rarity === 'epic'
                        ? 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-500/50 shadow-purple-500/20'
                        : currentTitle.rarity === 'rare'
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/50 shadow-blue-500/20'
                        : `${titleStyle.bg} ${titleStyle.text} ${titleStyle.border}`
                    } hover:scale-105 hover:shadow-xl`}
                  >
                    <Scroll size={16} className="opacity-80" />
                    <span className="tracking-wide">{currentTitle.title}</span>
                    <ChevronDown size={14} className={`transition-transform ${showTitleSelector ? 'rotate-180' : ''}`} />
                  </button>
                
                {/* Title selector dropdown */}
                {showTitleSelector && (
                  <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl overflow-hidden shadow-2xl z-50 ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-slate-200'}`}>
                    <div className={`p-2 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400 bg-white/5' : 'text-slate-500 bg-slate-50'}`}>
                      Equip Title
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {unlockedTitles.length === 0 ? (
                        <p className={`p-3 text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                          Unlock achievements to earn titles!
                        </p>
                      ) : (
                        unlockedTitles.map((t) => {
                          const style = TITLE_RARITY_STYLES[t.rarity];
                          return (
                            <button
                              key={t.id}
                              onClick={() => { onTitleChange(t.id); setShowTitleSelector(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                equippedTitle === t.id
                                  ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                                  : isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
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
            <div className={`flex items-center justify-center md:justify-start gap-4 mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <RankIcon size={16} className={rank.color} />
                <span className={`text-sm font-medium ${rank.color}`}>{rank.name}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                <Flame size={14} className="text-orange-400" />
                <span className="text-sm font-medium text-orange-400">{userStats.currentStreak} day streak</span>
              </div>
            </div>
            
            {/* XP Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  Experience Points
                </span>
                <span className={`text-xs font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  {currentXP} / {xpToNextLevel} XP
                </span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-full transition-all duration-700 relative"
                  style={{ width: `${xpProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Next reward preview */}
            {nextReward && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <Gift size={14} />
                <span>Next Reward: <strong>{nextReward.name}</strong></span>
                <span className="opacity-70">({nextReward.xpNeeded} XP away)</span>
              </div>
            )}
          </div>
          
          {/* Stats summary - Enhanced */}
          <div className={`hidden md:flex flex-col gap-2 p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10' : 'bg-white/80 border border-slate-200'}`}>
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <Zap size={20} className="text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{currentXP.toLocaleString()}</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Total XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Target size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{userStats.totalTasksCompleted}</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Quests Completed</p>
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
  isDark,
  userStats,
  getTotalLevel,
}: {
  isDark: boolean;
  userStats: UserStats;
  getTotalLevel: () => number;
}) {
  // Define quest paths with milestones
  const questPaths = [
    {
      id: 'tasks',
      name: 'Task Mastery',
      icon: Target,
      color: 'violet',
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
      color: 'cyan',
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
    violet: { bg: 'bg-violet-500/10', progress: 'from-violet-500 to-purple-400', text: 'text-violet-400', icon: 'text-violet-400' },
    orange: { bg: 'bg-orange-500/10', progress: 'from-orange-500 to-amber-400', text: 'text-orange-400', icon: 'text-orange-400' },
    amber: { bg: 'bg-amber-500/10', progress: 'from-amber-500 to-yellow-400', text: 'text-amber-400', icon: 'text-amber-400' },
    cyan: { bg: 'bg-cyan-500/10', progress: 'from-cyan-500 to-blue-400', text: 'text-cyan-400', icon: 'text-cyan-400' },
  };

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
          <Compass size={20} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Quest Log
          </h2>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
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
              className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50 border border-slate-100'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                  <Icon size={18} className={colors.icon} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {path.name}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                    {completedMilestones.length}/{path.milestones.length} milestones
                  </p>
                </div>
                <span className={`text-lg font-bold ${colors.text}`}>
                  {path.current}
                </span>
              </div>

              {/* Progress bar */}
              <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div 
                  className={`h-full bg-gradient-to-r ${colors.progress} rounded-full transition-all duration-700`}
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
                            ? `bg-gradient-to-br ${colors.progress} text-white shadow-sm` 
                            : isCurrent
                              ? `${colors.bg} ${colors.text} ring-2 ring-current`
                              : isDark ? 'bg-white/10 text-gray-600' : 'bg-slate-200 text-slate-400'
                        }`}
                        title={milestone.name}
                      >
                        {isComplete ? '✓' : idx + 1}
                      </div>
                      {idx < path.milestones.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-0.5 ${isComplete ? `bg-gradient-to-r ${colors.progress}` : isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next milestone info */}
              {nextMilestone && (
                <p className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  <span className="font-medium">Next:</span> {nextMilestone.name} 
                  <span className={`ml-1 ${colors.text}`}>({nextMilestone.value - path.current} to go)</span>
                </p>
              )}
              {!nextMilestone && (
                <p className={`mt-3 text-xs font-medium ${colors.text}`}>
                  ✨ All milestones complete!
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ SEASON TEASER COMPONENT ============
function SeasonTeaser({ isDark }: { isDark: boolean }) {
  const daysRemaining = Math.ceil((CURRENT_SEASON.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-fuchsia-900/50 border border-purple-500/30' : 'bg-gradient-to-r from-indigo-100 via-purple-100 to-fuchsia-100 border border-purple-200'}`}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-fuchsia-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      
      <div className="relative p-5 flex items-center gap-4">
        {/* Season icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-200/50 border border-purple-300'}`}>
          <Sparkles size={28} className={isDark ? 'text-purple-300' : 'text-purple-600'} />
        </div>
        
        {/* Season info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
              Active Season
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-fuchsia-200 text-fuchsia-700'}`}>
              {daysRemaining} days left
            </span>
          </div>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {CURRENT_SEASON.name}
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {CURRENT_SEASON.description}
          </p>
        </div>
        
        {/* Seasonal badges preview */}
        <div className="hidden md:flex items-center gap-2">
          {CURRENT_SEASON.exclusiveBadges.slice(0, 3).map((_, idx) => (
            <div 
              key={idx}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/50 border border-purple-200'}`}
            >
              <Lock size={16} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
            </div>
          ))}
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            +{CURRENT_SEASON.exclusiveBadges.length} badges
          </span>
        </div>
      </div>
    </div>
  );
}

// ============ STREAK BONUS VISUALIZATION ============
function StreakBonusBanner({ isDark, streak }: { isDark: boolean; streak: number }) {
  const bonus = getStreakMultiplier(streak);
  const nextBonus = streak < 3 ? { days: 3, multiplier: '1.1x' } 
    : streak < 7 ? { days: 7, multiplier: '1.25x' }
    : streak < 14 ? { days: 14, multiplier: '1.5x' }
    : streak < 30 ? { days: 30, multiplier: '2x' }
    : null;

  if (streak === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-gradient-to-r from-orange-900/30 via-amber-900/20 to-yellow-900/30 border border-orange-500/30' : 'bg-gradient-to-r from-orange-100 via-amber-50 to-yellow-100 border border-orange-200'}`}>
      {/* Animated fire particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-orange-400 rounded-full opacity-60 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              bottom: '10%',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Fire icon with glow */}
          <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
            <Flame size={28} className="text-orange-400 animate-pulse" />
            {bonus.multiplier > 1 && (
              <div className="absolute inset-0 rounded-2xl animate-unlock-glow" style={{ boxShadow: '0 0 20px rgba(251, 146, 60, 0.4)' }} />
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${bonus.color}`}>{streak}</span>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Day Streak</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {nextBonus 
                ? `${nextBonus.days - streak} more days until ${nextBonus.multiplier} bonus!`
                : 'Maximum streak bonus active!'
              }
            </p>
          </div>
        </div>
        
        {/* Multiplier badge */}
        <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-200'}`}>
          <p className={`text-xs font-medium ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>XP Multiplier</p>
          <p className={`text-2xl font-black ${bonus.color}`}>{bonus.label}</p>
        </div>
      </div>
    </div>
  );
}

// ============ DAILY CHALLENGES COMPONENT ============
function DailyChallenges({ isDark, userStats }: { isDark: boolean; userStats: UserStats }) {
  const challenges = getTodaysChallenges();
  
  // Simple progress check (in a real app, this would be more sophisticated)
  const getProgress = (challenge: typeof DAILY_CHALLENGES[0]) => {
    switch (challenge.requirement.type) {
      case 'tasks_today':
        return Math.min(100, (userStats.totalTasksCompleted % 10) / challenge.requirement.value * 100);
      case 'maintain_streak':
        return userStats.currentStreak > 0 ? 100 : 0;
      default:
        return Math.random() > 0.5 ? 100 : Math.floor(Math.random() * 80);
    }
  };

  return (
    <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
            <Zap size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Daily Challenges</h2>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Resets at midnight</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
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
              className={`p-3 rounded-xl transition-all ${
                isComplete 
                  ? isDark ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                  : isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/5' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isComplete
                    ? isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
                    : isDark ? 'bg-white/5' : 'bg-slate-100'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Icon size={20} className={isDark ? 'text-gray-400' : 'text-slate-500'} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {challenge.name}
                    </p>
                    <span className={`text-xs font-bold ${isComplete ? 'text-emerald-400' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      +{challenge.xpReward} XP
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                    {challenge.description}
                  </p>
                  {!isComplete && (
                    <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
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
  isDark,
  onClick,
  isNew = false,
  prediction,
}: { 
  achievement: Achievement; 
  progress: number; 
  isDark: boolean;
  onClick: () => void;
  isNew?: boolean;
  prediction?: string | null;
}) {
  const isSecret = SECRET_ACHIEVEMENTS.has(achievement.id);
  const isUnlocked = achievement.isUnlocked;
  const showAsSecret = isSecret && !isUnlocked;
  
  const Icon = showAsSecret ? Sparkles : getAchievementIcon(achievement);
  const tier = getTier(achievement.xpReward) as AchievementTier;
  const tierStyles = getTierStyles(tier, isDark);

  return (
    <div 
      onClick={() => { onClick(); playSound('click'); }}
      className={`rarity-card rarity-${tier} ${isUnlocked ? 'rarity-unlocked' : 'rarity-locked'} relative w-4/5 mx-auto rounded-xl overflow-hidden cursor-pointer transition-all duration-300 aspect-square ${
        isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'
      } ${isUnlocked ? '' : 'opacity-80'} hover:-translate-y-1 hover:shadow-[0_24px_80px_-55px_rgba(0,0,0,0.85)] ${isNew ? 'animate-unlock-glow' : ''}`}
    >
      {/* Rarity glow + rim light */}
      {isUnlocked && (
        <>
          <div className={`absolute -inset-12 opacity-60 blur-3xl bg-gradient-to-br ${tierStyles.bg}`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.22),transparent_55%)] opacity-70" />
        </>
      )}
      
      <div className="relative z-10 h-full p-2 flex flex-col">
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-[0.14em] font-semibold ${
            isUnlocked ? tierStyles.badge : (isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-600')
          }`}>
            {tier}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-[0.14em] font-semibold ${
            isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {achievement.type}
          </span>
        </div>

        {/* Center badge */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`relative w-[80px] h-[80px] rounded-[1.35rem] flex items-center justify-center border ${
            isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          } ${showAsSecret ? 'animate-pulse' : ''}`}>
            {isUnlocked && <div className={`absolute inset-0 rounded-[1.35rem] opacity-50 bg-gradient-to-br ${tierStyles.bg}`} />}
            {showAsSecret ? (
              <span className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-500'}`}>?</span>
            ) : isUnlocked ? (
              <Icon size={46} className={`${tierStyles.icon} relative drop-shadow`} />
            ) : (
              <Lock size={38} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
            )}
            <div className="absolute inset-0 rounded-[1.35rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)]" />
          </div>
        </div>

        {/* Bottom info */}
        <div>
          <h3 className={`font-bold text-sm leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {showAsSecret ? '???' : achievement.name}
          </h3>

          <div className="mt-1 flex items-center justify-between">
            {isUnlocked ? (
              <div className={`flex items-center gap-1.5 text-xs font-bold ${tierStyles.icon}`}>
                <Zap size={11} className="opacity-90" />
                +{achievement.xpReward}
              </div>
            ) : showAsSecret ? (
              <div className={`text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                ???
              </div>
            ) : (
              <div className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                {progress}%
              </div>
            )}
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {isUnlocked ? 'Earned' : showAsSecret ? 'Hidden' : 'Locked'}
            </div>
          </div>

          {!isUnlocked && !showAsSecret && (
            <div className="mt-1.5">
              <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {prediction && (
                <p className={`mt-1 text-xs truncate ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
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
  isDark, 
  onClose 
}: { 
  achievement: Achievement; 
  progress: number; 
  lore: string;
  objective: QuestObjective;
  isDark: boolean; 
  onClose: () => void;
}) {
  const Icon = getAchievementIcon(achievement);
  const tier = getTier(achievement.xpReward);
  const tierStyles = getTierStyles(tier, isDark);
  const isUnlocked = achievement.isUnlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-slate-900/30'}`}
        onClick={onClose}
      />
      <div className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${
        isDark ? 'bg-[#12121a]' : 'bg-white'
      }`}>
        {/* Header with gradient */}
        <div className={`relative p-4 sm:p-8 ${isUnlocked ? `bg-gradient-to-br ${tierStyles.bg}` : ''}`}>
          {/* Close button */}
          <button 
            aria-label="Close"
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>

          {/* Icon */}
          <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-4 ${
            isUnlocked
              ? `${isDark ? 'bg-white/10' : 'bg-white/80'} ${tierStyles.ring}`
              : isDark ? 'bg-white/5' : 'bg-slate-100'
          }`}>
            {isUnlocked ? (
              <Icon size={48} className={tierStyles.icon} />
            ) : (
              <Lock size={40} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
            )}
          </div>

          {/* Badge */}
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {achievement.name}
            </h2>
            <p className={`text-sm italic ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {lore}
            </p>
            {isUnlocked && (
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${tierStyles.badge}`}>
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
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Quest
            </h3>
            <p className={`text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {achievement.description}
            </p>
            <p className={`mt-2 text-sm ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              Objective: <span className="font-semibold">{objective.current}</span>/<span className="font-semibold">{objective.target}</span>
            </p>
          </div>

          {/* Progress */}
          {!isUnlocked && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Progress
                </h3>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {progress}%
                </span>
              </div>
              <div className={`h-4 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                    progress >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                    'bg-gradient-to-r from-violet-500 to-purple-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="text-center">
              <p className={`text-2xl font-bold ${tierStyles.icon}`}>
                +{achievement.xpReward}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>XP Reward</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold capitalize ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {achievement.type}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Category</p>
            </div>
          </div>

          {/* Unlock info */}
          {isUnlocked && achievement.unlockedAt && (
            <div className={`flex items-center justify-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    achievements, 
    userStats, 
    getUnlockedAchievements, 
    getLockedAchievements,
    getAchievementProgress,
    getTotalLevel,
    getTitle,
    getTotalXP,
  } = useGamification();
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [typeFilter, setTypeFilter] = useState<AchievementType | 'all'>('all');
  const [setFilter, setSetFilter] = useState<AchievementSetId | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
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
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return new Set(
      achievements
        .filter(a => a.isUnlocked && a.unlockedAt && new Date(a.unlockedAt).getTime() > dayAgo)
        .map(a => a.id)
    );
  }, [achievements]);

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
        isDark={isDark}
        level={getTotalLevel()}
        title={getTitle()}
        currentXP={getTotalXP()}
        xpToNextLevel={getTotalLevel() * 100}
        equippedTitle={equippedTitle}
        unlockedTitles={unlockedTitles}
        onTitleChange={setEquippedTitle}
        nextReward={nextReward}
        userStats={userStats}
      />

      {/* Confetti Effect */}
      <Confetti active={showConfetti} />

      {/* Tab navigation */}
      <div className="flex items-center justify-between">
        <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          {([
            { id: 'overview' as const, label: 'Overview' },
            { id: 'all' as const, label: 'All Achievements' },
            { id: 'quests' as const, label: 'Quests & Missions' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === id
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleSound}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            isDark
              ? soundEnabled ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-gray-500'
              : soundEnabled ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────── */}
      {activeTab === 'overview' && <>
        {/* Daily Challenges */}
        <DailyChallenges isDark={isDark} userStats={userStats} />

        {/* Active Missions */}
        {closestToUnlock.length > 0 && (
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'}`}>
            <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <MapPin className="w-4 h-4" /> Active Missions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {closestToUnlock.map(({ achievement, progress }) => {
                const Icon = getAchievementIcon(achievement);
                return (
                  <div key={achievement.id} onClick={() => setSelectedAchievement(achievement)} className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <Icon size={16} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{achievement.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{progress}%</span>
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
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20' : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200'}`}>
            <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <Crown className="w-4 h-4" /> Hall of Glory
            </h2>
            <div className="flex items-center justify-center gap-8">
              {unlockedAchievements.sort((a, b) => b.xpReward - a.xpReward).slice(0, 3).map((achievement, index) => {
                const Icon = getAchievementIcon(achievement);
                const tier = getTier(achievement.xpReward);
                const tierStyles = getTierStyles(tier, isDark);
                return (
                  <div key={achievement.id} className={`text-center ${index === 0 ? 'scale-110 -mt-2' : ''}`} onClick={() => setSelectedAchievement(achievement)}>
                    <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${isDark ? 'bg-white/10' : 'bg-white/80'} ${tierStyles.ring} ${tierStyles.glow}`}>
                      <Icon size={28} className={tierStyles.icon} />
                    </div>
                    <p className={`mt-2 text-xs font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{achievement.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact stats + rarity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'}`}>
            <div className={`text-2xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{unlockedAchievements.length}/{achievements.length}</div>
            <p className={`text-xs ${isDark ? 'text-violet-400/70' : 'text-violet-600/70'}`}>Discovered</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            <div className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{totalXPFromAchievements.toLocaleString()}</div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP Claimed</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{potentialXP.toLocaleString()}</div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP Unclaimed</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{userStats.currentStreak}</div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Day Streak</p>
          </div>
        </div>

        {/* Streak Bonus */}
        <StreakBonusBanner isDark={isDark} streak={userStats.currentStreak} />
      </>}

      {/* ── QUESTS TAB ──────────────────────────────── */}
      {activeTab === 'quests' && <>
        <SeasonTeaser isDark={isDark} />
        <QuestLogRoadmap isDark={isDark} userStats={userStats} getTotalLevel={getTotalLevel} />
        {/* Guild Collections */}
        <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>Guild Collections</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {setStats.map((set) => {
              const SetIcon = set.icon;
              const isActive = setFilter === set.setId;
              return (
                <button key={set.setId} onClick={() => setSetFilter(isActive ? 'all' : set.setId)} className={`min-w-[200px] text-left p-3 rounded-xl transition-all ${isActive ? isDark ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-violet-50 border border-violet-200' : isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-200 hover:bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <SetIcon size={16} className={isDark ? 'text-gray-200' : 'text-slate-700'} />
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{set.label}</span>
                    <span className={`text-xs ml-auto font-bold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{set.done}/{set.total}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700" style={{ width: `${set.percent}%` }} />
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
        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <h2 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>By Rarity</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(['legendary', 'platinum', 'gold', 'silver', 'bronze'] as const).map(tier => {
              const tierStyles = getTierStyles(tier, isDark);
              const total = achievements.filter(a => getTier(a.xpReward) === tier).length;
              const unlocked = tierCounts[tier];
              return (
                <div key={tier} className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-1 ${unlocked > 0 ? `bg-gradient-to-br ${tierStyles.bg} ${tierStyles.ring}` : isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    {tier === 'legendary' && <Gem size={20} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                    {tier === 'platinum' && <Star size={20} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                    {tier === 'gold' && <Medal size={20} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                    {tier === 'silver' && <Award size={20} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                    {tier === 'bronze' && <Shield size={20} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                  </div>
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{unlocked}/{total}</p>
                  <p className={`text-xs capitalize ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{tier}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters — compact */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['all', 'unlocked', 'locked'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${statusFilter === status ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>
                {status}
              </button>
            ))}
          </div>
          <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['all', 'milestone', 'streak', 'mastery', 'special'] as const).map((type) => (
              <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${typeFilter === type ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}>
                {type}
              </button>
            ))}
          </div>
          <span className={`text-xs ml-auto ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{sortedAchievements.length} achievements</span>
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
              isDark={isDark}
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
        <div className={`rounded-2xl p-12 text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
          <Trophy className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>No achievements match</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Try adjusting filters.</p>
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
        isDark={isDark}
        onClose={() => setSelectedAchievement(null)}
      />
    )}
  </>
  );
}
