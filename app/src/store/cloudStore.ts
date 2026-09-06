import { supabase, supabaseUrl, supabaseAnonKey, getCachedAccessToken } from '../lib/supabase';
import {
  ALL_DATA_KEYS,
  ENTITY_COLLECTIONS,
  GAMIFICATION_KEYS,
  HABIT_LOGS_KEY,
  JSON_SETTINGS_KEYS,
  SETTINGS_KEYS,
  SYNC_COLLECTIONS,
  safeParse,
} from './storageKeys';
import type { TombstoneMap } from './merge';
import { getAllTombstones, markSynced } from './syncMeta';

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
  sync_meta?: {
    tombstones?: Record<string, TombstoneMap>;
  };
}

export interface CloudDataState {
  payload: UserDataPayload;
  tombstones: Record<string, TombstoneMap>;
  entityTableAvailable: boolean;
}

/** Everything currently in localStorage, in sync payload shape. */
export function readLocalPayload(): UserDataPayload {
  const payload: UserDataPayload = {};

  for (const spec of ENTITY_COLLECTIONS) {
    const parsed = safeParse<unknown[]>(localStorage.getItem(spec.storageKey), []);
    payload[spec.payloadKey] = Array.isArray(parsed) ? parsed : [];
  }

  payload.habit_logs = safeParse<Record<string, unknown>>(localStorage.getItem(HABIT_LOGS_KEY), {});

  payload.gamification = {
    skillTrees: safeParse<unknown[]>(localStorage.getItem(GAMIFICATION_KEYS.skillTrees), []),
    achievements: safeParse<unknown[]>(localStorage.getItem(GAMIFICATION_KEYS.achievements), []),
    userStats: safeParse<Record<string, unknown>>(localStorage.getItem(GAMIFICATION_KEYS.userStats), {}),
  };

  const settings: Record<string, unknown> = {};
  for (const [field, key] of Object.entries(SETTINGS_KEYS)) {
    const value = localStorage.getItem(key);
    if (value !== null) settings[field] = value;
  }
  for (const [field, key] of Object.entries(JSON_SETTINGS_KEYS)) {
    const value = localStorage.getItem(key);
    if (value !== null) settings[field] = safeParse<unknown>(value, undefined);
  }
  payload.settings = settings;

  return payload;
}

