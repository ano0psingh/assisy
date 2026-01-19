# Assisy - Feature Documentation

## Overview
**Assisy** is a personal productivity web application with gamification elements. It helps track tasks, goals, habits, and professional projects with an RPG-inspired experience system.

**URL**: http://localhost:3000  
**Tech Stack**: React + TypeScript + Vite + Tailwind CSS  
**Storage**: Local Storage (browser-based, persists across sessions)

---

## Table of Contents
1. [Navigation & Layout](#1-navigation--layout)
2. [Dashboard](#2-dashboard)
3. [Tasks](#3-tasks)
4. [Goals](#4-goals)
5. [Habits](#5-habits)
6. [Projects](#6-projects)
7. [Achievements](#7-achievements)
8. [Stats](#8-stats)
9. [Gamification System](#9-gamification-system)

---

## 1. Navigation & Layout

### Header Bar
- **Logo**: "Assisy" with tagline "Your personal productivity assistant"
- **Quick Add Task**: Button to quickly add tasks from anywhere
- **Theme Toggle**: Switch between Dark and Light mode
- **XP Display**: Shows current XP, level, and progress to next level
- **User Profile**: Shows user name "Kage" and current title

### Navigation Tabs
| Tab | Description |
|-----|-------------|
| Dashboard | Home view with daily tasks and weekly review |
| Tasks | All tasks with filters and views |
| Goals | Goal management with sub-goals |
| Habits | Habit tracking with streaks |
| Projects | Professional project management |
| Achievements | Badges and milestones (placeholder) |
| Stats | Statistics and analytics |

### Expected Behavior
- Active tab is highlighted with violet underline
- All navigation is instant (client-side routing)
- Theme preference persists across sessions

---

## 2. Dashboard

### 2.1 Welcome Section
- Shows greeting: "Welcome back, Kage! 👋"
- Displays current date (e.g., "Monday, January 19")
- "New Task" button to create tasks

### 2.2 Quote of the Day Card
- Displays a motivational quote
- Shows quote author
- Quote changes daily (based on day of year)

### 2.3 Stats Cards (3 cards)
| Card | Description |
|------|-------------|
| Tasks for Today | Count of tasks due/planned for today |
| Experience Points | Total XP earned + potential XP from today's tasks |
| Tasks Completed | Total lifetime completed tasks |

### 2.4 Active Streaks Widget
- Shows top 3 habits with active streaks
- Displays habit name and streak count (e.g., "7d")
- Color-coded: Orange (7+ days), Amber (3-6 days), Yellow (1-2 days)
- Only appears if user has habits with streaks > 0

### 2.5 Today's Tasks Section

#### Structure
Tasks are grouped by category in collapsible sections:

1. **Projects** (if any project tasks added to today)
   - Shows project tasks with full actions
   - Displays: Project → Sub-Project path
   - Status badge (Backlog/In Progress/Done)
   - Actions: Remove from Today, Edit, Delete

2. **Work** (Professional category)
   - Expanded by default
   - Shows task count and completion ratio

3. **Personal** (Personal category)
   - Collapsed by default
   - Click to expand

4. **Financial** (Financial category)
   - Collapsed by default
   - Click to expand

#### Task Card Display
Each task shows:
- Checkbox (click to complete/uncomplete)
- Title (click to edit)
- Description (if any)
- Badges: Category, Priority, Effort, XP value, Recurring, Due date
- Action buttons: Edit, Delete, Remove from Today (if manually added)

#### Expected Behaviors
- **Carried Forward**: Tasks from previous days that weren't completed show "Carried Forward" badge
- **Recurring Tasks**: Daily/weekly tasks automatically appear each day
- **Due Today**: Tasks with today's due date automatically appear
- **Overdue**: Tasks past due date appear with red "overdue" badge
- **Manually Added**: Tasks added via "Plan Day" show "Added" badge

### 2.6 Plan Your Day Modal
- **Trigger**: Appears automatically on first visit each day OR click "Plan Day" button
- **Content**:
  - List of tasks already in today
  - Suggested tasks (pending tasks not yet in today)
- **Actions**:
  - Add task to today
  - Remove task from today
- **Behavior**: Modal won't auto-show again after dismissed (tracked per day)

### 2.7 Weekly Work Review Widget
Shows professional work summary for current week (Monday-Sunday):

| Metric | Description |
|--------|-------------|
| Done | Count of completed Professional tasks this week |
| Backlog | Count of pending Professional tasks |
| Carried | Count of carried forward Professional tasks |

- Lists completed tasks with completion day
- Lists pending/backlog tasks
- Shows "carried" badge for carried forward tasks

---

## 3. Tasks

### 3.1 Task Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | String | Task name (required) |
| Description | String | Optional details |
| Category | Enum | Personal, Financial, Professional |
| Priority | Enum | High, Low |
| Effort | Enum | High, Low |
| Status | Enum | Pending, Completed, Carried Forward |
| Due Date | Date | Optional deadline |
| Goal | Reference | Optional link to a goal |
| Recurring | Boolean | Whether task repeats |
| Recurrence Pattern | Enum | Daily, Weekly (if recurring) |
| XP Value | Number | Calculated from priority × effort (non-Professional only) |

### 3.2 XP Calculation (Personal & Financial only)
| Priority | Effort | XP Multiplier |
|----------|--------|---------------|
| High | High | 40 XP (4x) |
| High | Low | 20 XP (2x) |
| Low | High | 20 XP (2x) |
| Low | Low | 10 XP (1x) |

**Note**: Professional tasks earn 0 XP (tracked separately for work review)

### 3.3 Filter Bar
| Filter | Options |
|--------|---------|
| Status | All, Pending, Completed |
| Category | All, Personal, Financial, Professional |

### 3.4 View Modes

#### List View (Default)
- Tasks sorted by: Pending first, then by Priority (High first), then by Effort
- **Pending Tasks**: Shown in main list
- **Completed Tasks**: Hidden in collapsible "Completed Tasks" dropdown at bottom
  - Click to expand/collapse
  - Shows count of completed tasks

#### By Goal View
- Tasks grouped under their linked goals
- Shows goal progress bar
- Sub-goals nested under parent goals
- "Unlinked Tasks" section for tasks without goals
- Expandable/collapsible sections

#### Matrix View (2×2 Priority/Effort)
| Quadrant | Priority | Effort | Label |
|----------|----------|--------|-------|
| Top-Left | High | High | "Do First" - Critical tasks |
| Top-Right | High | Low | "Quick Wins" - Do for momentum |
| Bottom-Left | Low | High | "Schedule" - Plan dedicated time |
| Bottom-Right | Low | Low | "Fill Time" - Spare moments |

### 3.5 Task Actions
| Action | Description |
|--------|-------------|
| Complete | Click checkbox to mark complete (awards XP) |
| Uncomplete | Click completed checkbox to revert |
| Edit | Click pencil icon or title to open edit form |
| Delete | Click trash icon (immediate, no confirmation) |
| Add to Today | Click calendar+ icon (appears on Tasks page) |
| Move to Project | Click folder icon to move task to a project |

### 3.6 Task Form (Create/Edit)
Fields:
- Title (required)
- Description (optional)
- Category dropdown
- Priority toggle (High/Low)
- Effort toggle (High/Low)
- Due Date picker
- Goal dropdown (optional)
- Recurring checkbox + pattern selector

### 3.7 Move to Project Feature
- Click folder icon on any task
- Modal opens with:
  - Task details preview
  - Project dropdown (active projects only)
  - Sub-Project dropdown (appears after selecting project)
- On confirm:
  - Creates new ProjectTask with same title, description, priority, effort, due date
  - Deletes original task
  - Task now appears in Projects page

---

## 4. Goals

### 4.1 Goal Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | String | Goal name (required) |
| Description | String | Optional details |
| Category | Enum | Personal, Financial, Professional |
| Status | Enum | Active, Completed, Archived |
| Linked Tasks | Array | Tasks contributing to this goal |
| Parent Goal | Reference | Optional (for sub-goals) |
| Sub-Goals | Array | Child goals (if parent) |
| Progress | Number | 0-100% calculated automatically |

### 4.2 Progress Calculation
- **Leaf Goal** (no sub-goals): `(Completed Tasks / Total Linked Tasks) × 100`
- **Parent Goal** (has sub-goals): `Average of all sub-goal progress`

### 4.3 Filter Bar
| Filter | Options |
|--------|---------|
| Status | All, Active, Completed, Archived |
| Category | All, Personal, Financial, Professional |

### 4.4 Goal Card Display
- Color-coded icon by category
- Title and status badge
- Progress bar with percentage
- Task count: "X/Y tasks" or "X sub-goals"
- Sub-goal badge (if has children)
- Expand/collapse toggle (if has sub-goals)
- Action buttons (on hover or always visible)

### 4.5 Goal Hierarchy
- Parent goals show expand/collapse arrow
- Sub-goals indented under parent with connecting line
- Sub-goals can be created from:
  - Goal form (select parent)
  - Goal card menu (Add Sub-Goal)

### 4.6 Goal Actions
| Action | Icon | Description |
|--------|------|-------------|
| Complete | ✓ | Mark goal complete (also completes all linked tasks) |
| Archive | 📦 | Move to archived (hide from active view) |
| Reactivate | ↩️ | Bring back from archived/completed |
| Edit | ✏️ | Open edit form |
| Delete | 🗑️ | Delete goal + optionally all linked tasks |
| Add Sub-Goal | + | Create child goal |

### 4.7 Goal Detail Modal
Opens when clicking a goal card:

**Header Section:**
- Goal title and description
- Category and status badges
- Progress bar
- Edit/Delete buttons

**Linked Tasks Section:**
- List of tasks linked to this goal
- Each task shows:
  - Checkbox (click to complete/uncomplete)
  - Title
  - Unlink button
- "Link Task" dropdown to add existing tasks
  - Only shows tasks NOT linked to any goal
  - Error if trying to link already-linked task

**Sub-Goals Section** (if parent):
- List of child goals with progress

### 4.8 Expected Behaviors
- **Goal Completion**: When marked complete, ALL linked tasks are also marked complete
- **Cascading Delete**: Deleting parent goal deletes all sub-goals and their tasks
- **Task Linking Rule**: One task can only belong to ONE goal
- **Orphan Prevention**: Tasks with deleted goals become "unlinked"

---

## 5. Habits

### 5.1 Habit Properties
| Property | Type | Description |
|----------|------|-------------|
| Name | String | Habit name (required) |
| Tracking Type | Enum | Duration (minutes), Count, Boolean |
| Category | String | Custom category |
| Streak Count | Number | Consecutive days |
| Last Completed Date | Date | For streak calculation |
| XP Per Unit | Number | XP earned per unit tracked |

### 5.2 Habit Card Display
- Habit name and category
- Tracking type indicator
- Current streak with fire icon
- XP per unit
- Log button to record progress
- Edit/Delete buttons

### 5.3 Habit Tracking Types
| Type | Input | Example |
|------|-------|---------|
| Duration | Minutes | "Meditation: 15 min" |
| Count | Number | "Water: 8 glasses" |
| Boolean | Yes/No | "Exercise: Done" |

### 5.4 Streak Calculation
- Streak increments when habit is logged on consecutive days
- Streak resets to 0 if a day is missed
- Streak maintains if logged today or yesterday

### 5.5 Contribution Graph
- GitHub-style heatmap
- Shows last 12 months of habit activity
- Color intensity based on completion
- Hover shows date and value

### 5.6 Daily Check-in
Modal for logging daily habits:
- Shows all defined habits
- Input field based on tracking type
- Submit logs values and updates streaks

---

## 6. Projects

### 6.1 Project Hierarchy
```
📁 Project
   └── 📂 Sub-Project
          └── ✅ Task
                 └── ✅ Sub-Task (recursive)
```

### 6.2 Project Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | String | Project name (required) |
| Description | String | Ideas, notes, context |
| Status | Enum | Active, Completed, On Hold |
| Color | Hex | Visual identifier (8 preset colors) |
| Deadline | Date | Optional |
| Sub-Projects | Array | Child sub-projects |

### 6.3 Sub-Project Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | String | Sub-project name (required) |
| Description | String | Optional details |
| Status | Enum | Backlog, In Progress, Done |
| Deadline | Date | Optional |
| Tasks | Array | Project tasks |

### 6.4 Project Task Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | String | Task name (required) |
| Description | String | Notes, details |
| Status | Enum | Backlog, In Progress, Done |
| Priority | Enum | High, Medium, Low |
| Effort | Enum | High, Medium, Low |
| Tags | Array | Labels (bug, feature, urgent, etc.) |
| Time Spent | Number | Minutes logged (optional) |
| Parent Task | Reference | For sub-tasks |
| Sub-Tasks | Array | Child tasks |
| Deadline | Date | Optional |
| Focused Today | Boolean | Added to daily dashboard |

### 6.5 Projects Page Layout

**Left Panel**: Project List
- Active projects with progress bars
- Click to select and view details
- Completed/On Hold projects in separate section (dimmed)

**Right Panel**: Detail View
- **Project Selected**: Shows sub-projects list
- **Sub-Project Selected**: Shows tasks list with status

### 6.6 Project Progress Calculation
- **Project**: Average of all sub-project progress
- **Sub-Project**: `(Done Tasks / Total Tasks) × 100`
- **Task with Sub-Tasks**: `(Done Sub-Tasks / Total Sub-Tasks) × 100`

### 6.7 Status Flow
```
Backlog → In Progress → Done
   ↑______________|_________|
   (can go back to any previous status)
```

Click status icon to cycle through statuses.

### 6.8 Project Task Actions
| Action | Description |
|--------|-------------|
| Toggle Status | Click circle icon to cycle status |
| Add to Today | Click calendar icon to add to dashboard |
| Remove from Today | Click calendar-minus icon |
| Add Sub-Task | Click + icon to create child task |
| Edit | Click pencil icon |
| Delete | Click trash icon (with confirmation) |

### 6.9 Tags
Predefined tags: `bug`, `feature`, `urgent`, `research`, `documentation`, `refactor`, `testing`

Custom tags can be typed and added.

### 6.10 Dashboard Integration
- Project tasks can be "added to today"
- They appear in Dashboard under "Projects" section
- Full actions available (edit, delete, status change, remove from today)
- Shows project → sub-project path for context

---

## 7. Achievements (Placeholder)

Currently shows placeholder content. Planned features:
- Milestone badges (first task, 100 tasks, etc.)
- Streak badges (7-day, 30-day)
- Category mastery badges
- Special achievements

---

## 8. Stats

### 8.1 Overview Cards
- Total Tasks Completed
- Total XP Earned
- Current Level
- Active Streaks

### 8.2 Category Breakdown
Pie chart or bar chart showing task distribution:
- Personal tasks count
- Financial tasks count
- Professional tasks count

### 8.3 Completion Trends
- Weekly/monthly completion rates
- Streak history

---

## 9. Gamification System

### 9.1 XP System
- Earned by completing Personal and Financial tasks
- Professional tasks earn 0 XP (tracked separately)
- XP shown in header with level progress bar

### 9.2 Level Progression
- 100 XP = 1 Level
- Level displayed as "Lv X" in header
- Progress bar shows XP toward next level

### 9.3 Titles (Based on Level)
| Level Range | Title |
|-------------|-------|
| 1-5 | Task Initiate |
| 6-10 | Task Apprentice |
| 11-20 | Task Warrior |
| 21-30 | Taskmaster |
| 31-50 | Grand Taskmaster |
| 51+ | Legendary Achiever |

### 9.4 XP Animation
- When completing a non-Professional task
- Shows "+XX XP" floating animation
- Appears briefly then fades

---

## Data Persistence

### Local Storage Keys
| Key | Data |
|-----|------|
| `life_rpg_tasks` | All tasks |
| `life_rpg_goals` | All goals |
| `life_rpg_habits` | All habits |
| `life_rpg_daily_logs` | Daily check-in logs |
| `assisy_projects` | All projects |
| `assisy_subprojects` | All sub-projects |
| `assisy_project_tasks` | All project tasks |
| `life_rpg_theme` | Theme preference (dark/light) |
| `life_rpg_plan_your_day_*` | Plan Your Day modal shown dates |

### Expected Behaviors
- Data persists across browser sessions
- Data is per-browser (not synced across devices)
- Clearing browser data will delete all app data
- Port changes (e.g., 3000 → 3001) may cause data to appear lost (different origin)

---

## Known Limitations

1. **No Backend**: All data in browser local storage
2. **Single User**: No authentication or multi-user support
3. **No Sync**: Data doesn't sync across devices/browsers
4. **No Undo**: Deletes are immediate (some have confirmation)
5. **No Offline**: Requires browser to be online to load app
6. **No Export**: No way to export/backup data (yet)

---

## Testing Checklist

### Tasks
- [ ] Create task with all fields
- [ ] Edit task
- [ ] Delete task
- [ ] Complete/uncomplete task
- [ ] Recurring task appears daily
- [ ] Carried forward badge on old tasks
- [ ] Move task to project
- [ ] Filter by status/category
- [ ] Switch between view modes

### Goals
- [ ] Create goal
- [ ] Create sub-goal
- [ ] Link task to goal
- [ ] Unlink task from goal
- [ ] Progress updates when tasks complete
- [ ] Complete goal (cascades to tasks)
- [ ] Delete goal (cascades to sub-goals)
- [ ] Archive/reactivate goal

### Habits
- [ ] Create habit (all tracking types)
- [ ] Log habit values
- [ ] Streak increments on consecutive days
- [ ] Streak resets on missed day
- [ ] Contribution graph displays correctly

### Projects
- [ ] Create project
- [ ] Create sub-project
- [ ] Create task in sub-project
- [ ] Create sub-task
- [ ] Toggle task status
- [ ] Add task to today
- [ ] Task appears in dashboard
- [ ] Edit task from dashboard
- [ ] Delete task
- [ ] Project progress calculates correctly

### Dashboard
- [ ] Plan Your Day modal appears on first visit
- [ ] Quote of the day displays
- [ ] Category sections collapse/expand
- [ ] Tasks group correctly
- [ ] Weekly review shows correct data
- [ ] XP animation on task complete

### Theme
- [ ] Toggle between dark/light
- [ ] Preference persists on reload

---

*Document Version: 1.0*  
*Last Updated: January 19, 2026*
