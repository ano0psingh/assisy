import { useState, useCallback, type ReactNode } from 'react';
import { Header } from './Header';
import { useTheme } from '../../context/ThemeContext';
import { GlobalSearch } from '../common/GlobalSearch';
import { FocusTimer } from '../common/FocusTimer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);

  const handleTimerToggle = useCallback(() => {
    setFocusTimerOpen(prev => !prev);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <Header onOpenFocusTimer={handleTimerToggle} />
      <main className="flex-1 px-4 py-4 md:px-6 md:py-8">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      <footer className={`border-t py-4 px-4 md:px-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`max-w-6xl mx-auto flex items-center justify-between text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          <span>Assisy</span>
          <span>Built for productivity</span>
        </div>
      </footer>

      <GlobalSearch />
      <FocusTimer
        isOpen={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        onReopen={() => setFocusTimerOpen(true)}
      />
    </div>
  );
}
