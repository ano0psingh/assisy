import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '../common/GlobalSearch';
import { FocusTimer } from '../common/FocusTimer';
import { LevelUpCelebration } from '../common/LevelUpCelebration';
import { QuickCaptureFAB } from '../common/QuickCaptureFAB';
import { OnboardingTour } from '../common/OnboardingTour';
import { RecurringXPEffect } from '../common/RecurringXPEffect';

const PAGE_ORDER = ['/', '/tasks', '/calendar', '/feed'];
const SWIPE_MIN_X = 80;
const SWIPE_MAX_Y = 50;

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [transition, setTransition] = useState<'left' | 'right' | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTimerToggle = useCallback(() => {
    setFocusTimerOpen(prev => !prev);
  }, []);

  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleMainTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dy) > SWIPE_MAX_Y) return;

    const currentIdx = PAGE_ORDER.indexOf(location.pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < PAGE_ORDER.length - 1) {
      setTransition('left');
      navigate(PAGE_ORDER[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      setTransition('right');
      navigate(PAGE_ORDER[currentIdx - 1]);
    }

    setTimeout(() => setTransition(null), 300);
  }, [location.pathname, navigate]);

  const transitionClass = transition === 'left'
    ? 'animate-slide-in-right'
    : transition === 'right'
      ? 'animate-slide-in-left'
      : 'animate-fade-in';

  return (
    <div className={`min-h-screen flex flex-col dark:dark`}>
      <Header onOpenFocusTimer={handleTimerToggle} />
      <main
        className="flex-1 px-4 pt-4 pb-20 md:px-6 md:pt-8 md:pb-8 overflow-x-hidden"
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <div key={location.pathname} className={`max-w-6xl mx-auto ${transitionClass}`}>
          {children}
        </div>
      </main>

      <footer className={`hidden md:block border-t py-4 px-4 md:px-6 border-slate-200 dark:border-white/10`}>
        <div className={`max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-500 dark:text-gray-500`}>
          <span>Assisy</span>
          <span>Built for productivity</span>
        </div>
      </footer>

      <QuickCaptureFAB />
      <BottomNav />
      <GlobalSearch />
      <LevelUpCelebration />
      <FocusTimer
        isOpen={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        onReopen={() => setFocusTimerOpen(true)}
      />
      <OnboardingTour />
      <RecurringXPEffect />
    </div>
  );
}
