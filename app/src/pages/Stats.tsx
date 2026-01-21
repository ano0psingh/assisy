import { BarChart3, CheckSquare, Zap, TrendingUp, Target, Flame, Trophy, Crown, Sparkles } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import type { SkillTree } from '../types';

// Skill Tree Card Component
function SkillTreeCard({ skill, isDark }: { skill: SkillTree; isDark: boolean }) {
  const xpToNextLevel = 100;
  const currentLevelXP = skill.currentXP % xpToNextLevel;
  const progress = (currentLevelXP / xpToNextLevel) * 100;

  return (
    <div 
      className={`card rounded-2xl p-5 transition-all hover:scale-[1.02] ${isDark ? 'hover:border-white/20' : 'hover:border-slate-300'}`}
      style={{ 
        background: isDark 
          ? `linear-gradient(135deg, ${skill.color}15 0%, transparent 100%)` 
          : `linear-gradient(135deg, ${skill.color}10 0%, transparent 100%)`,
        borderColor: isDark ? `${skill.color}30` : `${skill.color}40`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ 
              backgroundColor: isDark ? `${skill.color}20` : `${skill.color}15`,
            }}
          >
            {skill.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {skill.name}
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {skill.description}
            </p>
          </div>
        </div>
        <div 
          className="text-right px-3 py-1.5 rounded-lg font-bold"
          style={{ 
            backgroundColor: isDark ? `${skill.color}20` : `${skill.color}15`,
            color: skill.color,
          }}
        >
          Lv.{skill.level}
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
            {currentLevelXP} / {xpToNextLevel} XP
          </span>
          <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
            Total: {skill.currentXP.toLocaleString()} XP
          </span>
        </div>
        <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              backgroundColor: skill.color,
              boxShadow: `0 0 10px ${skill.color}50`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function Stats() {
  const { tasks, getTotalXP } = useTaskContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    skillTrees, 
    userStats, 
    getTotalLevel, 
    getTitle,
    getUnlockedAchievements,
  } = useGamification();
  
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const totalXP = getTotalXP();
  
  const personalTasks = completedTasks.filter(t => t.category === 'Personal');
  const financialTasks = completedTasks.filter(t => t.category === 'Financial');
  const professionalTasks = completedTasks.filter(t => t.category === 'Professional');
  
  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'High').length;
  const highEffortCompleted = completedTasks.filter(t => t.effort === 'High').length;

  const level = getTotalLevel();
  const title = getTitle();
  const unlockedAchievements = getUnlockedAchievements();
  
  // Calculate total skill XP and progress to next level
  const totalSkillXP = skillTrees.reduce((sum, s) => sum + s.currentXP, 0);
  const xpToNextLevel = 100;
  const xpProgress = totalSkillXP % xpToNextLevel;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Statistics</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Track your progress and level up your skills</p>
      </div>
      
      {/* Level Progress Card */}
      <div className={`card rounded-2xl p-6 ${isDark ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 border-violet-500/20' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-violet-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
              <Crown className={`w-8 h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {xpProgress}/100 XP to next level
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
              Level {level}
            </div>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {totalSkillXP.toLocaleString()} Total XP
            </div>
          </div>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" 
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card card-hover rounded-2xl p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
            <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{totalXP.toLocaleString()}</div>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Task XP</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
            <CheckSquare className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.totalTasksCompleted}</div>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Total Completed</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
            <Flame className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.longestStreak}</div>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Best Streak</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <Trophy className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{unlockedAchievements.length}</div>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Achievements</p>
        </div>
      </div>

      {/* Skill Trees Section */}
      <div className="card rounded-2xl overflow-hidden">
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20' : 'bg-gradient-to-br from-violet-50 to-purple-50'}`}>
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Skill Trees</h2>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Level up different areas of your life</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skillTrees.map((skill) => (
              <SkillTreeCard key={skill.id} skill={skill} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Completed by Category</h2>
        </div>
        <div className="space-y-5">
          {[
            { label: 'Personal', count: personalTasks.length, color: isDark ? 'text-blue-400' : 'text-blue-600', bg: 'bg-blue-500' },
            { label: 'Financial', count: financialTasks.length, color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: 'bg-emerald-500' },
            { label: 'Professional', count: professionalTasks.length, color: isDark ? 'text-gray-400' : 'text-slate-600', bg: 'bg-slate-400' },
          ].map(cat => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className={`font-medium ${cat.color}`}>{cat.label}</span>
                <span className={isDark ? 'text-gray-500' : 'text-slate-500'}>{cat.count} tasks</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div className={`h-full ${cat.bg} rounded-full transition-all duration-500`} style={{ width: `${completedTasks.length > 0 ? (cat.count / completedTasks.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Priority & Effort */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
              <Flame className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>High Priority</h2>
          </div>
          <div className="text-3xl font-bold text-red-500">{highPriorityCompleted}</div>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {completedTasks.length > 0 ? `${Math.round((highPriorityCompleted / completedTasks.length) * 100)}% of completed` : 'No tasks yet'}
          </p>
        </div>
        
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
              <TrendingUp className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>High Effort</h2>
          </div>
          <div className="text-3xl font-bold text-orange-500">{highEffortCompleted}</div>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {completedTasks.length > 0 ? `${Math.round((highEffortCompleted / completedTasks.length) * 100)}% of completed` : 'No tasks yet'}
          </p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
            <BarChart3 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Activity Summary</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Goals Completed</p>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.goalsCompleted}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Habits Tracked</p>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.habitsTracked}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Current Streak</p>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.currentStreak} days</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Pending Tasks</p>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{pendingTasks.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
