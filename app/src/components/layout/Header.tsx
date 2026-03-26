import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Sparkles, Home, CheckSquare, Target, Calendar, CalendarDays, Trophy, BarChart3, Sun, Moon, FolderKanban, Search, Timer, Download, LogIn, LogOut, Settings, Newspaper, Menu, X, ClipboardList } from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTaskContext } from '../../context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { DataExportImport } from '../common/DataPortability';
import { ExpandableModal } from '../common/ExpandableModal';
import { LoginModal } from '../auth/LoginModal';
import { AccountSettings } from '../auth/AccountSettings';
import { useAuth } from '../../context/AuthContext';
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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isConfigured } = useAuth();

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
    { icon: CalendarDays, label: 'Calendar', to: '/calendar' },
    { icon: FolderKanban, label: 'Projects', to: '/projects' },
    { icon: Trophy, label: 'Achievements', to: '/achievements' },
    { icon: BarChart3, label: 'Stats', to: '/stats' },
    { icon: ClipboardList, label: 'Review', to: '/review' },
    { icon: Newspaper, label: 'Feed', to: '/feed' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 safe-area-pt ${
        isDark
          ? 'bg-[#0c0c10]/70 backdrop-blur-2xl border-white/[0.06]'
          : 'bg-white/60 backdrop-blur-2xl border-black/[0.04]'
      }`}>
        <div className="px-4 md:px-6 py-0 flex items-center justify-between h-14">
          {/* Left: Logo + hamburger on mobile */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2.5 -ml-1 rounded-lg md:hidden transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Assisy</span>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-0.5 mx-4">
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
            {/* Search trigger - desktop only */}
            <button
              onClick={triggerSearch}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Search (⌘K)"
            >
              <Search size={14} />
              <kbd className={`text-[9px] px-1 py-0.5 rounded hidden sm:inline ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>⌘K</kbd>
            </button>

            {/* Focus timer - desktop only */}
            {onOpenFocusTimer && (
              <button
                onClick={onOpenFocusTimer}
                className={`hidden md:block p-2 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-violet-400 hover:bg-violet-500/10' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                }`}
                title="Focus Timer"
              >
                <Timer size={16} />
              </button>
            )}

            <QuickAddTask onSubmit={handleQuickAdd} />

            {/* XP/Level pill - desktop only */}
            <div className={`hidden md:flex items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs ${
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

            {/* Data export/import - desktop only */}
            <button
              onClick={() => setDataModalOpen(true)}
              className={`hidden md:block p-2 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Backup & Restore"
            >
              <Download size={16} />
            </button>

            {/* Auth - avatar always visible, sign-in desktop only */}
            {isConfigured && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(p => !p)}
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-transparent"
                    title={user.email ?? 'Account'}
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.email?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className={`absolute right-0 mt-2 w-52 rounded-xl z-50 shadow-xl border ${isDark ? 'bg-[#12121a] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className={`px-3.5 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                          <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user.user_metadata?.full_name || user.email}</p>
                          {user.user_metadata?.full_name && (
                            <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{user.email}</p>
                          )}
                        </div>
                        <div className="p-1.5 space-y-0.5">
                          <button
                            onClick={() => { setAccountModalOpen(true); setUserMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            <Settings size={14} />
                            Account Settings
                          </button>
                          <button
                            onClick={() => { signOut(); setUserMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                          >
                            <LogOut size={14} />
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                  }`}
                  title="Sign in to sync"
                >
                  <LogIn size={14} />
                  Sign in
                </button>
              )
            )}

            {/* Theme Toggle - desktop only */}
            <button
              onClick={toggleTheme}
              className={`hidden md:block p-2 rounded-lg transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileMenu}
      />
      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-[#0a0a0f] border-r border-white/10' : 'bg-white border-r border-slate-200'}`}
      >
        {/* Drawer header */}
        <div className={`flex items-center justify-between px-4 h-14 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Assisy</span>
          </div>
          <button
            onClick={closeMobileMenu}
            className={`p-2.5 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex flex-col h-[calc(100%-3.5rem)] overflow-y-auto">
          {/* XP/Level pill */}
          <div className="px-4 pt-4 pb-2">
            <div className={`flex items-center space-x-2 rounded-lg px-3 py-2.5 text-xs ${
              isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`font-semibold tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{totalXP.toLocaleString()}</span>
              <div className={`w-px h-3.5 ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`} />
              <span className="text-violet-500 font-semibold">Lv {level}</span>
              <div className={`w-12 h-1 rounded-full overflow-hidden ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`}>
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="px-3 py-2 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                      : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Divider */}
          <div className={`mx-4 my-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />

          {/* Action buttons */}
          <div className="px-3 space-y-0.5">
            <button
              onClick={() => { triggerSearch(); closeMobileMenu(); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Search size={18} />
              <span>Search</span>
              <kbd className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-400'}`}>⌘K</kbd>
            </button>

            {onOpenFocusTimer && (
              <button
                onClick={() => { onOpenFocusTimer(); closeMobileMenu(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Timer size={18} />
                <span>Focus Timer</span>
              </button>
            )}

            <button
              onClick={() => { setDataModalOpen(true); closeMobileMenu(); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Download size={18} />
              <span>Backup & Restore</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom section: auth + theme */}
          <div className={`px-3 py-3 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            {isConfigured && !user && (
              <button
                onClick={() => { setLoginModalOpen(true); closeMobileMenu(); }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                }`}
              >
                <LogIn size={16} />
                Sign in
              </button>
            )}

            <button
              onClick={() => { toggleTheme(); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
              <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
            </button>
          </div>
        </div>
      </div>

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

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Account Settings Modal */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`} onClick={() => setAccountModalOpen(false)} />
          <div className={`relative rounded-2xl shadow-elevated w-full max-w-sm overflow-hidden animate-slide-up ${isDark ? 'bg-[#12121a] border border-white/10' : 'bg-white'}`}>
            <AccountSettings onClose={() => setAccountModalOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
