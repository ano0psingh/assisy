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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <GoalProvider>
        <TaskProvider>
          <HabitProvider>
            <DailyLogProvider>
              <ProjectProvider>
                <App />
              </ProjectProvider>
            </DailyLogProvider>
          </HabitProvider>
        </TaskProvider>
      </GoalProvider>
    </ThemeProvider>
  </StrictMode>,
)
