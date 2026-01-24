import { useMemo } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { useTheme } from '../../context/ThemeContext';
import type { SkillTree } from '../../types';

// Level milestones for visual display
const LEVEL_MILESTONES = [1, 5, 10, 25, 50, 100];

function SkillNode({ skill, isDark, index }: { skill: SkillTree; isDark: boolean; index: number }) {
  const xpToNextLevel = 100;
  const currentLevelXP = skill.currentXP % xpToNextLevel;
  const progress = (currentLevelXP / xpToNextLevel) * 100;
  
  // Calculate ring progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  // Get next milestone
  const nextMilestone = LEVEL_MILESTONES.find(m => m > skill.level) || skill.level + 10;
  const milestoneProgress = Math.min(100, (skill.level / nextMilestone) * 100);

  return (
    <div 
      className="relative group"
      style={{ 
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
        style={{ backgroundColor: skill.color }}
      />
      
      {/* Main skill node */}
      <div 
        className={`relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 hover:scale-105 ${
          isDark 
            ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-white/20' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-slate-300'
        }`}
        style={{ 
          boxShadow: isDark 
            ? `0 0 30px ${skill.color}15, 0 4px 20px rgba(0,0,0,0.3)` 
            : `0 0 30px ${skill.color}10, 0 4px 20px rgba(0,0,0,0.05)`,
        }}
      >
        {/* Circular progress ring */}
        <div className="relative w-28 h-28 mb-4">
          {/* Background ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              strokeWidth="8"
              fill="none"
            />
            {/* Progress ring */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={skill.color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${skill.color}80)`,
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">{skill.icon}</span>
            <span 
              className="text-lg font-bold"
              style={{ color: skill.color }}
            >
              Lv.{skill.level}
            </span>
          </div>
        </div>

        {/* Skill name */}
        <h3 className={`font-semibold text-center mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {skill.name}
        </h3>
        
        {/* XP Progress */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs">
            <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
              {currentLevelXP} / {xpToNextLevel} XP
            </span>
            <span style={{ color: skill.color }} className="font-medium">
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* XP bar */}
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${skill.color}, ${skill.color}cc)`,
                boxShadow: `0 0 8px ${skill.color}60`,
              }}
            />
          </div>
        </div>

        {/* Total XP */}
        <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          Total: {skill.currentXP.toLocaleString()} XP
        </p>

        {/* Milestone indicator */}
        <div className={`mt-3 px-3 py-1.5 rounded-full text-xs font-medium ${
          isDark ? 'bg-white/5' : 'bg-slate-100'
        }`}>
          <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
            Next milestone: Lv.{nextMilestone}
          </span>
        </div>
      </div>
    </div>
  );
}

// Central hub showing total level
function CentralHub({ isDark }: { isDark: boolean }) {
  const { getTotalLevel, getTotalXP, getTitle, userStats, getStreakMultiplier } = useGamification();
  const level = getTotalLevel();
  const totalXP = getTotalXP();
  const title = getTitle();
  const multiplier = getStreakMultiplier();

  return (
    <div className={`relative p-8 rounded-3xl border-2 ${
      isDark 
        ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 border-violet-500/20' 
        : 'bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-violet-200'
    }`}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <div 
          className="absolute -inset-1 opacity-30"
          style={{
            background: 'conic-gradient(from 0deg, #8B5CF6, #EC4899, #F59E0B, #10B981, #3B82F6, #8B5CF6)',
            filter: 'blur(40px)',
            animation: 'spin 20s linear infinite',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Level badge */}
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 ${
          isDark ? 'bg-violet-500/20' : 'bg-violet-100'
        }`}>
          <span className={`text-4xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
            {level}
          </span>
        </div>

        <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h2>
        
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          Total XP: {totalXP.toLocaleString()}
        </p>

        {/* Streak multiplier */}
        {multiplier > 1 && (
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
          }`}>
            🔥 {multiplier}x Streak Bonus Active!
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 w-full">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {userStats.dailyLoginStreak}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Day Streak
            </div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {userStats.totalDaysActive}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Days Active
            </div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {userStats.productiveDays}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              Productive
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkillTreeViz() {
  const { theme } = useTheme();
  const { skillTrees } = useGamification();
  const isDark = theme === 'dark';

  // Sort skills by level (highest first)
  const sortedSkills = useMemo(() => 
    [...skillTrees].sort((a, b) => b.currentXP - a.currentXP),
    [skillTrees]
  );

  return (
    <div className="space-y-8">
      {/* Central Hub */}
      <CentralHub isDark={isDark} />

      {/* Skill Tree Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {sortedSkills.map((skill, index) => (
          <SkillNode 
            key={skill.id} 
            skill={skill} 
            isDark={isDark}
            index={index}
          />
        ))}
      </div>

      {/* Legend / How it works */}
      <div className={`p-6 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          💡 How Skill XP Works
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <span className="text-lg mr-2">🎯</span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>Productivity:</strong> Complete tasks, plan days
            </span>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <span className="text-lg mr-2">💰</span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>Financial:</strong> Financial category tasks
            </span>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <span className="text-lg mr-2">🏃</span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>Health:</strong> Exercise & wellness habits
            </span>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
            <span className="text-lg mr-2">📚</span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>Learning:</strong> Reading & learning habits
            </span>
          </div>
        </div>

        {/* Streak multiplier info */}
        <div className={`mt-4 p-4 rounded-xl border ${
          isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
        }`}>
          <h5 className={`font-medium mb-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
            🔥 Streak Multipliers
          </h5>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>3+ days:</strong> 1.1x
            </span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>7+ days:</strong> 1.25x
            </span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>14+ days:</strong> 1.5x
            </span>
            <span className={isDark ? 'text-gray-300' : 'text-slate-600'}>
              <strong>30+ days:</strong> 2x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
