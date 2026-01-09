import { Calendar, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Habits() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Habits</h1>
        <p className={`mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Build streaks and track daily habits</p>
      </div>
      
      <div className="card rounded-2xl p-12 text-center">
        <div className="relative inline-block mb-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-50'}`}>
            <Calendar size={40} className={isDark ? 'text-cyan-400' : 'text-cyan-500'} />
          </div>
          <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-100 border-slate-200'} border`}>
            <Lock size={14} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
          </div>
        </div>
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>Coming in Phase 3</h2>
        <p className={`max-w-md mx-auto leading-relaxed ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          Track daily habits like meditation, reading, and exercise. Build streaks with a GitHub-style contribution graph.
        </p>
        <div className={`mt-6 inline-flex items-center space-x-2 text-sm px-4 py-2 rounded-full ${isDark ? 'text-gray-400 bg-white/5' : 'text-slate-400 bg-slate-50'}`}>
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span>Feature in development</span>
        </div>
      </div>
    </div>
  );
}
