import { useState, useCallback, type ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '../common/GlobalSearch';
import { FocusTimer } from '../common/FocusTimer';
import { LevelUpCelebration } from '../common/LevelUpCelebration';
import { QuickCaptureFAB } from '../common/QuickCaptureFAB';
import { OnboardingTour } from '../common/OnboardingTour';
import { RecurringXPEffect } from '../common/RecurringXPEffect';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);

  const handleTimerToggle = useCallback(() => {
    setFocusTimerOpen(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen flex flex-col dark:dark">
      <Header onOpenFocusTimer={handleTimerToggle} />
      <main className="flex-1 overflow-x-hidden px-4 pb-20 pt-4 md:px-6 md:pb-8 md:pt-6">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>

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
