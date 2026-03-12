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
import { CloudSyncEffect } from './components/auth/CloudSyncEffect.tsx'
import { MigrationModalTrigger } from './components/auth/MigrationModalTrigger.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
                          <App />
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
  </StrictMode>,
)
