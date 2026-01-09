# Life RPG - Personal Productivity System

## Project Overview

A personal productivity website designed as an RPG-style life management system where Kage tracks tasks, goals, habits, and levels up across different skill trees.

**Primary Use Case**: Daily task tracking - first thing opened at work login to plan the day, checked at logout to review and prepare for next day.

---

## Core Concepts

### User Profile
- **User**: Kage (Anoop)
- **Platform**: Desktop-first (mobile consideration for later)
- **Storage**: Local storage initially → Backend migration later

### Design Principles
- Dark mode with gaming-inspired minimalist aesthetics
- Clean, fast, keyboard-friendly
- Gamification for Personal & Financial tasks only (not Professional)
- Professional tasks feed into MIC review system

---

## Entity Structure

### 1. Tasks
**Properties:**
- id (uuid)
- title (string)
- description (string, optional)
- category: Personal | Financial | Professional
- priority: High | Low
- effort: High | Low
- status: Pending | Completed | Carried Forward
- goalId (optional link to parent goal)
- isRecurring: boolean
- recurrencePattern: daily | weekly | specific_days[]
- createdAt, completedAt, dueDate
- xpValue (calculated from priority × effort, only for Personal/Financial)

**2x2 Matrix:**
```
                    HIGH EFFORT          LOW EFFORT
HIGH PRIORITY    |  Big Rocks          |  Quick Wins (Do Now!)
LOW PRIORITY     |  Major Projects     |  Fill-ins
```

**XP Multipliers (Personal & Financial only):**
- High Priority + High Effort: 4x base XP
- High Priority + Low Effort: 2x base XP
- Low Priority + High Effort: 2x base XP  
- Low Priority + Low Effort: 1x base XP

### 2. Goals
**Properties:**
- id (uuid)
- title (string)
- description (string, optional)
- category: Personal | Financial | Professional
- status: Active | Completed | Archived
- linkedTaskIds[]
- parentGoalId (optional, for sub-goals)
- subGoalIds[] (optional, list of child goal IDs)
- progress (calculated % of completed tasks OR avg of sub-goal progress)
- createdAt, completedAt

### 3. Daily Log / Check-in
**Structured Form (all optional except date):**
- date
- energyLevel (1-10)
- wins (text)
- challenges (text)
- learnings (text)
- tomorrowFocus (text)
- habits: {
    meditation: minutes,
    reading: minutes,
    exercise: minutes,
    waterIntake: glasses,
    // extensible
  }

### 4. Habits
**Properties:**
- id (uuid)
- name (string)
- trackingType: duration (minutes) | count | boolean
- category (maps to skill tree)
- streakCount
- lastCompletedDate
- xpPerUnit (e.g., 1 XP per minute of meditation)

### 5. Skill Trees
**Categories:**
- 🏃 Health & Fitness (exercise, water, etc.)
- 📚 Learning & Growth (reading, courses, etc.)
- 💰 Financial (savings goals, financial tasks)
- 🎯 Productivity (task completion streaks)
- 🧘 Mindfulness (meditation, journaling)

**Properties:**
- name
- icon
- currentXP
- level (calculated from XP thresholds)
- linkedHabits[]
- linkedTaskCategories[]

### 6. Achievements / Badges
**Types:**
- Milestone badges (first task, 100 tasks, etc.)
- Streak badges (7-day, 30-day, 100-day streaks)
- Category mastery badges
- Special achievements (custom unlocks)

**Examples:**
- "First Blood" - Complete your first task
- "On Fire" - 7-day task streak
- "Centurion" - Complete 100 tasks
- "Bookworm" - 30-day reading streak
- "Zen Master" - 30-day meditation streak
- "Deep Focus" - 2hr uninterrupted work session

### 7. Titles (Unlockable Names)
Progression examples:
- Level 1-5: Task Initiate
- Level 6-10: Task Apprentice
- Level 11-20: Task Warrior
- Level 21-30: Taskmaster
- Level 31-50: Grand Taskmaster
- Level 51+: Legendary Achiever

### 8. MIC Tracker (Professional)
**Work Log Entry:**
- id
- title/projectName
- summary
- role
- impact (text + rating)
- difficulty (text + rating)
- leadership (text + rating)
- proofLinks[] (GitHub, Notion, PRD, etc.)
- date
- status: In Progress | Completed

### 9. Entertainment Watchlist
**Item Properties:**
- id
- title
- type: Movie | Anime | Show | VideoGame
- status: Want to Watch | Watching | Completed | Dropped
- timeSpent (hours)
- rating (optional)
- notes (optional)
- startedAt, completedAt