/** Write a payload over localStorage. Absent fields are left untouched. */
export function writePayloadToLocalStorage(payload: UserDataPayload): void {
  for (const spec of ENTITY_COLLECTIONS) {
    const value = payload[spec.payloadKey];
    if (value) localStorage.setItem(spec.storageKey, JSON.stringify(value));
  }
  if (payload.habit_logs) {
    localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(payload.habit_logs));
  }

  const gamification = payload.gamification;
  if (gamification?.skillTrees) {
    localStorage.setItem(GAMIFICATION_KEYS.skillTrees, JSON.stringify(gamification.skillTrees));
  }
  if (gamification?.achievements) {
    localStorage.setItem(GAMIFICATION_KEYS.achievements, JSON.stringify(gamification.achievements));
  }
  if (gamification?.userStats) {
    localStorage.setItem(GAMIFICATION_KEYS.userStats, JSON.stringify(gamification.userStats));
  }

  const settings = payload.settings;
  if (settings) {
    for (const [field, key] of Object.entries(SETTINGS_KEYS)) {
      const value = settings[field];
      if (value !== undefined && value !== null) localStorage.setItem(key, String(value));
    }
    for (const [field, key] of Object.entries(JSON_SETTINGS_KEYS)) {
      const value = settings[field];
      if (value !== undefined && value !== null) localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

export async function loadCloudState(userId: string): Promise<CloudDataState | null> {
  if (!supabase) return null;
  const [legacyResult, entityResult] = await Promise.all([
    supabase.from('user_data').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('sync_entities').select('collection,entity_id,payload,deleted_at').eq('user_id', userId),
  ]);

  const data = legacyResult.data;
  if (!data && (!entityResult.data || entityResult.data.length === 0)) return null;

  const payload: UserDataPayload = {
    tasks: data?.tasks ?? [],
    goals: data?.goals ?? [],
    habits: data?.habits ?? [],
    habit_logs: data?.habit_logs ?? {},
    daily_logs: data?.daily_logs ?? [],
    projects: data?.projects ?? [],
    sub_projects: data?.sub_projects ?? [],
    project_tasks: data?.project_tasks ?? [],
    gamification: data?.gamification ?? {},
    settings: data?.settings ?? {},
  };
  const tombstones = (data?.sync_meta as UserDataPayload['sync_meta'])?.tombstones ?? {};
  const entityTableAvailable = !entityResult.error;

  if (entityTableAvailable) {
    const byCollection = new Map<string, Map<string, unknown>>();
    for (const spec of ENTITY_COLLECTIONS) {
      const legacy = (payload[spec.payloadKey] ?? []) as Array<{ id?: string }>;
      byCollection.set(spec.payloadKey, new Map(
        legacy.filter(item => item?.id).map(item => [item.id as string, item]),
      ));
    }
    for (const row of entityResult.data ?? []) {
      const collection = String(row.collection);
      const id = String(row.entity_id);
      const entities = byCollection.get(collection);
      if (!entities) continue;
      if (row.deleted_at) {
        entities.delete(id);
        tombstones[collection] = tombstones[collection] ?? {};
        tombstones[collection][id] = { deletedAt: String(row.deleted_at) };
      } else if (row.payload) {
        // Once a row exists in the entity table it is authoritative for this
        // id. Legacy data remains a rollback/fill source only for ids that have
        // not yet been dual-written.
        entities.set(id, row.payload as { id: string });
      }
    }
    for (const spec of ENTITY_COLLECTIONS) {
      payload[spec.payloadKey] = [...(byCollection.get(spec.payloadKey)?.values() ?? [])];
    }
  }

  return { payload, tombstones, entityTableAvailable };
}

export async function loadUserData(userId: string): Promise<UserDataPayload | null> {
  return (await loadCloudState(userId))?.payload ?? null;
}

function toRow(userId: string, payload: Partial<UserDataPayload>): Record<string, unknown> {
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
  if (payload.sync_meta !== undefined) row.sync_meta = payload.sync_meta;
  return row;
}

async function saveLegacyData(
  userId: string,
  payload: Partial<UserDataPayload>,
): Promise<Error | null> {
  if (!supabase) return new Error('Supabase not configured');
  let { error } = await supabase
    .from('user_data')
    .upsert(toRow(userId, payload), { onConflict: 'user_id' });

  // Production may not have the Phase 2 migration yet. Retry without its new
  // metadata column so ordinary user_data sync remains fully functional.
  if (error && payload.sync_meta !== undefined) {
    const compatible = { ...payload };
    delete compatible.sync_meta;
    ({ error } = await supabase
      .from('user_data')
      .upsert(toRow(userId, compatible), { onConflict: 'user_id' }));
  }
  return error ?? null;
}

async function saveEntityData(
  userId: string,
  payload: Partial<UserDataPayload>,
  revision: number,
): Promise<Error | null> {
  if (!supabase) return new Error('Supabase not configured');
  const tombstones = payload.sync_meta?.tombstones ?? {};
  const rows = new Map<string, Record<string, unknown>>();
  const updatedAt = new Date(revision).toISOString();

  for (const spec of ENTITY_COLLECTIONS) {
    const entities = payload[spec.payloadKey];
    if (entities === undefined) continue;
    for (const value of entities as Array<{ id?: string; updatedAt?: string }>) {
      if (!value?.id) continue;
      rows.set(`${spec.payloadKey}:${value.id}`, {
        user_id: userId,
        collection: spec.payloadKey,
        entity_id: value.id,
        payload: value,
        revision,
        updated_at: updatedAt,
        deleted_at: null,
      });
    }
  }

  for (const [collection, deleted] of Object.entries(tombstones)) {
    for (const [entityId, tombstone] of Object.entries(deleted)) {
      const key = `${collection}:${entityId}`;
      const active = rows.get(key);
      const activeTime = String((active?.payload as { updatedAt?: string } | undefined)?.updatedAt ?? '');
      if (active && activeTime > tombstone.deletedAt) continue;
      rows.set(key, {
        user_id: userId,
        collection,
        entity_id: entityId,
        payload: null,
        revision: Math.max(revision, Date.parse(tombstone.deletedAt) || revision),
        updated_at: tombstone.deletedAt,
        deleted_at: tombstone.deletedAt,
      });
    }
  }

  if (rows.size === 0) return null;
  const { error } = await supabase
    .from('sync_entities')
    .upsert([...rows.values()], { onConflict: 'user_id,collection,entity_id' });
  if (!error) return null;

  // The per-entity table is deployed independently. Only schema-availability
  // errors are compatibility fallbacks; auth, RLS, network, and server errors
  // must keep the outbox entry pending for a real retry.
  const compatibilityCodes = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
  if (compatibilityCodes.has(error.code)) return null;
  return new Error(error.message);
}

export async function saveUserData(
  userId: string,
  payload: Partial<UserDataPayload>,
  revision = Date.now(),
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const legacyError = await saveLegacyData(userId, payload);
  const entityError = await saveEntityData(userId, payload, revision);
  return { error: legacyError ?? entityError };
}

/** Keepalive bodies are capped at 64KB by the spec; stay well under it. */
const KEEPALIVE_MAX_BYTES = 60_000;

/**
 * Send a save from an unload or visibility handler.
 *
 * The Supabase client's request would be cancelled with the document, so this
 * issues the REST call directly with `keepalive`, which the browser is permitted
 * to complete after the page is gone. Returns whether the request was handed off
 * at all — never whether the server accepted it, which is why callers must not
 * treat a `true` here as a confirmed save.
 */
export function saveUserDataOnUnload(userId: string, payload: Partial<UserDataPayload>): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  const token = getCachedAccessToken();
  if (!token) return false;

  let body: string;
  try {
    body = JSON.stringify(toRow(userId, payload));
  } catch {
    return false;
  }
  if (new Blob([body]).size > KEEPALIVE_MAX_BYTES) return false;

  try {
    void fetch(`${supabaseUrl}/rest/v1/user_data?on_conflict=user_id`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body,
    });
    return true;
  } catch {
    return false;
  }
}

export function hasLocalData(): boolean {
  return ALL_DATA_KEYS.some(key => {
    const v = localStorage.getItem(key);
    return v !== null && v !== '[]' && v !== '{}' && v !== '';
  });
}

export async function migrateLocalToCloud(userId: string, clearLocal = false): Promise<{ error: Error | null }> {
  const { error } = await saveUserData(userId, {
    ...readLocalPayload(),
    sync_meta: { tombstones: getAllTombstones() },
  });
  if (error) return { error };
  SYNC_COLLECTIONS.forEach(markSynced);
  if (clearLocal) {
    ALL_DATA_KEYS.forEach(key => localStorage.removeItem(key));
  }
  return { error: null };
}

export async function resetCloudData(userId: string): Promise<{ error: Error | null }> {
  const empty: UserDataPayload = {
    tasks: [], goals: [], habits: [], habit_logs: {},
    daily_logs: [], projects: [], sub_projects: [],
    project_tasks: [], gamification: {}, settings: {},
  };
  return saveUserData(userId, empty);
}

export async function downloadCloudData(userId: string): Promise<UserDataPayload | null> {
  return loadUserData(userId);
}
