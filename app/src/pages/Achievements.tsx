import { useState } from 'react';
import { Trophy, Lock, Star, Flame, Zap, Target, Award, Crown, Medal, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import type { Achievement, AchievementType } from '../types';

// Map achievement icons
const getAchievementIcon = (iconName: string) => {
  const icons: Record<string, typeof Star> = {
    '⭐': Star,
    '🚀': Zap,
    '⚔️': Target,
    '🏛️': Award,
    '👑': Crown,
    '🔥': Flame,
    '💪': TrendingUp,
    '🏆': Trophy,
    '🌟': Sparkles,
    '🎯': Target,
    '💥': Zap,
    '🎖️': Medal,
    '📈': TrendingUp,
    '📊': TrendingUp,
    '🏅': Medal,
    '✨': Sparkles,
    '💎': Award,
    '🌈': Sparkles,
  };
  return icons[iconName] || Star;
};

// Get color for achievement type
const getTypeColor = (type: AchievementType, isDark: boolean) => {
  switch (type) {
    case 'milestone':
      return isDark ? 'from-amber-500/20 to-yellow-500/20 border-amber-500/30' : 'from-amber-50 to-yellow-50 border-amber-200';
    case 'streak':
      return isDark ? 'from-orange-500/20 to-red-500/20 border-orange-500/30' : 'from-orange-50 to-red-50 border-orange-200';
    case 'mastery':
      return isDark ? 'from-violet-500/20 to-purple-500/20 border-violet-500/30' : 'from-violet-50 to-purple-50 border-violet-200';
    case 'special':
      return isDark ? 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' : 'from-emerald-50 to-teal-50 border-emerald-200';
    default:
      return isDark ? 'from-slate-500/20 to-gray-500/20 border-slate-500/30' : 'from-slate-50 to-gray-50 border-slate-200';
  }
};

const getIconColor = (type: AchievementType, isDark: boolean) => {
  switch (type) {
    case 'milestone':
      return isDark ? 'text-amber-400' : 'text-amber-500';
    case 'streak':
      return isDark ? 'text-orange-400' : 'text-orange-500';
    case 'mastery':
      return isDark ? 'text-violet-400' : 'text-violet-500';
    case 'special':
      return isDark ? 'text-emerald-400' : 'text-emerald-500';
    default:
      return isDark ? 'text-slate-400' : 'text-slate-500';
  }
};

function AchievementCard({ achievement, progress, isDark }: { achievement: Achievement; progress: number; isDark: boolean }) {
  const Icon = getAchievementIcon(achievement.icon);
  const typeColor = getTypeColor(achievement.type, isDark);
  const iconColor = getIconColor(achievement.type, isDark);
  const isUnlocked = achievement.isUnlocked;

  return (
    <div 
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isUnlocked 
          ? `bg-gradient-to-br ${typeColor}` 
          : isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
      } ${isUnlocked ? 'hover:scale-[1.02]' : 'opacity-70 hover:opacity-90'}`}
    >
      {/* Shine effect for unlocked */}
      {isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
      )}
      
      <div className="p-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isUnlocked
              ? isDark ? 'bg-white/10' : 'bg-white/60'
              : isDark ? 'bg-white/5' : 'bg-slate-100'
          }`}>
            {isUnlocked ? (
              <Icon size={28} className={iconColor} />
            ) : (
              <Lock size={24} className={isDark ? 'text-gray-600' : 'text-slate-400'} />
            )}
          </div>
          
          {isUnlocked ? (
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <CheckCircle2 size={14} />
              <span className="text-xs font-medium">Unlocked</span>
            </div>
          ) : (
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
            }`}>
              {progress}%
            </div>
          )}
        </div>
        
        <h3 className={`font-semibold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {achievement.name}
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          {achievement.description}
        </p>
        
        {/* Progress bar for locked achievements */}
        {!isUnlocked && (
          <div className="mb-3">
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  progress >= 75 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                  progress >= 50 ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
                  'bg-gradient-to-r from-slate-500 to-slate-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
            isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {achievement.type}
          </span>
          <span className={`text-sm font-medium flex items-center space-x-1 ${
            isDark ? 'text-amber-400' : 'text-amber-500'
          }`}>
            <Zap size={14} />
            <span>+{achievement.xpReward} XP</span>
          </span>
        </div>
        
        {isUnlocked && achievement.unlockedAt && (
          <p className={`text-xs mt-3 pt-3 border-t ${isDark ? 'text-gray-500 border-white/10' : 'text-slate-400 border-slate-200'}`}>
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
  } = useGamification();
  
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [typeFilter, setTypeFilter] = useState<AchievementType | 'all'>('all');

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

  // Sort: unlocked first, then by progress
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.isUnlocked && !b.isUnlocked) return -1;
    if (!a.isUnlocked && b.isUnlocked) return 1;
    return getAchievementProgress(b) - getAchievementProgress(a);
  });

  const totalXPFromAchievements = unlockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Achievements</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            Unlock badges and earn rewards for your progress
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Achievements */}
        <div className={`card rounded-2xl p-5 ${isDark ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Trophy className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {unlockedAchievements.length}/{achievements.length}
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>Achievements Unlocked</p>
        </div>

        {/* XP From Achievements */}
        <div className="card card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <Zap className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {totalXPFromAchievements.toLocaleString()}
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP from Badges</p>
        </div>

        {/* Current Streak */}
        <div className="card card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
              <Flame className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {userStats.currentStreak}
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Day Streak</p>
        </div>

        {/* Level & Title */}
        <div className="card card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
              <Crown className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Lv. {getTotalLevel()}
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{getTitle()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Status:</span>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'unlocked', 'locked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${
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
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Type:</span>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {(['all', 'milestone', 'streak', 'mastery'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${
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
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            progress={getAchievementProgress(achievement)}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedAchievements.length === 0 && (
        <div className="card rounded-2xl p-12 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <Trophy className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            No achievements found
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Try adjusting your filters to see more achievements.
          </p>
        </div>
      )}
    </div>
  );
}