---

## UI/UX Design

### Color Scheme
- **Theme**: Dark mode
- **Aesthetic**: Gaming-inspired minimalist
- **Accent colors**: To be determined (thinking neon accents on dark background)

### Layout Structure
```
+----------------------------------------------------------+
|  Logo/Title          [Quick Add Task]        User/XP Bar |
+----------------------------------------------------------+
|  Sidebar    |           Main Content Area                |
|  - Dashboard|                                            |
|  - Tasks    |   (Changes based on selected view)         |
|  - Goals    |                                            |
|  - Habits   |                                            |
|  - MIC      |                                            |
|  - Watch    |                                            |
|  - Stats    |                                            |
+----------------------------------------------------------+
```

### Key Views

**1. Dashboard (Home/Daily View)**
- Today's tasks (carried forward + recurring + new)
- Quick add always visible at top
- Daily check-in prompt
- XP/Level/Streak summary widget
- Upcoming deadlines

**2. Tasks View**
- Default: List view sorted by priority, tagged with effort
- Toggle: 2x2 Matrix quadrant view
- Filters: Category, Status, Priority, Effort
- Tabs or filters for: Today | All | Completed

**3. Goals View**
- Active goals with progress bars
- Linked tasks visible under each goal
- Category filters

**4. Habits View**
- Today's habits checklist
- Streak counters
- Weekly/monthly habit grid (GitHub-style contribution graph)

**5. Skill Trees View**
- Visual tree/graph representation
- Each skill tree shows level, XP progress
- Click to expand and see contributing habits/tasks

**6. MIC Tracker View**
- List of work log entries
- Filter by project, date
- AI summary generation button
- Export/format for calibration doc

**7. Watchlist View**
- Grid or list of entertainment items
- Filter by type, status
- Time tracking summary

**8. Stats/Profile View**
- Overall level and title
- Achievement showcase
- All-time stats
- Weekly summaries history

---

## Development Phases

### Phase 1: Core Daily Driver ⬅️ START HERE
**Goal**: Get a working daily task tracker ASAP

**Features:**
- [x] Project setup (React + TypeScript + Vite + Tailwind)
- [x] Dark theme with gaming aesthetic
- [x] Light/Dark theme toggle
- [x] Dashboard home page
- [x] Task CRUD (create, read, update, delete)
- [x] Task properties: title, category, priority, effort
- [x] Quick add task (always visible at top)
- [x] Task list view with priority sorting
- [x] Task status toggle (complete/pending)
- [x] Recurring tasks (daily, weekly)
- [x] Carry forward incomplete tasks to next day
- [x] Local storage persistence
- [x] Top navigation bar (moved from sidebar)
- [x] Quote of the Day modal (motivational quotes on daily first visit)
- [x] XP calculation and level display
- [x] User title progression based on level

**Deliverable**: Usable daily task tracker

---

### Phase 2: Goals & Linking ✅ COMPLETE
**Features:**
- [x] Goal CRUD (create, read, update, delete)
- [x] Link tasks to goals (from task form or goal detail)
- [x] Goal progress calculation (auto-updates based on linked task completion)
- [x] Goals dashboard view (with filters, stats, progress bars)
- [x] Unlinked tasks remain independent
- [x] Goal detail modal with task management
- [x] Complete/Archive/Reactivate goals

---

### Phase 3: Daily Check-in & Habits ✅ COMPLETE
**Features:**
- [x] Daily check-in form (structured, optional fields)
- [x] Habit definitions (name, tracking type, category)
- [x] Habit logging with duration/count/boolean
- [x] Streak calculation (consecutive days)
- [x] Daily log history view
- [x] Habit contribution graph (GitHub-style)

---

### Phase 4: Tasks & Goals Enhancements ✅ COMPLETE
**Features:**
- [x] Tasks page: Group/filter tasks by linked goals
- [x] Tasks page: View for "Unlinked tasks" (tasks without goals)
- [x] Sub-goals: Allow creating child goals under a parent goal
- [x] Sub-goals: Nested progress calculation (parent progress = avg of sub-goals)
- [x] Goal hierarchy view: Expandable tree structure
- [ ] Task bulk actions: Link multiple tasks to a goal at once (backlog)

---

