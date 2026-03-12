# Assisy — Feature Overview & Testing Guide

**Live URL**: https://app-seven-lilac-81.vercel.app  
**Feed page** (opens in new tab): https://app-seven-lilac-81.vercel.app/feed.html  
**Tech stack**: React + Vite + TypeScript + Tailwind CSS + Supabase + Tiptap  

---

## 1. Authentication & Cloud Sync

| Feature | How to test |
|---------|-------------|
| **Google OAuth sign-in** | Click the user icon (top-right) → "Sign in" → "Continue with Google". Should redirect back after auth. |
| **Email/password sign-up & sign-in** | On the login modal, switch to email tab. Sign up with an email, then sign in. |
| **Profile avatar** | After signing in with Google, the top-right should show your Google profile photo (or initials). |
| **User menu** | Click the avatar → dropdown with "Account Settings" and "Sign out". |
| **Cloud sync** | Sign in → create a task → refresh the page. Task should persist. Open in an incognito window, sign in with the same account — same data should appear. |
| **Local-only mode** | Sign out → data still works via localStorage. Create tasks, refresh — they persist locally. |
| **Data migration** | Sign in for the first time with existing local data → a modal should offer to migrate local data to the cloud. |
| **Account settings** | Avatar → Account Settings → options for Reset Cloud Data, Download Cloud Backup, Delete Account. |

---

## 2. Dashboard (`/`)

| Feature | How to test |
|---------|-------------|
| **Greeting & daily quote** | Shows "Good morning/afternoon/evening, [Name]" with date and a rotating Stoic/productivity quote. |
| **Stats cards** | Four cards at top: Level, Tasks (today), Streak (days), Badges (unlocked). Verify numbers update after completing tasks. |
| **Today's task list** | Shows project tasks (with purple project badge) and regular tasks focused for today. |
| **Project badge → navigation** | Click the purple "Project → SubProject" badge on any project task. Should navigate to `/projects`. |
| **Remove project task from today** | Hover a project task → CalendarMinus icon appears on the right → click to remove from today's plan. |
| **Remove regular task from today** | On a regular task card, if it was manually added (green CalendarCheck visible), click it to remove. Or use the "..." menu → "Remove from Today". |
| **Complete task** | Click the checkbox on any task. It should animate, add XP, and update the stats cards. |
| **Plan Your Day** | Click "Plan Day" button (top-right of greeting). Shows suggested tasks from backlog to add to today. |
| **New Task** | Click "+ New Task" → full task creation form appears (title, description with rich text editor, category, priority, effort, recurrence, due date). |
| **Add from backlog** | Below today's tasks, "Add from backlog" section shows pending tasks with "+" to add them to today. |
| **This Week summary** | Bottom card showing the current week's date range with completed task count and habit completion count. |
| **Notification permission** | If browser notifications haven't been enabled, a banner appears asking to enable them. |

---

## 3. Tasks (`/tasks`)

| Feature | How to test |
|---------|-------------|
| **List view** | Default view showing pending tasks grouped, with completed tasks collapsible at bottom. |
| **Matrix view** | Toggle to "Matrix" — shows an Eisenhower matrix (4 quadrants by Priority × Effort). |
| **Goal groups view** | Toggle to "Goals" — tasks grouped by their linked goal. |
| **Create task** | Click "+ New Task" → form with title, rich text description (Tiptap editor: bold, italic, underline, headings, bullet/ordered lists, checklists, code blocks), category, priority, effort, recurrence, due date. |
| **Recurring tasks** | In task form, toggle "Recurring" → options: Daily, Weekly (pick days), Monthly (pick day of month), Custom (specific days of week). |
| **Add to Today indicator** | Hover a pending task → CalendarPlus icon appears. Click to add to today. A green CalendarCheck then stays always visible. Click it again to remove from today. |
| **Edit task** | Click task title or the pencil icon → edit form opens in an expandable modal (can go fullscreen). |
| **Delete task** | "..." menu → Delete (with confirmation). |
| **Move to Project** | "..." menu → "Move to Project" to convert a regular task into a project task. |
| **Filter by category** | Filter pills at top: All, Personal, Financial, Professional. |
| **Task description preview** | If a task has a description, it shows as a collapsible rich-text preview below the title. |
| **Carried forward indicator** | Tasks from previous days show an orange "↻ 2d ago" indicator. |
| **Due date display** | Tasks with due dates show "Today", "Tomorrow", "3d", or "2d overdue" next to the title. |

---

## 4. Goals (`/goals`)

| Feature | How to test |
|---------|-------------|
| **Create goal** | Click "+ New Goal" → title, description, category. |
| **Sub-goals** | Create a goal, then add sub-goals within it. |
| **Link tasks to goals** | From a task's edit form, link it to a goal. The goal's progress updates based on linked task completion. |
| **Progress tracking** | Goal cards show a progress bar based on linked task completion percentage. |
| **Goal statuses** | Filter by Active, Completed, Archived. |

