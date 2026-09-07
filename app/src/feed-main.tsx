import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeedProvider } from './context/FeedContext';
import { Feed } from './pages/Feed';

/**
 * `feed.html` is a second Vite entry, so a direct visit or hard refresh of /feed
 * is served by this page rather than by the SPA route of the same name. Feed
 * reads the `?focus=` search param, which needs router context — without it the
 * page threw on mount and rendered nothing.
 */
export function FeedApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <FeedProvider>
            <main className="min-h-screen bg-[var(--canvas)] px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl">
                <Feed />
              </div>
            </main>
          </FeedProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FeedApp />
  </StrictMode>,
);
