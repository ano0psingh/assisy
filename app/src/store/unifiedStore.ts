import { LocalStorage } from './localStorage';
import {
  loadUserData,
  saveUserData,
  applyCloudToLocal,
  type UserDataPayload,
} from './cloudStore';

export type StoreSource = 'local' | 'cloud';

let saveDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let pendingSaveFns: Record<string, () => void> = {};
const DEBOUNCE_MS = 500;

function debouncedSave(
  key: string,
  userId: string | null,
  saveFn: () => void
): void {
  const timerKey = `${userId ?? 'local'}-${key}`;
  if (saveDebounceTimers[timerKey]) clearTimeout(saveDebounceTimers[timerKey]);
  pendingSaveFns[timerKey] = saveFn;
  saveDebounceTimers[timerKey] = setTimeout(() => {
    saveFn();
    delete saveDebounceTimers[timerKey];
    delete pendingSaveFns[timerKey];
  }, DEBOUNCE_MS);
}

export function flushPendingSaves(): void {
  for (const timerKey of Object.keys(saveDebounceTimers)) {
    clearTimeout(saveDebounceTimers[timerKey]);
  }
  for (const fn of Object.values(pendingSaveFns)) {
    try { fn(); } catch {}
  }
  saveDebounceTimers = {};
  pendingSaveFns = {};
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSaves);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSaves();
  });
}

export async function loadAll(userId: string | null): Promise<UserDataPayload> {
  if (userId) {
    const cloud = await loadUserData(userId);
    if (cloud) return cloud;
  }
  return {
    tasks: LocalStorage.getTasks(),
    goals: LocalStorage.getGoals(),
    habits: LocalStorage.getHabits(),
    habit_logs: getHabitLogsLocal(),
    daily_logs: LocalStorage.getDailyLogs(),
    projects: getProjectsLocal(),
    sub_projects: getSubProjectsLocal(),
    project_tasks: getProjectTasksLocal(),
    gamification: getGamificationLocal(),
    settings: getSettingsLocal(),
  };
}