---

## 5. Habits (`/habits`)

| Feature | How to test |
|---------|-------------|
| **Create habit** | Click "+ New Habit" → name, tracking type (boolean, count, duration), category. |
| **Track today** | On each habit card, mark as done (boolean), increment count, or log duration. |
| **Streak tracking** | Complete a habit daily → streak count increases. Miss a day → streak resets. |
| **Habit categories** | Filter by category. |
| **XP from habits** | Completing habits awards XP that contributes to your level. |

---

## 6. Projects (`/projects`)

| Feature | How to test |
|---------|-------------|
| **Create project** | Click "+ New Project" → title, description, color, deadline, tags. |
| **Sub-projects** | Inside a project, create sub-projects (e.g., milestones or workstreams). |
| **Project tasks** | Inside a sub-project, add tasks with title, description (rich text), priority, effort, deadline, tags, status (Backlog/In Progress/Done). |
| **Sub-tasks** | Tasks can have nested sub-tasks. Click the "+" icon on any task to add a sub-task. |
| **Status cycling** | Click the status circle on a task to cycle through Backlog → In Progress → Done. |
| **Add to Today** | Hover a task → CalendarPlus appears. Click to add to today's dashboard list. Green CalendarCheck shows when added. Click CalendarCheck to remove. |
| **Progress bars** | Project and sub-project cards show completion percentage based on task statuses. |
| **Filter tasks** | Inside a sub-project: All, Backlog, In Progress, Done. |
| **Filter projects** | Top-level: All, Active, Completed, On Hold. |
| **Edit project/sub-project** | Click the pencil icon → edit form with rich text notes editor. |
| **Long title handling** | Projects/tasks with very long titles should truncate with ellipsis, not push buttons off-screen. |

---

## 7. Calendar (`/calendar`)

| Feature | How to test |
|---------|-------------|
| **Month view** | Default view showing a monthly grid with colored dots for tasks (violet), project tasks (purple), and habits (emerald). |
| **Week view** | Toggle to "Week" → 7-day column view with tasks listed in each day. |
| **Click a day** | Click any day in month view → sidebar shows that day's tasks, project tasks, and habits. |
| **Drag & drop** | In week view, drag a task from one day to another to reschedule it. |
| **Inline task creation** | In week view, click "+ Add" on any day to create a task directly for that date. |
| **Project tasks on calendar** | Project tasks that are focused for a day or completed on a day appear on the calendar. |
| **Today highlight** | Today's date has a violet circle highlight. |
| **Navigation** | Use ← → arrows to navigate months/weeks. "Today" button jumps back to current date. |
| **Monthly stats** | Sidebar shows stats for the selected month: total tasks completed, habits tracked, streak. |

---

## 8. Achievements (`/achievements`)

| Feature | How to test |
|---------|-------------|
| **Achievement gallery** | Grid of all available achievements with locked/unlocked state. |
| **Achievement types** | Milestone (tasks completed), Streak (consecutive days), Mastery (skill levels), Special (unique actions). |
| **Unlock animation** | When you hit a requirement threshold, the achievement unlocks with an animation and XP reward. |
| **Progress indicators** | Locked achievements show progress toward the requirement (e.g., "7/10 tasks completed"). |
| **Equip title** | Unlocked achievements can be equipped as your display title (shown in Dashboard greeting). |

---

## 9. Stats (`/stats`)

| Feature | How to test |
|---------|-------------|
| **Overview stats** | Total tasks, goals, streaks, XP breakdown. |
| **Skill trees** | Five skill categories (Health, Learning, Financial, Productivity, Mindfulness) with XP and levels. |
| **Activity history** | Visual breakdown of activity over time. |

---

## 10. Weekly Review (`/review`)

| Feature | How to test |
|---------|-------------|
| **Automated summary** | Shows the current week's accomplishments: tasks completed, habits maintained, goals progressed, XP earned. |
| **Professional review** | Includes project task completions in the weekly summary. |

---

## 11. Feed (`/feed.html` — opens in new tab)

