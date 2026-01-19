import { Trophy, Lock, Star, Flame, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Achievements() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const previewAchievements = [
    { icon: Star, name: 'First Blood', description: 'Complete your first task', color: isDark ? 'text-amber-400' : 'text-amber-500', bg: isDark ? 'bg-amber-500/20' : 'bg-amber-50' },
    { icon: Flame, name: 'On Fire', description: '7-day task streak', color: isDark ? 'text-orange-400' : 'text-orange-500', bg: isDark ? 'bg-orange-500/20' : 'bg-orange-50' },
    { icon: Zap, name: 'Centurion', description: 'Complete 100 tasks', color: isDark ? 'text-violet-400' : 'text-violet-500', bg: isDark ? 'bg-violet-500/20' : 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Achievements</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Unlock badges and earn rewards</p>
      </div>
      
      <div className="card rounded-2xl p-12 text-center">
        <div className="relative inline-block mb-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
            <Trophy size={40} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
          </div>
          <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-100 border-slate-200'} border`}>
            <Lock size={14} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
          </div>
        </div>
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>Coming in Phase 4</h2>
        <p className={`max-w-md mx-auto leading-relaxed ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          Unlock badges as you complete tasks and build streaks. Earn titles like "Task Warrior" and "Grand Taskmaster".
        </p>
        <div className={`mt-6 inline-flex items-center space-x-2 text-sm px-4 py-2 rounded-full ${isDark ? 'text-gray-400 bg-white/5' : 'text-slate-400 bg-slate-50'}`}>
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Feature in development</span>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Achievement Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {previewAchievements.map((achievement) => (
            <div key={achievement.name} className="card rounded-2xl p-6 opacity-60 relative">
              <div className={`w-12 h-12 rounded-xl ${achievement.bg} flex items-center justify-center mb-4`}>
                <achievement.icon size={24} className={achievement.color} />
              </div>
              <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-700'}`}>{achievement.name}</h4>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{achievement.description}</p>
              <div className="absolute top-4 right-4">
                <Lock size={14} className={isDark ? 'text-gray-600' : 'text-slate-300'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
