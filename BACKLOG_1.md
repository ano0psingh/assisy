# Assisy - Backlog & Future Ideas

## How to Use This File
Add ideas here as they come up. When starting a new phase, pull relevant items into the main plan.

**Note**: Project renamed from "Life RPG" to "Assisy" on January 19, 2026.

---

## Feature Backlog

### High Priority (Pull into next phase)
- [ ] Mobile responsive design
- [ ] Keyboard shortcuts throughout the app
- [ ] Data export/import functionality

### Medium Priority
- [ ] Pomodoro timer integration (optional tracking for focused work sessions)
- [ ] Notifications/reminders system
- [ ] Calendar integration (Google Calendar sync)
- [ ] Weekly/Monthly goal setting
- [ ] Themes customization (multiple dark themes, accent colors)
- [ ] Task templates (quickly create common recurring tasks)
- [ ] Bulk task operations (complete multiple, delete multiple)

### Low Priority / Nice to Have
- [ ] Social features (accountability partner, share achievements)
- [ ] Desktop notifications
- [ ] Browser extension for quick add
- [ ] Habit stacking suggestions (AI-powered)
- [ ] Progress photos/visual timeline
- [ ] Voice input for quick task add
- [ ] Widget for desktop (Electron app later?)

### Separate Projects (Not part of main app)
- [ ] Stock portfolio tracker (Kage mentioned separate idea)

---

## Technical Debt & Improvements
- [ ] Add comprehensive test coverage
- [ ] Performance optimization for large task lists
- [ ] Offline-first with sync capability
- [ ] PWA conversion for mobile
- [ ] Analytics dashboard (personal usage patterns)

---

## UX Improvements to Consider
- [ ] Onboarding flow for new users
- [ ] Customizable dashboard widgets
- [ ] Drag-and-drop task reordering
- [ ] Task dependencies (can't complete X until Y is done)
- [ ] Time blocking view (calendar-style daily view)
- [ ] Focus mode (hide everything except current task)
- [ ] Quote of the Day customization (skip button, different categories)
- [ ] Allow users to save favorite quotes

---

## Gamification Expansions
- [ ] Daily challenges (random bonus XP opportunities)
- [ ] Seasonal events/themes
- [ ] Achievement sharing (generate shareable images)
- [ ] Personal bests tracking
- [ ] Milestone celebrations with animations
- [ ] Custom achievement creation
- [ ] XP decay for neglected skill trees (use it or lose it)

---

## AI Features (Requires Claude API)
- [ ] Weekly AI summary
- [ ] MIC review draft generation
- [ ] Smart task suggestions based on goals
- [ ] Habit pattern analysis and recommendations
- [ ] Natural language task input ("remind me to call mom every Sunday")

---

## Ideas Parking Lot
*Raw ideas that need more thought*

- Integration with other apps (Todoist import, etc.)
- Team/family shared goals
- Public profile/portfolio of achievements
- Gamification marketplace (trade achievements? probably overkill)
- Mood tracking correlation with productivity
- Weather/sleep correlation analysis
- Life areas balance wheel visualization

---

## Completed / Implemented
*Move items here when done*

### Phase 1 (January 9, 2026)
- [x] Project setup (React + TypeScript + Vite + Tailwind)
- [x] Dark theme with gaming aesthetic (glassmorphism)
- [x] Light theme option
- [x] Theme toggle (light/dark)
- [x] Dashboard home page with stats
- [x] Task CRUD (create, read, delete)
- [x] Task properties: title, description, category, priority, effort
- [x] Quick add task in header
- [x] Task list view with priority sorting
- [x] Task status toggle (complete/uncomplete)
- [x] Recurring tasks (daily, weekly)
- [x] Carry forward incomplete tasks
- [x] Local storage persistence with TaskContext
- [x] Top navigation bar with React Router
- [x] Quote of the Day modal (100+ motivational quotes)
- [x] XP calculation (4x/2x/2x/1x multipliers)
- [x] Level progression (100 XP per level)
- [x] User title progression (Initiate → Legendary Achiever)
- [x] Stats page with category breakdowns
- [x] Placeholder pages for Goals, Habits, Achievements

### Phase 2 (January 10-12, 2026)
- [x] Goal CRUD (create, read, update, delete)
- [x] Link tasks to goals
- [x] Goal progress calculation
- [x] Goals dashboard with filters and progress bars
- [x] Goal detail modal with task management
- [x] Complete/Archive/Reactivate goals

### Phase 3 (January 13-15, 2026)
- [x] Daily check-in form
- [x] Habit definitions (name, tracking type, category)
- [x] Habit logging with duration/count/boolean
- [x] Streak calculation
- [x] Daily log history view
- [x] Habit contribution graph (GitHub-style)

### Phase 4 (January 16-18, 2026)
- [x] Tasks page: Group/filter by goals
- [x] Sub-goals: Parent-child hierarchy
- [x] Sub-goals: Nested progress calculation
- [x] Goal hierarchy view with expandable tree
- [x] Editable tasks, goals, habits (edit buttons)
- [x] Due dates on tasks
- [x] Completed tasks collapsible section

### Phase 4.5: Daily Workflow (January 19, 2026)
- [x] "Plan Your Day" modal on first daily visit
- [x] "Add to Today" / "Remove from Today" buttons
- [x] Work-focused daily view (Professional first)
- [x] Collapsible category sections
- [x] Weekly Work Review widget
- [x] Quote of the Day as card (removed popup)

### Phase 4.6: Projects (January 19, 2026)
- [x] Project CRUD with colors
- [x] Sub-Project CRUD with 3 statuses (Backlog/In Progress/Done)
- [x] Project Tasks with tags, priority, effort
- [x] Sub-Tasks (unlimited nesting)
- [x] "Add to Today" for project tasks
- [x] "Move to Project" for regular tasks
- [x] Project tasks in Dashboard with full actions
- [x] Projects navigation page

---

## Notes
- Keep gamification fun, not stressful
- The app should reduce friction, not add it
- If a feature feels like a chore to use, reconsider it
- Project renamed to "Assisy" - folder is now `/assisy/app/`

---

*Last updated: January 19, 2026 - Phases 1-4.6 Complete!*
