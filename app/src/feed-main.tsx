import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
function FeedApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <FeedProvider>
            <Feed />
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