| Feature | How to test |
|---------|-------------|
| **Access** | Click "Feed" in the navigation bar → opens in a new browser tab. |
| **Add RSS subscription** | Click "Add Feed" → paste an RSS URL (e.g., `https://sahilbloom.substack.com/feed`) → articles are fetched and listed. |
| **Save individual URL** | Click "Save URL" → paste any article URL → it fetches content and generates an AI summary. |
| **Suggested feeds** | Click the settings gear → "Suggested Feeds" section shows curated feeds (tech, finance, AI, productivity). One-click subscribe with status indicators. |
| **AI-powered summaries** | Articles get tiered analysis (Tier 1-3) via Groq AI: surface claim, key points, implications, source credibility, open questions, tags, reading time. Click an article to expand its full analysis. |
| **Filter by feed** | Dropdown to filter articles by their source subscription. |
| **Filter: Unread / Bookmarked** | Filter pills with counts. |
| **Mark as read** | Click an article title → auto-marks as read. Or use bulk actions. |
| **Mark all read** | "Mark all read" button when unread articles exist. |
| **Bookmark** | Click the bookmark icon on any article. |
| **Bulk actions** | Click "Select" → checkboxes appear on each article. Select multiple → floating action bar for: Mark Read/Unread, Bookmark, Delete, Select All. |
| **Refresh** | "Check for new" button fetches latest articles from all subscriptions. Shows "last checked" timestamp. |
| **Tag display** | Articles show tag pills. If more than 8 tags, collapsed behind "Show more" toggle. |
| **Clear old articles** | In settings panel → "Clear old read articles" option. |
| **Remove subscription** | In settings panel → click the × next to any subscription to remove it. |

---

## 12. Pomodoro Timer

| Feature | How to test |
|---------|-------------|
| **Access** | Click the timer icon in the header/navigation. |
| **Work/break cycles** | Start a 25-minute focus session → short break → repeat. After 4 cycles, long break. |
| **Background running** | Start a timer → navigate to other pages → timer continues running (does not pause). |
| **Browser notification** | When a Pomodoro completes, a browser notification fires (if permissions granted). |
| **Customizable durations** | Settings for work duration, short break, long break, cycles before long break. |

---

## 13. Rich Text Editor (Tiptap)

| Feature | How to test |
|---------|-------------|
| **Available in** | Task descriptions, goal descriptions, project/sub-project notes, project task descriptions. |
| **Formatting toolbar** | Bold, Italic, Underline, Heading (H2), Bullet list, Ordered list, Checklist, Code block, Horizontal rule, Undo/Redo. |
| **Bullet list** | Click the bullet list icon → bullets should be visible (disc style). |
| **Checklist** | Click the checklist icon → interactive checkboxes that can be toggled. |
| **Expandable modal** | Edit forms open in a modal that can be expanded to fullscreen (click the expand icon). |
| **Read-only preview** | Task cards and detail views show formatted descriptions as collapsible read-only rich text. |

---

## 14. Mobile & PWA

| Feature | How to test |
|---------|-------------|
| **Responsive layout** | Resize browser to mobile width. All pages should reflow without horizontal scrolling. |
| **Hamburger menu** | On mobile, the navigation collapses into a hamburger menu (top-left) with a slide-out drawer. |
| **PWA install** | On mobile Chrome/Safari, "Add to Home Screen" option should be available. |
| **Offline support** | After first load, the app should work offline (service worker caches assets). |
| **Touch-friendly** | Buttons, inputs, and editor toolbar are sized for touch (minimum 44px tap targets). |
| **No iOS auto-zoom** | Text inputs use 16px+ font size to prevent iOS Safari auto-zoom on focus. |

---

## 15. Data Persistence

| Feature | How to test |
|---------|-------------|
| **localStorage** | All data is always saved to localStorage immediately. Refresh → data persists. |
| **Cloud sync (logged in)** | When signed in, data also syncs to Supabase. Sign in on another device → same data. |
| **No data loss on refresh** | Create a task → immediately refresh → task should still be there (both logged in and logged out). |

---

## 16. Theme

| Feature | How to test |
|---------|-------------|
| **Dark mode** (default) | App launches in dark mode with warm dark backgrounds and violet accents. |
| **Light mode** | Toggle theme (if available in settings or header). UI switches to light backgrounds. |
| **Consistent styling** | Cards, buttons, badges, modals should all respect the current theme. |

---

## Quick Smoke Test Checklist

1. [ ] Open the app → Dashboard loads with greeting and stats
2. [ ] Create a new task with a description, priority High, effort Low
3. [ ] Verify the task appears in the Tasks page (Matrix view → Quick Wins quadrant)
4. [ ] Add the task to Today → green CalendarCheck appears
5. [ ] Go to Dashboard → task shows in today's list
6. [ ] Complete the task → XP animation, stats update
7. [ ] Create a project with a sub-project and tasks
8. [ ] Add a project task to Today → visible on Dashboard with project badge
9. [ ] Remove it from Dashboard → CalendarMinus hover button works
10. [ ] Open Calendar → verify tasks/habits show as dots on the correct days
11. [ ] Open Feed (new tab) → add an RSS feed → articles load with AI summaries
12. [ ] Check mobile layout → hamburger menu works, no horizontal scroll
13. [ ] Sign in with Google → data syncs → sign out → local data still works
14. [ ] Refresh the page → no data loss
