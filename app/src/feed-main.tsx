import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeedProvider } from './context/FeedContext';
import { Feed } from './pages/Feed';

function FeedApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FeedProvider>
          <Feed />
        </FeedProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FeedApp />
  </StrictMode>,
);
