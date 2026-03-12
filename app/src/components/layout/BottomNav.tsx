import { useState } from 'react';
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
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const primaryNav = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
  { icon: CalendarDays, label: 'Calendar', to: '/calendar' },
  { icon: Newspaper, label: 'Feed', to: '/feed' },
];

const moreNav = [
  { icon: Target, label: 'Goals', to: '/goals' },
  { icon: Calendar, label: 'Habits', to: '/habits' },
  { icon: FolderKanban, label: 'Projects', to: '/projects' },
  { icon: Trophy, label: 'Achievements', to: '/achievements' },
  { icon: BarChart3, label: 'Stats', to: '/stats' },
  { icon: ClipboardList, label: 'Review', to: '/review' },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const closeMore = () => setMoreOpen(false);

  const handleMoreNav = (to: string) => {
    navigate(to);
    closeMore();
  };

  const linkCls = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 flex-1 transition-colors ${
      active
        ? isDark
          ? 'text-violet-400'
          : 'text-violet-600'
        : isDark
          ? 'text-gray-500'
          : 'text-slate-500'
    }`;

  return (
    <>
      <nav
        className={`bottom-nav-bar md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t ${
          isDark ? 'bg-[#0a0a0f]/95 backdrop-blur border-white/10' : 'bg-white/95 backdrop-blur border-slate-200'
        }`}
      >
        <div className="flex items-stretch">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => linkCls(isActive)}
            >
              <item.icon size={22} strokeWidth={2} />
              <span className="text-[10px] font-medium truncate max-w-full px-0.5">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={linkCls(false)}
          >
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
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
              isDark ? 'bg-[#12121a] border-t border-white/10' : 'bg-white border-t border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>More</span>
              <button
                type="button"
                onClick={closeMore}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3 pb-8 max-h-[60vh] overflow-y-auto grid grid-cols-2 gap-1">
              {moreNav.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleMoreNav(item.to)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    isDark ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
