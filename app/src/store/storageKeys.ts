/**
 * The single source of truth for what lives in localStorage.
 *
 * These keys were previously duplicated across the cloud store, the unified
 * store and the export/import UI, and the copies had already drifted: the
 * backup export listed `life-rpg-gamification` and `life-rpg-user-stats`, which
 * do not exist, so every exported backup silently omitted the user's skill
 * trees, achievements and stats. Anything that needs the key list must import
 * it from here.
 */

/** A collection of `{ id }` entities stored as a JSON array. */
export interface EntityCollection {
  /** Field name in the cloud row and the sync payload. */
  payloadKey: 'tasks' | 'goals' | 'habits' | 'daily_logs' | 'projects' | 'sub_projects' | 'project_tasks';
  storageKey: string
  /** False for types that have no `updatedAt` field to compare on. */
  hasUpdatedAt: boolean;
}

export const ENTITY_COLLECTIONS: EntityCollection[] = [
  { payloadKey: 'tasks', storageKey: 'life-rpg-tasks', hasUpdatedAt: true },
  { payloadKey: 'goals', storageKey: 'life-rpg-goals', hasUpdatedAt: true },
  { payloadKey: 'habits', storageKey: 'life-rpg-habits', hasUpdatedAt: true },
  { payloadKey: 'daily_logs', storageKey: 'life-rpg-daily-logs', hasUpdatedAt: true },
  { payloadKey: 'projects', storageKey: 'assisy_projects', hasUpdatedAt: true },
  { payloadKey: 'sub_projects', storageKey: 'assisy_subprojects', hasUpdatedAt: true },
  { payloadKey: 'project_tasks', storageKey: 'assisy_project_tasks', hasUpdatedAt: true },
];

/** `Record<habitId, HabitLog[]>`, so it merges by key rather than by id. */
export const HABIT_LOGS_KEY = 'life-rpg-habit-logs';

export const GAMIFICATION_KEYS = {
  skillTrees: 'assisy_skill_trees',
  achievements: 'assisy_achievements',
  userStats: 'assisy_user_stats',
} as const;

/** Scalar preferences, stored as their own keys and synced under `settings`. */
export const SETTINGS_KEYS = {
  theme: 'life-rpg-theme',
  equippedTitle: 'equippedTitle',
  achievement_sounds_enabled: 'achievement_sounds_enabled',
  planYourDay_lastSeen: 'planYourDay_lastSeen',
} as const;

/** Preferences stored as JSON rather than plain strings. */
export const JSON_SETTINGS_KEYS = {
  assisy_pomodoro_settings: 'assisy_pomodoro_settings',
  assisy_pomodoro_today: 'assisy_pomodoro_today',
} as const;

/** Every independently synced unit, used to key dirty flags and tombstones. */
export const SYNC_COLLECTIONS: string[] = [
  ...ENTITY_COLLECTIONS.map(c => c.payloadKey),
  'habit_logs',
  'gamification',
  'settings',
];

/** Every key holding user data, for backup, export and migration. */
export const ALL_DATA_KEYS: string[] = [
  ...ENTITY_COLLECTIONS.map(c => c.storageKey),
  HABIT_LOGS_KEY,
  ...Object.values(GAMIFICATION_KEYS),
  ...Object.values(SETTINGS_KEYS),
  ...Object.values(JSON_SETTINGS_KEYS),
];

export function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
