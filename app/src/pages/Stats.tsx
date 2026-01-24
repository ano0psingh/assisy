import { BarChart3, CheckSquare, Zap, TrendingUp, Target, Flame, Trophy, Sparkles } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { SkillTreeViz } from '../components/gamification/SkillTreeViz';

export function Stats() {
  const { tasks, getTotalXP } = useTaskContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    userStats, 
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

  const unlockedAchievements = getUnlockedAchievements();

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Statistics & Skills</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Track your progress and level up your skills</p>
      </div>

      {/* Skill Tree Visualization */}
      <SkillTreeViz />

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
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.longestLoginStreak}</div>
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

      {/* Engagement Stats */}
      <div className="card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20' : 'bg-gradient-to-br from-violet-50 to-purple-50'}`}>
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Engagement Stats</h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Your activity and productivity metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Tasks Created</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.totalTasksCreated}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Days Planned</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.totalDaysPlanned}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Added to Today</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.tasksAddedToToday}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Productive Days</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.productiveDays}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Perfect Days</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.perfectDays}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Goals Completed</p>
            <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.goalsCompleted}</p>
          </div>
        </div>

        {/* Time-based stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className={`p-4 rounded-xl flex items-center space-x-4 ${
            isDark ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10' : 'bg-gradient-to-r from-amber-50 to-orange-50'
          }`}>
            <span className="text-3xl">🐦</span>
            <div>
              <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Early Bird Tasks</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.earlyBirdCount}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Completed before 9 AM</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl flex items-center space-x-4 ${
            isDark ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-r from-indigo-50 to-purple-50'
          }`}>
            <span className="text-3xl">🦉</span>
            <div>
              <p className={`text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Night Owl Tasks</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.nightOwlCount}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Completed after 9 PM</p>
            </div>
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

      {/* Activity Summary */}
      <div className="card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
            <BarChart3 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Activity Summary</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Total XP Earned</p>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{userStats.totalXPEarned.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
