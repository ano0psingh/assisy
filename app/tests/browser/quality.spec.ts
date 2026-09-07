import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TASKS_KEY = 'life-rpg-tasks';
const GOALS_KEY = 'life-rpg-goals';
const HABITS_KEY = 'life-rpg-habits';
const PROJECTS_KEY = 'assisy_projects';
const SUBPROJECTS_KEY = 'assisy_subprojects';
const PROJECT_TASKS_KEY = 'assisy_project_tasks';
const fixedDate = '2026-09-06T10:00:00.000Z';

const seededTask = {
  id: 'task-inbox',
  title: 'Inbox quality task',
  description: 'Browser quality fixture',
  category: 'Personal',
  priority: 'High',
  effort: 'Low',
  status: 'Pending',
  goalId: 'goal-quality',
  isRecurring: false,
  createdAt: fixedDate,
  xpValue: 15,
  inbox: true,
  updatedAt: fixedDate,
};

const goalTask = {
  ...seededTask,
  id: 'task-goal',
  title: 'Goal linked task',
  inbox: false,
  goalId: 'goal-quality',
};

const seededGoal = {
  id: 'goal-quality',
  title: 'Quality goal',
  description: 'Exercise the goal workflow',
  category: 'Personal',
  status: 'Active',
  linkedTaskIds: ['task-goal'],
  progress: 0,
  createdAt: fixedDate,
  level: 1,
  totalXP: 0,
  currentLevelXP: 0,
  xpToNextLevel: 100,
  milestones: [],
  theme: 'forest',
  priority: 'High',
  healthCheckIns: [],
  updatedAt: fixedDate,
};

const seededHabit = {
  id: 'habit-quality',
  name: 'Quality habit',
  trackingType: 'boolean',
  category: 'Health',
  streakCount: 0,
  xpPerUnit: 5,
};

const seededProject = {
  id: 'project-quality',
  title: 'Quality project',
  description: 'Browser quality fixture',
  status: 'Active',
  color: '#8B5CF6',
  tags: [],
  subProjectIds: [],
  createdAt: fixedDate,
  updatedAt: fixedDate,
};

async function seed(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((fixtures) => {
    localStorage.clear();
    localStorage.setItem(fixtures.tasksKey, JSON.stringify(fixtures.tasks));
    localStorage.setItem(fixtures.goalsKey, JSON.stringify(fixtures.goals));
    localStorage.setItem(fixtures.habitsKey, JSON.stringify(fixtures.habits));
    localStorage.setItem(fixtures.projectsKey, JSON.stringify(fixtures.projects));
    localStorage.setItem(fixtures.subprojectsKey, '[]');
    localStorage.setItem(fixtures.projectTasksKey, '[]');
    localStorage.setItem('life-rpg-habit-logs', '{}');
    localStorage.setItem('life-rpg-daily-logs', '[]');
    localStorage.setItem('life-rpg-theme', fixtures.selectedTheme);
    localStorage.setItem('assisy_onboarding_done', 'true');
    localStorage.setItem('planYourDay_lastSeen', new Date().toISOString().slice(0, 10));
    localStorage.setItem('assisy_gesture_hint_task_swipe', 'true');
  }, {
    tasksKey: TASKS_KEY,
    goalsKey: GOALS_KEY,
    habitsKey: HABITS_KEY,
    projectsKey: PROJECTS_KEY,
    subprojectsKey: SUBPROJECTS_KEY,
    projectTasksKey: PROJECT_TASKS_KEY,
    tasks: [seededTask, goalTask],
    goals: [seededGoal],
    habits: [seededHabit],
    projects: [seededProject],
    selectedTheme: theme,
  });
}

async function expectFocusInside(dialog: Locator) {
  await expect.poll(() => dialog.evaluate(
    node => node === document.activeElement || node.contains(document.activeElement),
  )).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route('**/api/**', route => route.abort());
});

test('@a11y five hubs and every Plan/Progress tab pass serious WCAG checks in light and dark', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop covers both color themes without duplicating every axe scan');
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const routes = [
    '/',
    '/tasks',
    '/calendar',
    '/plan?view=goals',
    '/plan?view=projects',
    '/plan?view=habits',
    '/progress?view=review',
    '/progress?view=stats',
    '/progress?view=achievements',
  ];

  for (const theme of ['light', 'dark'] as const) {
    await seed(page, theme);
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = results.violations.filter(
        violation => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(
        blocking,
        `${theme} ${path}: ${blocking.map(violation => `${violation.id}: ${violation.help}`).join(', ')}`,
      ).toEqual([]);
    }
  }
});

test('desktop and mobile primary navigation exposes exactly the five hubs', async ({ page }) => {
  await seed(page);
  await page.goto('/');

  const primary = page.getByRole('navigation', { name: 'Primary' }).filter({ visible: true });
  await expect(primary).toHaveCount(1);
  await expect(primary.getByText(/^(Today|Tasks|Calendar|Plan|Progress)$/)).toHaveText([
    'Today',
    'Tasks',
    'Calendar',
    'Plan',
    'Progress',
  ]);

  const destinations = [
    ['Today', '/'],
    ['Tasks', '/tasks'],
    ['Calendar', '/calendar'],
    ['Plan', '/plan'],
    ['Progress', '/progress'],
  ] as const;
  for (const [label, path] of destinations) {
    await expect(primary.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', path);
  }
});

test('legacy grouped routes redirect to canonical tabs and preserve focus requests', async ({ page }) => {
  await seed(page);

  const focusedPlanRoutes = [
    { legacy: '/goals', view: 'goals', focus: seededGoal.id },
    { legacy: '/projects', view: 'projects', focus: seededProject.id },
    { legacy: '/habits', view: 'habits', focus: seededHabit.id },
  ];
  for (const route of focusedPlanRoutes) {
    await page.goto(`${route.legacy}?focus=${route.focus}&source=quality`);
    const target = page.locator(`[data-focus-id="${route.focus}"]`).first();
    await expect(target).toHaveClass(/focus-flash/);
    const url = new URL(page.url());
    expect(url.pathname).toBe('/plan');
    expect(url.searchParams.get('view')).toBe(route.view);
    expect(url.searchParams.get('source')).toBe('quality');
  }

  for (const route of [
    { legacy: '/review', view: 'review' },
    { legacy: '/stats', view: 'stats' },
    { legacy: '/achievements', view: 'achievements' },
  ]) {
    await page.goto(`${route.legacy}?focus=progress-quality&source=quality`);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/progress');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/progress');
    expect(url.searchParams.get('view')).toBe(route.view);
    expect(url.searchParams.get('focus')).toBe('progress-quality');
    expect(url.searchParams.get('source')).toBe('quality');
  }
});

