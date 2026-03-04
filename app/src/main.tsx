import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TaskProvider } from './context/TaskContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { GoalProvider } from './context/GoalContext.tsx'
import { HabitProvider } from './context/HabitContext.tsx'
import { DailyLogProvider } from './context/DailyLogContext.tsx'
import { ProjectProvider } from './context/ProjectContext.tsx'
import { GamificationProvider } from './context/GamificationContext.tsx'
import { UndoProvider } from './components/common/UndoToast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <GamificationProvider>
        <GoalProvider>
          <TaskProvider>
            <HabitProvider>
              <DailyLogProvider>
                <ProjectProvider>
                  <UndoProvider>
                    <App />
                  </UndoProvider>
                </ProjectProvider>
              </DailyLogProvider>
            </HabitProvider>
          </TaskProvider>
        </GoalProvider>
      </GamificationProvider>
    </ThemeProvider>
  </StrictMode>,
)