function getHabitLogsLocal(): Record<string, unknown> {
  try {
    const v = localStorage.getItem('life-rpg-habit-logs');
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

function getProjectsLocal(): unknown[] {
  try {
    const v = localStorage.getItem('assisy_projects');
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function getSubProjectsLocal(): unknown[] {
  try {
    const v = localStorage.getItem('assisy_subprojects');
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function getProjectTasksLocal(): unknown[] {
  try {
    const v = localStorage.getItem('assisy_project_tasks');
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function getGamificationLocal(): Record<string, unknown> {
  const skillTrees = (() => {
    try {
      const v = localStorage.getItem('assisy_skill_trees');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  })();
  const achievements = (() => {
    try {
      const v = localStorage.getItem('assisy_achievements');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  })();
  const userStats = (() => {
    try {
      const v = localStorage.getItem('assisy_user_stats');
      return v ? JSON.parse(v) : {};
    } catch {
      return {};
    }
  })();
  return { skillTrees, achievements, userStats };
}

function getSettingsLocal(): Record<string, unknown> {
  const s: Record<string, unknown> = {};
  const theme = localStorage.getItem('life-rpg-theme');
  if (theme) s.theme = theme;
  const equipped = localStorage.getItem('equippedTitle');
  if (equipped) s.equippedTitle = equipped;
  const sounds = localStorage.getItem('achievement_sounds_enabled');
  if (sounds !== null) s.achievement_sounds_enabled = sounds;
  const planSeen = localStorage.getItem('planYourDay_lastSeen');
  if (planSeen) s.planYourDay_lastSeen = planSeen;
  try {
    const pomo = localStorage.getItem('assisy_pomodoro_settings');
    if (pomo) s.assisy_pomodoro_settings = JSON.parse(pomo);
  } catch {}
  try {
    const pomoToday = localStorage.getItem('assisy_pomodoro_today');
    if (pomoToday) s.assisy_pomodoro_today = JSON.parse(pomoToday);
  } catch {}
  return s;
}

export function applyPayloadToLocal(payload: UserDataPayload): void {
  applyCloudToLocal(payload);
}

export function saveTasks(tasks: unknown[], userId: string | null): void {
  LocalStorage.saveTasks(tasks as Parameters<typeof LocalStorage.saveTasks>[0]);
  if (userId) {
    debouncedSave('tasks', userId, () => { saveUserData(userId, { tasks }); });
  }
}

export function saveGoals(goals: unknown[], userId: string | null): void {
  LocalStorage.saveGoals(goals as Parameters<typeof LocalStorage.saveGoals>[0]);
  if (userId) {
    debouncedSave('goals', userId, () => { saveUserData(userId, { goals }); });
  }
}

export function saveHabits(habits: unknown[], userId: string | null): void {
  LocalStorage.saveHabits(habits as Parameters<typeof LocalStorage.saveHabits>[0]);
  if (userId) {
    debouncedSave('habits', userId, () => { saveUserData(userId, { habits }); });
  }
}

export function saveHabitLogs(logs: Record<string, unknown>, userId: string | null): void {
  localStorage.setItem('life-rpg-habit-logs', JSON.stringify(logs));
  if (userId) {
    debouncedSave('habit_logs', userId, () => { saveUserData(userId, { habit_logs: logs }); });
  }
}

export function saveDailyLogs(logs: unknown[], userId: string | null): void {
  LocalStorage.saveDailyLogs(logs as Parameters<typeof LocalStorage.saveDailyLogs>[0]);
  if (userId) {
    debouncedSave('daily_logs', userId, () => { saveUserData(userId, { daily_logs: logs }); });
  }
}

export function saveProjects(projects: unknown[], userId: string | null): void {
  localStorage.setItem('assisy_projects', JSON.stringify(projects));
  if (userId) {
    debouncedSave('projects', userId, () => { saveUserData(userId, { projects }); });
  }
}

export function saveSubProjects(subProjects: unknown[], userId: string | null): void {
  localStorage.setItem('assisy_subprojects', JSON.stringify(subProjects));
  if (userId) {
    debouncedSave('sub_projects', userId, () => { saveUserData(userId, { sub_projects: subProjects }); });
  }
}

export function saveProjectTasks(tasks: unknown[], userId: string | null): void {
  localStorage.setItem('assisy_project_tasks', JSON.stringify(tasks));
  if (userId) {
    debouncedSave('project_tasks', userId, () => { saveUserData(userId, { project_tasks: tasks }); });
  }
}

export function saveGamification(
  skillTrees: unknown[],
  achievements: unknown[],
  userStats: unknown,
  userId: string | null
): void {
  localStorage.setItem('assisy_skill_trees', JSON.stringify(skillTrees));
  localStorage.setItem('assisy_achievements', JSON.stringify(achievements));
  localStorage.setItem('assisy_user_stats', JSON.stringify(userStats));
  if (userId) {
    debouncedSave('gamification', userId, () => {
      saveUserData(userId, { gamification: { skillTrees, achievements, userStats } });
    });
  }
}

export function saveSettings(partial: Record<string, unknown>, userId: string | null): void {
  if (partial.theme) localStorage.setItem('life-rpg-theme', String(partial.theme));
  if (partial.equippedTitle) localStorage.setItem('equippedTitle', String(partial.equippedTitle));
  if (partial.achievement_sounds_enabled !== undefined)
    localStorage.setItem('achievement_sounds_enabled', String(partial.achievement_sounds_enabled));
  if (partial.planYourDay_lastSeen) localStorage.setItem('planYourDay_lastSeen', String(partial.planYourDay_lastSeen));
  if (partial.assisy_pomodoro_settings)
    localStorage.setItem('assisy_pomodoro_settings', JSON.stringify(partial.assisy_pomodoro_settings));
  if (partial.assisy_pomodoro_today)
    localStorage.setItem('assisy_pomodoro_today', JSON.stringify(partial.assisy_pomodoro_today));
  if (userId) {
    debouncedSave('settings', userId, () => {
      const merged = { ...getSettingsLocal(), ...partial };
      saveUserData(userId, { settings: merged });
    });
  }
}
