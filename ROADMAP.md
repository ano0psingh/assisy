# Assisy — Product Roadmap

## Completed (Phase 1)

- [x] Fix Dashboard task count to include project tasks (shows "X of Y done")
- [x] Remove duplicate stat card rows on Dashboard
- [x] Add backlog count badge to "Plan Day" button
- [x] Show human-readable recurrence pattern on task cards (e.g., "Daily", "Mon, Wed, Fri", "Monthly 15th")
- [x] Richer weekly summary with completion/pending/streak/projects and link to full review
- [x] Calendar icon behavior: hover-only when not added to today, always-visible green when added
- [x] Project badge clickable on Dashboard to navigate to /projects
- [x] Remove from today button on Dashboard for project tasks
- [x] Data persistence fix: always save to localStorage + cloud sync
- [x] Tiptap rich text editor for all description fields
- [x] Mobile responsive layout with hamburger menu
- [x] PWA support (installable, offline-capable)
- [x] Bullet list bullets visible in Tiptap editor

---

## Phase 2 — Feature Integration (Next)

### Feed + Goals Integration
- Add "Save to Goal" button on feed article cards
- Show "Related Articles" section on Goal detail page with reading stats
- Track learning progress per goal (articles read, time invested, topics covered)
- Surface learning insights: "You've read 5 articles on System Design — create a goal?"

### Advanced Task Filtering
- Add filter chips on Tasks page: Overdue, Due Today, Due This Week
- Priority filters: High Priority Only
- Project filter: filter tasks by their linked project
- Effort filters: Quick Wins, Medium, Long tasks

### Recurring Task Management
- Edit recurrence pattern from task card (change frequency, skip occurrence)
- "Pause recurring" option (1 week / 1 month)
- Show "Last completed: 3 days ago" for recurring tasks
- "Edit this instance only" vs "Edit all future instances" choice

### Project Badge on Task Cards
- Show project origin badge (e.g., "TKPI -> Value Based Bidding") on TaskCard in Tasks page
- Consistent project labeling across Dashboard, Tasks, and Calendar views

### Enhanced Statistics Page
- Weekly completion rate with target tracking
- Most productive time of day analysis
- Habit streak risk warnings
- Learning stats from Feed (articles read, avg quality, topics)
- Personalized recommendations based on usage patterns

---

## Phase 3 — Polish and Delight (Later)

### Smart Feature Discovery / Onboarding
- Progressive onboarding tips for first 7 days
- Contextual nudges: "You have 5 pending tasks — try Plan Your Day"
- Periodic reminders: "3 high-quality articles waiting in your Feed"
- Feature highlight: suggest goal creation when reading pattern detected

### Enhanced Weekly Review
- Per-project progress breakdown (e.g., "TKPI: 50% -> 55%")
- Habit streak trends and patterns
- Content consumption summary from Feed
- Actionable insights: "Task completion trending down — adjust scope?"

### Mobile UX Improvements
- Bottom navigation bar for mobile (Home, Tasks, Calendar, Feed, More)
- Swipe-to-complete/delete gestures on task cards
- Collapsible stat cards on mobile for less scrolling
- Bottom sheet for task action menus

### Daily Check-In Enhancement
- Quick-access shortcut from Dashboard
- Show "Complete 4 habits" count on the button
- Inline completion mode without full modal

### Goal-Project Linking
- "This project supports:" goal selector on project edit
- Show goal alignment on project cards
- Cross-reference goal progress from project milestones
