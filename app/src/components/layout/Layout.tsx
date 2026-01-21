import type { ReactNode } from 'react';
import { Header } from './Header';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className={`border-t py-4 px-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`max-w-6xl mx-auto flex items-center justify-between text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          <span>Assisy</span>
          <span>Built for productivity 🚀</span>
        </div>
      </footer>
    </div>
  );
}
