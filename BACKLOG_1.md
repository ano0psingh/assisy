# Life RPG - Backlog & Future Ideas

## How to Use This File
Add ideas here as they come up. When starting a new phase, pull relevant items into the main plan.

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

---

## Notes
- Keep gamification fun, not stressful
- The app should reduce friction, not add it
- If a feature feels like a chore to use, reconsider it

---

*Last updated: January 9, 2026 - Phase 1 Complete!*