test('Inbox badge leads to capture, clarify, schedule, and complete with current labels', async ({ page, isMobile }) => {
  await seed(page);
  await page.goto('/');
  const title = `Captured ${isMobile ? 'mobile' : 'desktop'} assignment`;

  await page.getByRole('button', { name: isMobile ? 'Quick add a task' : 'Add', exact: true }).click();
  const capture = page.getByRole('dialog', { name: 'Quick capture task' });
  await capture.getByLabel('Task title').fill(title);
  await capture.getByRole('button', { name: 'File in Inbox' }).click();

  const primary = page.getByRole('navigation', { name: 'Primary' }).filter({ visible: true });
  await primary.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('tab', { name: 'Inbox' }).click();
  await expect(page).toHaveURL(/\/tasks\/inbox$/);
  await expect(page.getByRole('heading', { name: 'Inbox desk' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Inbox' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: `Edit "${title}"` }).first().click();
  const clarify = page.getByRole('dialog', { name: 'Clarify task' });
  await clarify.getByLabel('Date', { exact: true }).fill('2030-01-02');
  await clarify.getByLabel('Time (optional)', { exact: true }).fill('09:30');
  await clarify.getByRole('button', { name: 'Assign calendar block' }).click();

  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByRole('button', { name: `Mark "${title}" as done` }).click();
  await expect.poll(() => page.evaluate(({ key, taskTitle }) => {
    const tasks = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
      title: string;
      status: string;
      inbox?: boolean;
      scheduledDate?: string;
      scheduledTime?: string;
    }>;
    return tasks.find(task => task.title === taskTitle);
  }, { key: TASKS_KEY, taskTitle: title })).toMatchObject({
    status: 'Completed',
    inbox: false,
    scheduledDate: '2030-01-02',
    scheduledTime: '09:30',
  });
});

test('Plan and Progress tabs keep their active view in the URL', async ({ page }) => {
  await seed(page);

  for (const group of [
    { path: '/plan', label: 'Plan views', views: ['goals', 'projects', 'habits'] },
    { path: '/progress', label: 'Progress records', views: ['review', 'stats', 'achievements'] },
  ]) {
    await page.goto(`${group.path}?source=quality`);
    const tabs = page.getByRole('tablist', { name: group.label });
    for (const view of group.views) {
      const label = view[0].toUpperCase() + view.slice(1);
      await tabs.getByRole('tab', { name: label, exact: true }).click();
      await expect(tabs.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
      const url = new URL(page.url());
      expect(url.pathname).toBe(group.path);
      expect(url.searchParams.get('view')).toBe(view);
      expect(url.searchParams.get('source')).toBe('quality');
    }
  }
});

test('modal focus is contained and restored for keyboard users', async ({ page, isMobile }) => {
  await seed(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: isMobile ? 'Quick add a task' : 'Add', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Quick capture task' });
  await expect(dialog).toBeVisible();
  await expectFocusInside(dialog);

  const focusable = dialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ).filter({ visible: true });
  await focusable.last().focus();
  await page.keyboard.press('Tab');
  await expectFocusInside(dialog);
  await focusable.first().focus();
  await page.keyboard.press('Shift+Tab');
  await expectFocusInside(dialog);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile Calendar day view schedules by tap without requiring drag', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile interaction gate');
  await seed(page);
  await page.goto('/calendar');

  await expect(page.getByRole('region', { name: 'Daily time schedule' })).toBeVisible();
  await expect(page.getByText('Tap a time row to add a Calendar block. Tap a task to change its schedule.')).toBeVisible();
  const scheduleButton = page.getByRole('button', { name: `Schedule ${goalTask.title}` });
  await expect(scheduleButton).toBeVisible();
  await scheduleButton.click();

  const sheet = page.getByRole('dialog', { name: 'Calendar block' });
  await sheet.getByLabel('Start time').fill('10:15');
  await sheet.getByRole('button', { name: 'Save Calendar block' }).click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => page.evaluate(({ key, taskId }) => {
    const tasks = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
      id: string;
      scheduledDate?: string;
      scheduledTime?: string;
    }>;
    const task = tasks.find(candidate => candidate.id === taskId);
    return Boolean(task?.scheduledDate && task.scheduledTime === '10:15');
  }, { key: TASKS_KEY, taskId: goalTask.id })).toBe(true);
});

test('viewport metadata permits zoom and the editorial face is bundled', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content).toBeTruthy();
  expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
  expect(content).not.toMatch(/maximum-scale\s*=\s*1(?:\.0*)?(?:\s|,|$)/i);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCSS('font-family', /Barlow Condensed/);
  expect(await page.evaluate(() => document.fonts.check('700 24px "Barlow Condensed"'))).toBe(true);
});
