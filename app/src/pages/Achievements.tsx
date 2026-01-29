import { useMemo, useState } from 'react';
import { Trophy, Lock, Star, Flame, Zap, Target, Award, Crown, Medal, CheckCircle2, TrendingUp, Sparkles, Calendar, Clock, Sunrise, Moon, Brain, Gift, X, ChevronRight, Gem, Shield, Swords, BookOpen, Heart, Rocket } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import type { Achievement, AchievementType, UserStats } from '../types';

// Achievement tier based on XP reward
const getTier = (xpReward: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary' => {
  if (xpReward >= 1000) return 'legendary';
  if (xpReward >= 500) return 'platinum';
  if (xpReward >= 250) return 'gold';
  if (xpReward >= 100) return 'silver';
  return 'bronze';
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

const ACHIEVEMENT_LORE: Partial<Record<string, string>> = {
  'first-blood': 'A single strike. A new path.',
  'getting-started': 'Momentum begins with showing up.',
  'task-warrior': 'Steel your focus. Finish what you start.',
  'centurion': 'Repetition is power.',
  'task-master': 'Mastery is earned in silence.',

  'weekly-warrior': 'Seven days. No excuses.',
  'month-warrior': 'You don’t rely on motivation.',
  'iron-discipline': 'Routine forged into armor.',
  'discipline-legend': 'You are the system.',
  'legendary-dedication': 'A hundred dawns. Unbroken.',

  'day-planner': 'Clarity is a weapon.',
  'master-planner': 'Your days move on rails.',
  'planner-architect': 'Your future has blueprints.',

  'productive-day': 'Output with purpose.',
  'productivity-machine': 'Efficiency is your baseline.',
  'productive-legend': 'Relentless. Repeatable.',
  'perfect-month': 'Flawless at scale.',

  'early-bird': 'Win before the world wakes.',
  'night-owl': 'Quiet hours. Sharp focus.',
};

function getAchievementSetId(achievementId: string): AchievementSetId | null {
  for (const [setId, set] of Object.entries(ACHIEVEMENT_SETS) as Array<[AchievementSetId, (typeof ACHIEVEMENT_SETS)[AchievementSetId]]>) {
    if (set.ids.includes(achievementId)) return setId;
  }
  return null;
}

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

// Category info
const categoryInfo: Record<string, { label: string; icon: typeof Star; color: string; description: string }> = {
  milestone: { 
    label: 'Milestones', 
    icon: Trophy, 
    color: 'amber',
    description: 'Achievements for completing tasks and reaching goals'
  },
  streak: { 
    label: 'Streaks', 
    icon: Flame, 
    color: 'orange',
    description: 'Rewards for maintaining consistent daily activity'
  },
  mastery: { 
    label: 'Mastery', 
    icon: Crown, 
    color: 'violet',
    description: 'Level up and become a productivity master'
  },
  special: { 
    label: 'Special', 
    icon: Sparkles, 
    color: 'emerald',
    description: 'Unique achievements for special accomplishments'
  },
};

// Enhanced Achievement Card
function AchievementCard({ 
  achievement, 
  progress, 
  isDark,
  onClick 
}: { 
  achievement: Achievement; 
  progress: number; 
  isDark: boolean;
  onClick: () => void;
}) {
  const Icon = getAchievementIcon(achievement);
  const tier = getTier(achievement.xpReward) as AchievementTier;
  const tierStyles = getTierStyles(tier, isDark);
  const isUnlocked = achievement.isUnlocked;

  return (
    <div 
      onClick={onClick}
      className={`rarity-card rarity-${tier} ${isUnlocked ? 'rarity-unlocked' : 'rarity-locked'} relative w-4/5 mx-auto rounded-xl overflow-hidden cursor-pointer transition-all duration-300 aspect-square ${
        isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'
      } ${isUnlocked ? '' : 'opacity-80'} hover:-translate-y-1 hover:shadow-[0_24px_80px_-55px_rgba(0,0,0,0.85)]`}
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
          <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-[0.14em] font-semibold ${
            isUnlocked ? tierStyles.badge : (isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-600')
          }`}>
            {tier}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-[0.14em] font-semibold ${
            isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {achievement.type}
          </span>
        </div>

        {/* Center badge */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`relative w-[80px] h-[80px] rounded-[1.35rem] flex items-center justify-center border ${
            isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            {isUnlocked && <div className={`absolute inset-0 rounded-[1.35rem] opacity-50 bg-gradient-to-br ${tierStyles.bg}`} />}
            {isUnlocked ? (
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
            {achievement.name}
          </h3>

          <div className="mt-1 flex items-center justify-between">
            {isUnlocked ? (
              <div className={`flex items-center gap-1.5 text-[11px] font-bold ${tierStyles.icon}`}>
                <Zap size={11} className="opacity-90" />
                +{achievement.xpReward}
              </div>
            ) : (
              <div className={`text-[11px] font-bold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                {progress}%
              </div>
            )}
            <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{isUnlocked ? 'Earned' : 'Locked'}</div>
          </div>

          {!isUnlocked && (
            <div className="mt-1.5">
              <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
        <div className={`relative p-8 ${isUnlocked ? `bg-gradient-to-br ${tierStyles.bg}` : ''}`}>
          {/* Close button */}
          <button 
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

  const unlockedAchievements = getUnlockedAchievements();
  const lockedAchievements = getLockedAchievements();

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

  // Count by type
  const typeCounts = {
    milestone: unlockedAchievements.filter(a => a.type === 'milestone').length,
    streak: unlockedAchievements.filter(a => a.type === 'streak').length,
    mastery: unlockedAchievements.filter(a => a.type === 'mastery').length,
    special: unlockedAchievements.filter(a => a.type === 'special').length,
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

  return (
  <>
    <div className="space-y-8 achievements-ambient">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <Trophy className="text-amber-500" />
            Achievements
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Collect badges, earn XP, and track your productivity journey
          </p>
        </div>
        <div className={`text-right ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <p className="text-sm">Total XP Earned</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>
            {getTotalXP().toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Trophy Showcase - Top 3 Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className={`p-6 rounded-3xl ${isDark ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20' : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200'}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <Crown className="w-5 h-5" />
            Trophy Showcase
          </h2>
          <div className="flex items-center justify-center gap-8">
            {unlockedAchievements
              .sort((a, b) => b.xpReward - a.xpReward)
              .slice(0, 3)
              .map((achievement, index) => {
                const Icon = getAchievementIcon(achievement);
                const tier = getTier(achievement.xpReward);
                const tierStyles = getTierStyles(tier, isDark);
                return (
                  <div 
                    key={achievement.id}
                    className={`text-center ${index === 0 ? 'scale-125 -mt-4' : ''}`}
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                      isDark ? 'bg-white/10' : 'bg-white/80'
                    } ${tierStyles.ring} ${tierStyles.glow}`}>
                      <Icon size={36} className={tierStyles.icon} />
                    </div>
                    <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {achievement.name}
                    </p>
                    <p className={`text-xs ${tierStyles.icon}`}>+{achievement.xpReward} XP</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Unlocked */}
        <div className={`col-span-2 p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30' : 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <Trophy className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className={`text-4xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
              {unlockedAchievements.length}
            </span>
          </div>
          <p className={`text-sm ${isDark ? 'text-violet-400/70' : 'text-violet-600/70'}`}>
            of {achievements.length} Unlocked
          </p>
          <div className={`mt-3 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-violet-200'}`}>
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${(unlockedAchievements.length / achievements.length) * 100}%` }}
            />
          </div>
        </div>

        {/* XP from Badges */}
        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <Zap className={`w-6 h-6 mb-2 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {totalXPFromAchievements.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP Earned</p>
        </div>

        {/* Potential XP */}
        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <Gift className={`w-6 h-6 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {potentialXP.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP Available</p>
        </div>

        {/* Streak */}
        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <Flame className={`w-6 h-6 mb-2 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
          <p className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
            {userStats.currentStreak}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Day Streak</p>
        </div>

        {/* Level */}
        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <Crown className={`w-6 h-6 mb-2 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Lv.{getTotalLevel()}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{getTitle()}</p>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className={`p-6 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
        <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Badge Collection by Tier
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {(['legendary', 'platinum', 'gold', 'silver', 'bronze'] as const).map(tier => {
            const tierStyles = getTierStyles(tier, isDark);
            const total = achievements.filter(a => getTier(a.xpReward) === tier).length;
            const unlocked = tierCounts[tier];
            return (
              <div key={tier} className="text-center">
                <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                  unlocked > 0 ? `bg-gradient-to-br ${tierStyles.bg} ${tierStyles.ring}` : isDark ? 'bg-white/5' : 'bg-slate-100'
                }`}>
                  {tier === 'legendary' && <Gem size={24} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                  {tier === 'platinum' && <Star size={24} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                  {tier === 'gold' && <Medal size={24} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                  {tier === 'silver' && <Award size={24} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                  {tier === 'bronze' && <Shield size={24} className={unlocked > 0 ? tierStyles.icon : isDark ? 'text-gray-600' : 'text-slate-400'} />}
                </div>
                <p className={`text-sm font-bold capitalize ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {unlocked}/{total}
                </p>
                <p className={`text-xs capitalize ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{tier}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Almost There Section */}
      {closestToUnlock.length > 0 && (
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Rocket className="w-5 h-5" />
            Almost There!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {closestToUnlock.map(({ achievement, progress }) => (
              (() => {
                const Icon = getAchievementIcon(achievement);
                return (
              <div 
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                  isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <Icon size={18} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {achievement.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={isDark ? 'text-gray-600' : 'text-slate-400'} />
                </div>
              </div>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-end justify-between gap-6 mb-3">
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
              Collections
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Complete sets for prestige.
            </p>
          </div>
          <button
            onClick={() => setSetFilter('all')}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
              setFilter === 'all'
                ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            All Sets
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {setStats.map((set) => {
            const SetIcon = set.icon;
            const isActive = setFilter === set.setId;
            return (
              <button
                key={set.setId}
                onClick={() => setSetFilter(isActive ? 'all' : set.setId)}
                className={`min-w-[220px] text-left p-3 rounded-xl transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-violet-500/20 border border-violet-500/30'
                      : 'bg-violet-50 border border-violet-200'
                    : isDark
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'bg-slate-50 border border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'
                    }`}>
                      <SetIcon size={18} className={isDark ? 'text-gray-200' : 'text-slate-700'} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{set.label}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{set.done}/{set.total}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{set.percent}%</span>
                </div>
                <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700"
                    style={{ width: `${set.percent}%` }}
                  />
                </div>
                <p className={`mt-2 text-xs line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{set.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-2xl flex flex-wrap items-center gap-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status:</span>
          <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['all', 'unlocked', 'locked'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all ${
                  statusFilter === status
                    ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {status} {status === 'unlocked' ? `(${unlockedAchievements.length})` : status === 'locked' ? `(${lockedAchievements.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Type:</span>
          <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['all', 'milestone', 'streak', 'mastery', 'special'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all ${
                  typeFilter === type
                    ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            progress={getAchievementProgress(achievement)}
            isDark={isDark}
            onClick={() => setSelectedAchievement(achievement)}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedAchievements.length === 0 && (
        <div className={`rounded-3xl p-16 text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
            <Trophy className={`w-10 h-10 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            No achievements found
          </h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Try adjusting your filters to see more achievements.
          </p>
        </div>
      )}

    </div>

    {/* Achievement Detail Modal - Outside achievements-ambient to fix fixed positioning */}
    {selectedAchievement && (
      <AchievementModal
        achievement={selectedAchievement}
        progress={getAchievementProgress(selectedAchievement)}
        objective={getQuestObjective(selectedAchievement, userStats, getTotalLevel, getTotalXP)}
        lore={ACHIEVEMENT_LORE[selectedAchievement.id] || 'A quiet victory, forged by repetition.'}
        isDark={isDark}
        onClose={() => setSelectedAchievement(null)}
      />
    )}
  </>
  );
}
