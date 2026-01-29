import { NavLink } from 'react-router-dom';
import { Zap, Sparkles, Home, CheckSquare, Target, Calendar, Trophy, BarChart3, Sun, Moon, FolderKanban } from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTaskContext } from '../../context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import type { TaskCategory, Priority, Effort } from '../../types';

// Get XP progress to next level (0-100)
function getXPProgress(xp: number): number {
  return xp % 100;
}

export function Header() {
  const { createTask } = useTaskContext();
  const { theme, toggleTheme } = useTheme();
  const { getTotalXP, getTotalLevel, getTitle } = useGamification();
  const totalXP = getTotalXP();
  const level = getTotalLevel();
  const xpProgress = getXPProgress(totalXP);
  const title = getTitle();
  const isDark = theme === 'dark';

  const handleQuickAdd = (data: {
    title: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
  }) => {
    createTask(data.title, '', data.category, data.priority, data.effort);
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', to: '/' },
    { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
    { icon: Target, label: 'Goals', to: '/goals' },
    { icon: Calendar, label: 'Habits', to: '/habits' },
    { icon: FolderKanban, label: 'Projects', to: '/projects' },
    { icon: Trophy, label: 'Achievements', to: '/achievements' },
    { icon: BarChart3, label: 'Stats', to: '/stats' },
  ];

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-white/10' 
        : 'bg-white/80 backdrop-blur-xl border-slate-200'
    }`}>
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            isDark 
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30' 
              : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'
          }`}>
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Assisy</h1>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Your personal productivity assistant</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          <QuickAddTask onSubmit={handleQuickAdd} />
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`theme-toggle ${isDark ? 'theme-toggle-dark' : 'theme-toggle-light'}`}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-knob">
              {isDark ? (
                <Moon size={14} className="text-violet-400" />
              ) : (
                <Sun size={14} className="text-amber-500" />
              )}
            </div>
          </button>
          
          {/* XP & Level */}
          <div className={`flex items-center space-x-3 rounded-xl px-4 py-2 ${
            isDark 
              ? 'bg-amber-500/10 border border-amber-500/20' 
              : 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`stat-number ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{totalXP.toLocaleString()}</span>
              <span className={`text-sm ${isDark ? 'text-amber-400/60' : 'text-amber-600/60'}`}>XP</span>
            </div>
            <div className={`w-px h-6 ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`} />
            <div className="flex flex-col">
              <span className="text-violet-500 font-semibold text-sm">Lv {level}</span>
              <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* User */}
          <div className={`flex items-center space-x-3 rounded-xl px-4 py-2 ${
            isDark 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              K
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>Kage</span>
              <span className="text-violet-500 text-xs">{title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`px-6 flex items-center space-x-1 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-2 px-4 py-3 text-sm transition-colors relative ${
                isActive
                  ? 'text-violet-500 font-medium'
                  : isDark 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
