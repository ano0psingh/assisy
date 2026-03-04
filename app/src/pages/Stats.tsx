import { CheckSquare, Zap, Flame, Trophy } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { SkillTreeViz } from '../components/gamification/SkillTreeViz';

export function Stats() {
  const { tasks } = useTaskContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    userStats, 
    getUnlockedAchievements,
  } = useGamification();
  
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  
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

      <SkillTreeViz />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Total XP', value: userStats.totalXPEarned.toLocaleString(), color: 'amber' },
          { icon: CheckSquare, label: 'Completed', value: userStats.totalTasksCompleted, color: 'emerald' },
          { icon: Flame, label: 'Best Streak', value: `${userStats.longestLoginStreak}d`, color: 'orange' },
          { icon: Trophy, label: 'Achievements', value: unlockedAchievements.length, color: 'violet' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card card-hover rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDark ? `bg-${color}-500/20` : `bg-${color}-50`}`}>
              <Icon className={`w-5 h-5 ${isDark ? `text-${color}-400` : `text-${color}-500`}`} />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</div>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Activity Metrics */}
      <div className="card rounded-2xl p-5">
        <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Days Active', value: userStats.totalDaysActive },
            { label: 'Productive Days', value: userStats.productiveDays },
            { label: 'Perfect Days', value: userStats.perfectDays },
            { label: 'Tasks Created', value: userStats.totalTasksCreated },
            { label: 'Days Planned', value: userStats.totalDaysPlanned },
            { label: 'Pending Tasks', value: pendingTasks.length },
            { label: 'Early Bird', value: userStats.earlyBirdCount },
            { label: 'Night Owl', value: userStats.nightOwlCount },
          ].map(({ label, value }) => (
            <div key={label} className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card rounded-2xl p-6">
        <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Completed by Category</h2>
        <div className="space-y-4">
          {[
            { label: 'Personal', count: personalTasks.length, color: isDark ? 'text-blue-400' : 'text-blue-600', bg: 'bg-blue-500' },
            { label: 'Financial', count: financialTasks.length, color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: 'bg-emerald-500' },
            { label: 'Professional', count: professionalTasks.length, color: isDark ? 'text-gray-400' : 'text-slate-600', bg: 'bg-slate-400' },
          ].map(cat => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={`font-medium ${cat.color}`}>{cat.label}</span>
                <span className={isDark ? 'text-gray-500' : 'text-slate-500'}>{cat.count}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div className={`h-full ${cat.bg} rounded-full transition-all duration-500`} style={{ width: `${completedTasks.length > 0 ? (cat.count / completedTasks.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority & Effort — compact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card rounded-2xl p-5">
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>High Priority Completed</p>
          <div className="text-2xl font-bold text-red-500 mt-1">{highPriorityCompleted}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            {completedTasks.length > 0 ? `${Math.round((highPriorityCompleted / completedTasks.length) * 100)}% of total` : 'No tasks yet'}
          </p>
        </div>
        <div className="card rounded-2xl p-5">
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>High Effort Completed</p>
          <div className="text-2xl font-bold text-orange-500 mt-1">{highEffortCompleted}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            {completedTasks.length > 0 ? `${Math.round((highEffortCompleted / completedTasks.length) * 100)}% of total` : 'No tasks yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
