import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Sparkles, Home, CheckSquare, Target, Calendar, Trophy, BarChart3, Sun, Moon, FolderKanban, Search, Timer, Download } from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTaskContext } from '../../context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { DataExportImport } from '../common/DataPortability';
import { ExpandableModal } from '../common/ExpandableModal';
import type { TaskCategory, Priority, Effort } from '../../types';

interface HeaderProps {
  onOpenFocusTimer?: () => void;
}

export function Header({ onOpenFocusTimer }: HeaderProps) {
  const { createTask } = useTaskContext();
  const { theme, toggleTheme } = useTheme();
  const { getTotalXP, getTotalLevel } = useGamification();
  const totalXP = getTotalXP();
  const level = getTotalLevel();
  const xpProgress = totalXP % 100;
  const isDark = theme === 'dark';
  const [dataModalOpen, setDataModalOpen] = useState(false);

  const { addToToday: addTaskToToday } = useTaskContext();

  const handleQuickAdd = (data: {
    title: string;
    category: TaskCategory;
    priority: Priority;
    effort: Effort;
    addToToday?: boolean;
  }) => {
    const newTask = createTask(data.title, '', data.category, data.priority, data.effort);
    if (data.addToToday) {
      addTaskToToday(newTask.id);
    }
  };

  const triggerSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
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
    <>
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-white/10'
          : 'bg-white/80 backdrop-blur-xl border-slate-200'
      }`}>
        <div className="px-6 py-0 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Assisy</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-0.5 mx-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                      : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <item.icon size={15} />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Search trigger */}
            <button
              onClick={triggerSearch}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Search (⌘K)"
            >
              <Search size={14} />
              <kbd className={`text-[9px] px-1 py-0.5 rounded hidden sm:inline ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>⌘K</kbd>
            </button>

            {/* Focus timer */}
            {onOpenFocusTimer && (
              <button
                onClick={onOpenFocusTimer}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/10' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                }`}
                title="Focus Timer"
              >
                <Timer size={16} />
              </button>
            )}

            <QuickAddTask onSubmit={handleQuickAdd} />

            {/* XP/Level pill */}
            <div className={`flex items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs ${
              isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`font-semibold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{totalXP.toLocaleString()}</span>
              <div className={`w-px h-3.5 ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`} />
              <span className="text-violet-500 font-semibold">Lv {level}</span>
              <div className={`w-10 h-1 rounded-full overflow-hidden ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`}>
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>

            {/* Data export/import */}
            <button
              onClick={() => setDataModalOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Backup & Restore"
            >
              <Download size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Data Export/Import Modal */}
      <ExpandableModal
        isOpen={dataModalOpen}
        onClose={() => setDataModalOpen(false)}
        title="Backup & Restore"
        icon={<Download className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
      >
        {() => (
          <div className="p-6">
            <DataExportImport onClose={() => setDataModalOpen(false)} />
          </div>
        )}
      </ExpandableModal>
    </>
  );
}
