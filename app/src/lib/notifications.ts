const PERM_KEY = 'assisy_notification_permission';

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  localStorage.setItem(PERM_KEY, result);
  return result === 'granted';
}

export function hasAskedBefore(): boolean {
  return !!localStorage.getItem(PERM_KEY) || Notification.permission !== 'default';
}

async function showViaServiceWorker(title: string, options?: NotificationOptions): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  // Try service worker first (works on mobile + desktop)
  const sent = await showViaServiceWorker(title, options);
  if (sent) return;

  // Fallback to basic Notification constructor (desktop only)
  try {
    new Notification(title, {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      ...options,
    });
  } catch {
    // Not supported in this environment
  }
}

export function notifyPomodoroComplete(phase: 'work' | 'shortBreak' | 'longBreak'): void {
  const messages: Record<string, { title: string; body: string }> = {
    work: { title: 'Focus session complete!', body: 'Time for a break. Great work!' },
    shortBreak: { title: 'Break is over', body: 'Ready to focus again?' },
    longBreak: { title: 'Long break is over', body: 'Refreshed and ready to go!' },
  };
  const msg = messages[phase];
  if (msg) sendNotification(msg.title, { body: msg.body, tag: 'pomodoro' });
}

export function notifyDailyPlanning(): void {
  sendNotification('Plan your day', {
    body: 'Take a minute to review your tasks and set priorities.',
    tag: 'daily-planning',
  });
}

export function notifyHabitReminder(habitName: string): void {
  sendNotification(`Don't forget: ${habitName}`, {
    body: `Time to check in on your ${habitName} habit.`,
    tag: `habit-${habitName}`,
  });
}

let dailyPlanningTimer: ReturnType<typeof setInterval> | null = null;

export function startDailyPlanningReminder(hourOfDay = 9): void {
  if (dailyPlanningTimer) clearInterval(dailyPlanningTimer);

  const check = () => {
    const now = new Date();
    const lastNotified = localStorage.getItem('assisy_daily_plan_notified');
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (now.getHours() >= hourOfDay && lastNotified !== today) {
      notifyDailyPlanning();
      localStorage.setItem('assisy_daily_plan_notified', today);
    }
  };

  check();
  dailyPlanningTimer = setInterval(check, 60000);
}

export function stopDailyPlanningReminder(): void {
  if (dailyPlanningTimer) {
    clearInterval(dailyPlanningTimer);
    dailyPlanningTimer = null;
  }
}

let habitReminderTimer: ReturnType<typeof setInterval> | null = null;

export function startHabitReminders(habits: { name: string; reminderTime?: string }[]): void {
  if (habitReminderTimer) clearInterval(habitReminderTimer);

  const notifiedKey = (name: string) => `assisy_habit_reminder_${name}`;

  const check = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const nowTime = `${hh}:${mm}`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    habits.forEach(h => {
      if (!h.reminderTime) return;
      if (nowTime !== h.reminderTime) return;
      const key = notifiedKey(h.name);
      if (localStorage.getItem(key) === todayStr) return;
      notifyHabitReminder(h.name);
      localStorage.setItem(key, todayStr);
    });
  };

  check();
  habitReminderTimer = setInterval(check, 60000);
}

export function stopHabitReminders(): void {
  if (habitReminderTimer) {
    clearInterval(habitReminderTimer);
    habitReminderTimer = null;
  }
}
