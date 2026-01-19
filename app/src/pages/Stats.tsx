import { BarChart3, CheckSquare, Zap, TrendingUp, Target, Flame } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';

export function Stats() {
  const { tasks, getTotalXP } = useTaskContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const totalXP = getTotalXP();
  
  const personalTasks = completedTasks.filter(t => t.category === 'Personal');
  const financialTasks = completedTasks.filter(t => t.category === 'Financial');
  const professionalTasks = completedTasks.filter(t => t.category === 'Professional');
  
  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'High').length;
  const highEffortCompleted = completedTasks.filter(t => t.effort === 'High').length;

  const level = Math.floor(totalXP / 100) + 1;
  const xpProgress = totalXP % 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Statistics</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Track your progress and achievements</p>
      </div>
      
      {/* Level Progress */}
      <div className="card card-accent rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Level Progress</h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Keep completing tasks to level up!</p>
          </div>
          <div className="text-right">
            <div className="stat-number text-3xl text-violet-500">Level {level}</div>
            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{xpProgress}/100 XP to next level</div>
          </div>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
              <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-2xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{totalXP.toLocaleString()}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Total XP</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
              <CheckSquare className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-2xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{completedTasks.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Completed</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              <TrendingUp className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-2xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{pendingTasks.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Pending</p>
        </div>
        
        <div className="card card-hover rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <BarChart3 className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
          </div>
          <div className={`stat-number text-2xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{tasks.length}</div>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Total Tasks</p>
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
          <div className="stat-number text-3xl text-red-500">{highPriorityCompleted}</div>
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
          <div className="stat-number text-3xl text-orange-500">{highEffortCompleted}</div>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            {completedTasks.length > 0 ? `${Math.round((highEffortCompleted / completedTasks.length) * 100)}% of completed` : 'No tasks yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
