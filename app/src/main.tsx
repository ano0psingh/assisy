import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { DataVersionProvider } from './context/DataVersionContext.tsx'
import { TaskProvider } from './context/TaskContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { GoalProvider } from './context/GoalContext.tsx'
import { HabitProvider } from './context/HabitContext.tsx'
import { DailyLogProvider } from './context/DailyLogContext.tsx'
import { ProjectProvider } from './context/ProjectContext.tsx'
import { GamificationProvider } from './context/GamificationContext.tsx'
import { FeedProvider } from './context/FeedContext.tsx'
import { UndoProvider } from './components/common/UndoToast.tsx'
import { ToastProvider } from './components/common/Toast.tsx'
import { CloudSyncEffect } from './components/auth/CloudSyncEffect.tsx'
import { MigrationModalTrigger } from './components/auth/MigrationModalTrigger.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'

// The outer boundary catches failures in the providers themselves, which sit
// above the router and so cannot be caught by the per-route one.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <AuthProvider>
      <ThemeProvider>
        <DataVersionProvider>
          <CloudSyncEffect />
          <MigrationModalTrigger />
          <GamificationProvider>
            <GoalProvider>
              <TaskProvider>
                <HabitProvider>
                  <DailyLogProvider>
                    <ProjectProvider>
                      <FeedProvider>
                        <UndoProvider>
                          <ToastProvider>
                            <App />
                          </ToastProvider>
                        </UndoProvider>
                      </FeedProvider>
                    </ProjectProvider>
                  </DailyLogProvider>
                </HabitProvider>
              </TaskProvider>
            </GoalProvider>
          </GamificationProvider>
        </DataVersionProvider>
      </ThemeProvider>
    </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
