import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  CheckSquare,
  CalendarDays,
  Newspaper,
  MoreHorizontal,
  Target,
  Calendar,
  FolderKanban,
  Trophy,
  BarChart3,
  ClipboardList,
  Settings,
  X,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hapticLight } from '../../lib/haptics';
import { IconButton } from '../ui';

const STORAGE_KEY = 'assisy_bottom_nav_config';
// Mirrors the header's primary destinations, so the same five places are
// reachable on a phone as on a desktop. This previously pointed at /goals, which
// meant the grouping into Plan and Progress only ever landed on desktop and the
// two navigations disagreed about what the app's main sections were.
// Only affects people who never customised the bar; a saved config wins.
const DEFAULT_CONFIG: string[] = ['/tasks', '/habits', '/plan'];

const PAGE_REGISTRY: Record<string, { icon: LucideIcon; label: string }> = {
  '/tasks': { icon: CheckSquare, label: 'Tasks' },
  '/habits': { icon: Calendar, label: 'Habits' },
  // The grouped destinations, which cover five of the individual entries below.
  '/plan': { icon: Target, label: 'Plan' },
  '/progress': { icon: BarChart3, label: 'Progress' },
  '/calendar': { icon: CalendarDays, label: 'Calendar' },
  '/feed': { icon: Newspaper, label: 'Feed' },
  '/goals': { icon: Target, label: 'Goals' },
  '/projects': { icon: FolderKanban, label: 'Projects' },
  '/stats': { icon: BarChart3, label: 'Stats' },
  '/achievements': { icon: Trophy, label: 'Achievements' },
  '/review': { icon: ClipboardList, label: 'Review' },
};

const ALL_CONFIGURABLE_ROUTES = Object.keys(PAGE_REGISTRY);

function loadNavConfig(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((p: unknown) => typeof p === 'string' && PAGE_REGISTRY[p as string])) {
        return parsed;
      }
    }
  } catch { /* use default */ }
  return DEFAULT_CONFIG;
}

function saveNavConfig(config: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function BottomNav() {
  const [navConfig, setNavConfig] = useState<string[]>(loadNavConfig);
  const [moreOpen, setMoreOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setNavConfig(loadNavConfig());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const middleItems = navConfig.map((path) => ({
    to: path,
    ...PAGE_REGISTRY[path],
  }));

  const moreItems = ALL_CONFIGURABLE_ROUTES
    .filter((path) => !navConfig.includes(path))
    .map((path) => ({ to: path, ...PAGE_REGISTRY[path] }));

  const closeMore = () => {
    setMoreOpen(false);
    setCustomizing(false);
  };

  const handleMoreNav = (to: string) => {
    navigate(to);
    closeMore();
  };

  const openCustomize = useCallback(() => {
    setPendingSelection([...navConfig]);
    setCustomizing(true);
  }, [navConfig]);

  const toggleSelection = (path: string) => {
    setPendingSelection((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path);
      if (prev.length >= 3) return prev;
      return [...prev, path];
    });
  };

  const saveCustomization = () => {
    if (pendingSelection.length !== 3) return;
    saveNavConfig(pendingSelection);
    setNavConfig(pendingSelection);
    setCustomizing(false);
  };

  const linkCls = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-3 min-w-0 flex-1 min-h-[48px] transition-colors ${
      active
        ? 'text-violet-600 dark:text-violet-400'
        : 'text-slate-500 dark:text-gray-500'
    }`;

  return (
    <>
      <nav
        className={`bottom-nav-bar md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t ${
          'bg-white/60 backdrop-blur-2xl border-black/[0.04] dark:bg-[#0c0c10]/70 dark:border-white/[0.06]'
        }`}
      >
        <div className="flex items-stretch">
          <NavLink
            to="/"
            onClick={hapticLight}
            className={({ isActive }) => linkCls(isActive)}
          >
            <Home size={22} strokeWidth={2} />
            <span className="text-xs font-medium truncate max-w-full px-1">Today</span>
          </NavLink>
          {middleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={hapticLight}
              className={({ isActive }) => linkCls(isActive)}
            >
              <item.icon size={22} strokeWidth={2} />
              <span className="text-xs font-medium truncate max-w-full px-1">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => { hapticLight(); setMoreOpen(true); }}
            className={linkCls(false)}
          >
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/50 animate-fade-in"
            onClick={closeMore}
            aria-hidden
          />
          <div
            className={`md:hidden fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl shadow-elevated animate-slide-up ${
              'bg-white border-t border-slate-200 dark:bg-[#12121a] dark:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className={`text-sm font-semibold text-slate-800 dark:text-white`}>
                {customizing ? 'Customize Nav' : 'More'}
              </span>
              <div className="flex items-center gap-1">
                {customizing ? (
                  <IconButton
                    icon={X}
                    label="Stop customising"
                    size="lg"
                    type="button"
                    onClick={() => setCustomizing(false)}
                  />
                ) : (
                  <IconButton
                    icon={X}
                    label="Close menu"
                    size="lg"
                    type="button"
                    onClick={closeMore}
                  />
                )}
              </div>
            </div>

            {customizing ? (
              <div className="p-3 pb-8 max-h-[60vh] overflow-y-auto">
                <p className={`text-xs mb-3 px-1 text-slate-500 dark:text-gray-400`}>
                  Select exactly 3 pages for your nav bar ({pendingSelection.length}/3)
                </p>
                <div className="space-y-1">
                  {ALL_CONFIGURABLE_ROUTES.map((path) => {
                    const page = PAGE_REGISTRY[path];
                    const Icon = page.icon;
                    const selected = pendingSelection.includes(path);
                    const disabled = !selected && pendingSelection.length >= 3;
                    return (
                      <button
                        key={path}
                        type="button"
                        onClick={() => toggleSelection(path)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                          selected
                            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30'
                            : disabled
                              ? 'text-slate-400 opacity-50 dark:text-gray-400'
                              : 'hover:bg-slate-50 text-slate-700 dark:hover:bg-white/5 dark:text-gray-200'
                        }`}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">{page.label}</span>
                        {selected && <Check size={16} className={'text-violet-600 dark:text-violet-400'} />}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={saveCustomization}
                  disabled={pendingSelection.length !== 3}
                  className={`mt-4 w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                    pendingSelection.length === 3
                      ? 'bg-violet-600 text-white hover:bg-violet-700 dark:hover:bg-violet-500'
                      : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-400'
                  }`}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="p-3 pb-8 max-h-[60vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={openCustomize}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors mb-1 ${
                    'hover:bg-violet-50 text-violet-600 border border-slate-200 dark:hover:bg-white/5 dark:text-violet-400 dark:border-white/10'
                  }`}
                >
                  <Settings size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">Customize Nav</span>
                </button>
                <div className="grid grid-cols-2 gap-1">
                  {moreItems.map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleMoreNav(item.to)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        'hover:bg-slate-50 text-slate-700 dark:hover:bg-white/5 dark:text-gray-200'
                      }`}
                    >
                      <item.icon size={20} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
