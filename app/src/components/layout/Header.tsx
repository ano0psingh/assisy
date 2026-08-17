import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Sparkles, Home, CheckSquare, Target, Calendar, CalendarDays, Trophy, BarChart3, Sun, Moon, FolderKanban, Search, Timer, Download, LogIn, LogOut, Settings, Newspaper, Menu, X, ClipboardList, MoreHorizontal } from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTaskContext } from '../../context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { DataExportImport } from '../common/DataPortability';
import { SyncStatus } from '../common/SyncStatus';
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
  const isDark = theme === 'dark';
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreMenuOpen]);
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

  /**
   * Five destinations rather than ten. Plan groups Goals and Projects; Progress
   * groups Stats, Achievements and the weekly review — all three answered the
   * same question from three separate places in the nav.
   */
  const primaryNavItems = [
    { icon: Home, label: 'Today', to: '/' },
    { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
    { icon: Calendar, label: 'Habits', to: '/habits' },
    { icon: Target, label: 'Plan', to: '/plan' },
    { icon: BarChart3, label: 'Progress', to: '/progress' },
  ];

  const overflowNavItems = [
    { icon: CalendarDays, label: 'Calendar', to: '/calendar' },
    { icon: Newspaper, label: 'Feed', to: '/feed' },
    { icon: Target, label: 'Goals', to: '/goals' },
    { icon: FolderKanban, label: 'Projects', to: '/projects' },
    { icon: BarChart3, label: 'Stats', to: '/stats' },
    { icon: Trophy, label: 'Achievements', to: '/achievements' },
    { icon: ClipboardList, label: 'Review', to: '/review' },
  ];

  // The mobile drawer lists everything: there is room to scroll, and hiding
  // destinations behind two layers on the smaller screen helps nobody.
  const navItems = [...primaryNavItems, ...overflowNavItems];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 safe-area-pt ${
        'bg-white/60 backdrop-blur-2xl border-black/[0.04] dark:bg-[#0c0c10]/70 dark:border-white/[0.06]'
      }`}>
        <div className="px-4 md:px-6 py-0 flex items-center justify-between h-14">
          {/* Left: Logo + hamburger on mobile */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-3 -ml-1 rounded-lg md:hidden transition-colors ${
                'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
              }`}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-600">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className={`text-lg font-bold text-slate-800 dark:text-white`}>Assisy</span>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-1 mx-4">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
                  }`
                }
              >
                <item.icon size={15} />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}

            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen(open => !open)}
                aria-label="More destinations"
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
                }`}
              >
                <MoreHorizontal size={15} />
                <span className="hidden lg:inline">More</span>
              </button>

              {moreMenuOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-1 w-48 rounded-xl border overflow-hidden z-50 ${
                    'bg-white border-slate-200 dark:bg-[#14141a] dark:border-white/10'
                  }`}
                >
                  <div className="p-2 space-y-1">
                    {overflowNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={() => setMoreMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                            isActive
                              ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5'
                          }`
                        }
                      >
                        <item.icon size={14} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <SyncStatus />

            {/* Search trigger. Shown on mobile too: search was reachable only
                by ⌘K, which a phone has no way to press. */}
            <button
              onClick={triggerSearch}
              className={`flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-xs transition-colors ${
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/5'
              }`}
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search size={18} className="md:hidden" />
              <Search size={14} className="hidden md:block" />
              <kbd className={`text-xs px-1 py-1 rounded hidden md:inline bg-slate-100 dark:bg-white/5`}>⌘K</kbd>
            </button>

            {/* Focus timer - desktop only */}
            {onOpenFocusTimer && (
              <button
                onClick={onOpenFocusTimer}
                className={`hidden md:block p-2 rounded-lg transition-colors ${
                  'text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:text-gray-400 dark:hover:text-violet-400 dark:hover:bg-violet-500/10'
                }`}
                title="Focus Timer"
                aria-label="Focus Timer"
              >
                <Timer size={16} />
              </button>
            )}

            <QuickAddTask onSubmit={handleQuickAdd} />

            {/* XP/Level pill - desktop only. The bar lives on the Dashboard,
                where there is room to say what it is progress toward. */}
            <div className={`hidden md:flex items-center space-x-2 rounded-lg px-3 py-2 text-xs ${
              'bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
            }`}>
              <Zap className={`w-4 h-4 text-amber-500 dark:text-amber-400`} />
              <span className={`font-semibold tabular-nums text-amber-600 dark:text-amber-400`}>{totalXP.toLocaleString()}</span>
              <div className={`w-px h-4 bg-amber-200 dark:bg-amber-500/20`} />
              <span className="text-violet-500 font-semibold">Lv {level}</span>
            </div>

            {/* Data export/import - desktop only */}
            <button
              onClick={() => setDataModalOpen(true)}
              className={`hidden md:block p-2 rounded-lg transition-colors ${
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/10'
              }`}
              title="Backup & Restore"
              aria-label="Backup & Restore"
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
                      <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.email?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className={`absolute right-0 mt-2 w-52 rounded-xl z-50 shadow-xl border bg-white border-slate-200 dark:bg-[#12121a] dark:border-white/10`}>
                        <div className={`px-4 py-3 border-b border-slate-100 dark:border-white/10`}>
                          <p className={`text-xs font-medium truncate text-slate-800 dark:text-white`}>{user.user_metadata?.full_name || user.email}</p>
                          {user.user_metadata?.full_name && (
                            <p className={`text-xs truncate mt-1 text-slate-400 dark:text-gray-500`}>{user.email}</p>
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => { setAccountModalOpen(true); setUserMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5`}
                          >
                            <Settings size={14} />
                            Account Settings
                          </button>
                          <button
                            onClick={() => { signOut(); setUserMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
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
                  className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
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
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
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
        } bg-white border-r border-slate-200 dark:bg-[#0a0a0f] dark:border-white/10`}
      >
        {/* Drawer header */}
        <div className={`flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-white/10`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-600">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className={`text-lg font-bold text-slate-800 dark:text-white`}>Assisy</span>
          </div>
          <button
            onClick={closeMobileMenu}
            className={`p-3 rounded-lg transition-colors ${
              'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
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
            <div className={`flex items-center space-x-2 rounded-lg px-3 py-3 text-xs ${
              'bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
            }`}>
              <Zap className={`w-4 h-4 text-amber-500 dark:text-amber-400`} />
              <span className={`font-semibold tabular-nums text-amber-600 dark:text-amber-400`}>{totalXP.toLocaleString()}</span>
              <div className={`w-px h-4 bg-amber-200 dark:bg-amber-500/20`} />
              <span className="text-violet-500 font-semibold">Lv {level}</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Divider */}
          <div className={`mx-4 my-2 border-t border-slate-100 dark:border-white/10`} />

          {/* Action buttons */}
          <div className="px-3 space-y-1">
            <button
              onClick={() => { triggerSearch(); closeMobileMenu(); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
              }`}
            >
              <Search size={18} />
              <span>Search</span>
              <kbd className={`ml-auto text-xs px-2 py-1 rounded bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500`}>⌘K</kbd>
            </button>

            {onOpenFocusTimer && (
              <button
                onClick={() => { onOpenFocusTimer(); closeMobileMenu(); }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
                }`}
              >
                <Timer size={18} />
                <span>Focus Timer</span>
              </button>
            )}

            <button
              onClick={() => { setDataModalOpen(true); closeMobileMenu(); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5'
              }`}
            >
              <Download size={18} />
              <span>Backup & Restore</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom section: auth + theme */}
          <div className={`px-3 py-3 border-t border-slate-100 dark:border-white/10`}>
            {isConfigured && !user && (
              <button
                onClick={() => { setLoginModalOpen(true); closeMobileMenu(); }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-3 mb-2 rounded-lg text-sm font-medium transition-colors ${
                  'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30'
                }`}
              >
                <LogIn size={16} />
                Sign in
              </button>
            )}

            <button
              onClick={() => { toggleTheme(); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
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
        icon={<Download className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />}
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
          <div className={`absolute inset-0 backdrop-blur-sm bg-slate-900/20 dark:bg-black/60`} onClick={() => setAccountModalOpen(false)} />
          <div className={`relative rounded-2xl shadow-elevated w-full max-w-sm overflow-hidden animate-slide-up bg-white dark:bg-[#12121a] dark:border dark:border-white/10`}>
            <AccountSettings onClose={() => setAccountModalOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