### Phase 5: Gamification
**Features:**
- [ ] XP calculation system
- [ ] Level progression
- [ ] Skill trees with visual representation
- [ ] Title unlocks
- [ ] Achievement/badge system
- [ ] Reward milestones (custom rewards)
- [ ] XP/level display in header

---

### Phase 6: MIC Tracker
**Features:**
- [ ] Work log entry CRUD
- [ ] Proof links management
- [ ] Filter and search
- [ ] AI summary generation (Claude API)
- [ ] Export formatting for calibration doc

---

### Phase 7: Entertainment & Extras
**Features:**
- [ ] Watchlist CRUD
- [ ] Type categorization (movie, anime, show, game)
- [ ] Status tracking
- [ ] Time spent logging
- [ ] Weekly AI summaries (Claude API)

---

### Phase 8: Backend Migration
**Features:**
- [ ] User authentication
- [ ] Database setup (PostgreSQL or similar)
- [ ] API layer
- [ ] Data migration from local storage
- [ ] Multi-device sync

---

## Backlog / Future Ideas
- Mobile responsive design
- Pomodoro timer integration (optional tracking)
- Notifications/reminders system
- Stock portfolio tracker (separate idea)
- Calendar integration
- Weekly/monthly goal setting
- Social features (accountability partner)
- Data export/import
- Themes customization
- Keyboard shortcuts throughout

---

## Tech Stack

**Frontend:**
- React 18+
- TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)
- Framer Motion (animations, optional)

**Storage (Phase 1-6):**
- Local Storage with structured JSON

**Backend (Phase 7):**
- TBD (Node.js + Express or similar)
- PostgreSQL
- JWT Auth

**AI Integration:**
- Claude API for summaries

---

## File Structure (Planned)
```
life-rpg/
├── src/
│   ├── components/
│   │   ├── common/        # Button, Input, Card, Modal, etc.
│   │   ├── layout/        # Sidebar, Header, Layout
│   │   ├── tasks/         # TaskCard, TaskList, TaskForm, TaskMatrix
│   │   ├── goals/         # GoalCard, GoalList, GoalForm
│   │   ├── habits/        # HabitTracker, HabitCard, StreakDisplay
│   │   ├── gamification/  # XPBar, SkillTree, AchievementBadge
│   │   ├── mic/           # WorkLogEntry, MICSummary
│   │   └── watchlist/     # WatchlistItem, WatchlistGrid
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── Goals.tsx
│   │   ├── Habits.tsx
│   │   ├── SkillTrees.tsx
│   │   ├── MICTracker.tsx
│   │   ├── Watchlist.tsx
│   │   └── Stats.tsx
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   ├── useTasks.ts
│   │   ├── useGoals.ts
│   │   └── useXP.ts
│   ├── utils/
│   │   ├── xpCalculator.ts
│   │   ├── streakCalculator.ts
│   │   └── dateUtils.ts
│   ├── types/
│   │   └── index.ts       # All TypeScript interfaces
│   ├── store/
│   │   └── localStorage.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Design References & Inspiration
- PlayStation trophy system
- RPG skill trees (Path of Exile, etc.)
- GitHub contribution graph
- Gaming HUDs (health/XP bars)
- Notion's clean minimalism

---

## Notes from Planning Session

1. **Hybrid task view**: Default list view (sorted by priority, effort tags) + toggle-able 2x2 matrix view for strategic planning

2. **Gamification scope**: Only Personal & Financial categories earn XP. Professional tasks tracked separately for MIC.

3. **Daily workflow optimized for**:
   - Morning: See carried tasks + recurring + quick add + motivational quote
   - Evening: Mark complete + optional check-in + see XP update

4. **Recurring patterns needed**: Daily, Weekly (specific day not required initially)

5. **Categories kept flat**: Personal, Financial, Professional - with option to add subcategories later

6. **Quote of the Day**: Shows motivational quote on first visit each day to set positive mindset for productivity

---

## Session Log

**Date**: January 9, 2026

**Discussed:**
- Core concept and entities
- Gamification system (XP, skill trees, achievements, titles)
- Phased development approach
- Tech stack decisions
- UI/UX preferences (dark, gaming-inspired, minimalist)
- Task matrix hybrid approach

**Decisions Made:**
- Start with Phase 1 (Core Daily Driver)
- Desktop-first, mobile later
- Local storage first, backend later
- Dark theme with gaming aesthetic
- No notifications for now (backlog)
- No time tracking on tasks for now (backlog)

**Next Step**: Build Phase 5 (Gamification)

---

*This document will be updated as we progress through phases.*
