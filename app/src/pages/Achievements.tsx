import { useState } from 'react';
import { Trophy, Lock, Star, Flame, Zap, Target, Award, Crown, Medal, CheckCircle2, TrendingUp, Sparkles, Calendar, Clock, Sunrise, Moon, Brain, Gift, X, ChevronRight, Gem, Shield, Swords, BookOpen, Heart, Rocket } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import type { Achievement, AchievementType } from '../types';

// Achievement tier based on XP reward
const getTier = (xpReward: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary' => {
  if (xpReward >= 1000) return 'legendary';
  if (xpReward >= 500) return 'platinum';
  if (xpReward >= 250) return 'gold';
  if (xpReward >= 100) return 'silver';
  return 'bronze';
};

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
    'day-planner': Calendar,
    'organized-mind': Brain,
    'master-planner': Target,
    'creator': BookOpen,
    'task-architect': Award,
    'prolific-planner': Sparkles,
    'focus-mode': Target,
    'daily-driver': Rocket,
    'focus-champion': Crown,
    'productive-day': Star,
    'productivity-streak': TrendingUp,
    'productivity-machine': Zap,
    'perfect-day': Gem,
    'perfectionist': Sparkles,
    'flawless-execution': Crown,
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
  const tier = getTier(achievement.xpReward);
  const tierStyles = getTierStyles(tier, isDark);
  const isUnlocked = achievement.isUnlocked;

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer group ${
        isUnlocked 
          ? `bg-gradient-to-br ${tierStyles.bg} ${tierStyles.border} ${tierStyles.glow} ${tierStyles.ring}` 
          : isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
      } ${isUnlocked ? 'hover:scale-[1.02] hover:-translate-y-1' : 'opacity-60 hover:opacity-80'}`}
    >
      {/* Animated shine effect for unlocked */}
      {isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      )}
      
      <div className="p-5 relative">
        {/* Top row: Icon + Tier Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${
            isUnlocked
              ? isDark ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/80'
              : isDark ? 'bg-white/5' : 'bg-slate-100'
          }`}>
            {isUnlocked ? (
              <>
                <Icon size={32} className={tierStyles.icon} />
                {/* Tier indicator dot */}
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${tierStyles.badge} flex items-center justify-center`}>
                  {tier === 'legendary' && <Gem size={10} />}
                  {tier === 'platinum' && <Star size={10} />}
                </div>
              </>
            ) : (
              <Lock size={28} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
            )}
          </div>
          
          {/* Status / Progress Badge */}
          {isUnlocked ? (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${tierStyles.badge}`}>
              <CheckCircle2 size={14} />
              <span className="uppercase tracking-wide">{tier}</span>
            </div>
          ) : (
            <div className={`relative px-3 py-1.5 rounded-full text-xs font-bold ${
              isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-600'
            }`}>
              <span>{progress}%</span>
            </div>
          )}
        </div>
        
        {/* Achievement Name */}
        <h3 className={`font-bold text-lg mb-1 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          <span className="text-xl">{achievement.icon}</span>
          {achievement.name}
        </h3>
        
        {/* Description */}
        <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          {achievement.description}
        </p>
        
        {/* Progress bar for locked achievements */}
        {!isUnlocked && (
          <div className="mb-4">
            <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  progress >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                  progress >= 25 ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
                  'bg-gradient-to-r from-slate-500 to-slate-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {progress >= 80 ? '🔥 Almost there!' : progress >= 50 ? '💪 Halfway!' : progress >= 25 ? '🚀 Good progress' : 'Keep going!'}
            </p>
          </div>
        )}
        
        {/* Bottom row: Type + XP */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${
            isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {achievement.type}
          </span>
          <div className={`flex items-center space-x-1.5 font-bold ${
            tier === 'legendary' || tier === 'platinum' ? tierStyles.icon : isDark ? 'text-amber-400' : 'text-amber-500'
          }`}>
            <Zap size={16} className="animate-pulse" />
            <span>+{achievement.xpReward} XP</span>
          </div>
        </div>
        
        {/* Unlock date */}
        {isUnlocked && achievement.unlockedAt && (
          <p className={`text-xs mt-3 flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            <Clock size={12} />
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// Achievement Detail Modal
function AchievementModal({ 
  achievement, 
  progress, 
  isDark, 
  onClose 
}: { 
  achievement: Achievement; 
  progress: number; 
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
            <span className="text-4xl mb-2 block">{achievement.icon}</span>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {achievement.name}
            </h2>
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
              How to Unlock
            </h3>
            <p className={`text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {achievement.description}
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
  
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [typeFilter, setTypeFilter] = useState<AchievementType | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const unlockedAchievements = getUnlockedAchievements();
  const lockedAchievements = getLockedAchievements();
  
  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    const statusMatch = filter === 'all' || 
      (filter === 'unlocked' && a.isUnlocked) || 
      (filter === 'locked' && !a.isUnlocked);
    const typeMatch = typeFilter === 'all' || a.type === typeFilter;
    return statusMatch && typeMatch;
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

  return (
    <div className="space-y-8">
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
              <div 
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                  isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{achievement.icon}</span>
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
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`p-4 rounded-2xl flex flex-wrap items-center gap-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status:</span>
          <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['all', 'unlocked', 'locked'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all ${
                  filter === status
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          progress={getAchievementProgress(selectedAchievement)}
          isDark={isDark}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}
