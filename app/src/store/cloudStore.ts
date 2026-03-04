import { supabase } from '../lib/supabase';

export interface UserDataPayload {
  tasks?: unknown[];
  goals?: unknown[];
  habits?: unknown[];
  habit_logs?: Record<string, unknown>;
  daily_logs?: unknown[];
  projects?: unknown[];
  sub_projects?: unknown[];
  project_tasks?: unknown[];
  gamification?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

const LOCAL_KEYS = [
  'life-rpg-tasks',
  'life-rpg-goals',
  'life-rpg-habits',
  'life-rpg-habit-logs',
  'life-rpg-daily-logs',
  'assisy_projects',
  'assisy_subprojects',
  'assisy_project_tasks',
  'assisy_skill_trees',
  'assisy_achievements',
  'assisy_user_stats',
  'life-rpg-theme',
  'equippedTitle',
  'achievement_sounds_enabled',
  'planYourDay_lastSeen',
  'assisy_pomodoro_settings',
  'assisy_pomodoro_today',
] as const;

function localStorageToPayload(): UserDataPayload {
  const tasks = safeParse(localStorage.getItem('life-rpg-tasks'), []);
  const goals = safeParse(localStorage.getItem('life-rpg-goals'), []);
  const habits = safeParse(localStorage.getItem('life-rpg-habits'), []);
  const habit_logs = safeParse(localStorage.getItem('life-rpg-habit-logs'), {});
  const daily_logs = safeParse(localStorage.getItem('life-rpg-daily-logs'), []);
  const projects = safeParse(localStorage.getItem('assisy_projects'), []);
  const sub_projects = safeParse(localStorage.getItem('assisy_subprojects'), []);
  const project_tasks = safeParse(localStorage.getItem('assisy_project_tasks'), []);
  const skillTrees = safeParse(localStorage.getItem('assisy_skill_trees'), []);
  const achievements = safeParse(localStorage.getItem('assisy_achievements'), []);
  const userStats = safeParse(localStorage.getItem('assisy_user_stats'), {});

  const settings: Record<string, unknown> = {};
  const theme = localStorage.getItem('life-rpg-theme');
  if (theme) settings.theme = theme;
  const equipped = localStorage.getItem('equippedTitle');
  if (equipped) settings.equippedTitle = equipped;
  const sounds = localStorage.getItem('achievement_sounds_enabled');
  if (sounds !== null) settings.achievement_sounds_enabled = sounds;
  const planSeen = localStorage.getItem('planYourDay_lastSeen');
  if (planSeen) settings.planYourDay_lastSeen = planSeen;
  const pomoSettings = localStorage.getItem('assisy_pomodoro_settings');
  if (pomoSettings) settings.assisy_pomodoro_settings = JSON.parse(pomoSettings);
  const pomoToday = localStorage.getItem('assisy_pomodoro_today');
  if (pomoToday) settings.assisy_pomodoro_today = JSON.parse(pomoToday);

  return {
    tasks,
    goals,
    habits,
    habit_logs,
    daily_logs,
    projects,
    sub_projects,
    project_tasks,
    gamification: { skillTrees, achievements, userStats },
    settings: Object.keys(settings).length > 0 ? settings : undefined,
  };
}

function payloadToLocalStorage(payload: UserDataPayload): void {
  if (payload.tasks) localStorage.setItem('life-rpg-tasks', JSON.stringify(payload.tasks));
  if (payload.goals) localStorage.setItem('life-rpg-goals', JSON.stringify(payload.goals));
  if (payload.habits) localStorage.setItem('life-rpg-habits', JSON.stringify(payload.habits));
  if (payload.habit_logs) localStorage.setItem('life-rpg-habit-logs', JSON.stringify(payload.habit_logs));
  if (payload.daily_logs) localStorage.setItem('life-rpg-daily-logs', JSON.stringify(payload.daily_logs));
  if (payload.projects) localStorage.setItem('assisy_projects', JSON.stringify(payload.projects));
  if (payload.sub_projects) localStorage.setItem('assisy_subprojects', JSON.stringify(payload.sub_projects));
  if (payload.project_tasks) localStorage.setItem('assisy_project_tasks', JSON.stringify(payload.project_tasks));
  const g = payload.gamification as Record<string, unknown> | undefined;
  if (g?.skillTrees) localStorage.setItem('assisy_skill_trees', JSON.stringify(g.skillTrees));
  if (g?.achievements) localStorage.setItem('assisy_achievements', JSON.stringify(g.achievements));
  if (g?.userStats) localStorage.setItem('assisy_user_stats', JSON.stringify(g.userStats));
  const s = payload.settings as Record<string, unknown> | undefined;
  if (s) {
    if (s.theme) localStorage.setItem('life-rpg-theme', String(s.theme));
    if (s.equippedTitle) localStorage.setItem('equippedTitle', String(s.equippedTitle));
    if (s.achievement_sounds_enabled !== undefined) localStorage.setItem('achievement_sounds_enabled', String(s.achievement_sounds_enabled));
    if (s.planYourDay_lastSeen) localStorage.setItem('planYourDay_lastSeen', String(s.planYourDay_lastSeen));
    if (s.assisy_pomodoro_settings) localStorage.setItem('assisy_pomodoro_settings', JSON.stringify(s.assisy_pomodoro_settings));
    if (s.assisy_pomodoro_today) localStorage.setItem('assisy_pomodoro_today', JSON.stringify(s.assisy_pomodoro_today));
  }
}

function safeParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export async function loadUserData(userId: string): Promise<UserDataPayload | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return {
    tasks: data.tasks ?? [],
    goals: data.goals ?? [],
    habits: data.habits ?? [],
    habit_logs: data.habit_logs ?? {},
    daily_logs: data.daily_logs ?? [],
    projects: data.projects ?? [],
    sub_projects: data.sub_projects ?? [],
    project_tasks: data.project_tasks ?? [],
    gamification: data.gamification ?? {},
    settings: data.settings ?? {},
  };
}

export async function saveUserData(userId: string, payload: Partial<UserDataPayload>): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (payload.tasks !== undefined) row.tasks = payload.tasks;
  if (payload.goals !== undefined) row.goals = payload.goals;
  if (payload.habits !== undefined) row.habits = payload.habits;
  if (payload.habit_logs !== undefined) row.habit_logs = payload.habit_logs;
  if (payload.daily_logs !== undefined) row.daily_logs = payload.daily_logs;
  if (payload.projects !== undefined) row.projects = payload.projects;
  if (payload.sub_projects !== undefined) row.sub_projects = payload.sub_projects;
  if (payload.project_tasks !== undefined) row.project_tasks = payload.project_tasks;
  if (payload.gamification !== undefined) row.gamification = payload.gamification;
  if (payload.settings !== undefined) row.settings = payload.settings;

  const { error } = await supabase.from('user_data').upsert(row, { onConflict: 'user_id' });
  return { error: error ?? null };
}

export function hasLocalData(): boolean {
  return LOCAL_KEYS.some(key => {
    const v = localStorage.getItem(key);
    return v !== null && v !== '[]' && v !== '{}' && v !== '';
  });
}

export async function migrateLocalToCloud(userId: string, clearLocal = false): Promise<{ error: Error | null }> {
  const payload = localStorageToPayload();
  const { error } = await saveUserData(userId, payload);
  if (!error && clearLocal) {
    LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
  }
  return { error: error ?? null };
}

export function applyCloudToLocal(payload: UserDataPayload): void {
  payloadToLocalStorage(payload);
}
