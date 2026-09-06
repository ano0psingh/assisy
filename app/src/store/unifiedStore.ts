import {
  loadCloudState,
  saveUserData,
  saveUserDataOnUnload,
  writePayloadToLocalStorage,
  readLocalPayload,
  type UserDataPayload,
} from './cloudStore';
import {
  ENTITY_COLLECTIONS,
  GAMIFICATION_KEYS,
  HABIT_LOGS_KEY,
  JSON_SETTINGS_KEYS,
  SETTINGS_KEYS,
  SYNC_COLLECTIONS,
  type EntityCollection,
} from './storageKeys';
import { mergeEntities, mergeLogMaps, mergeGamification } from './merge';
import {
  getAllTombstones,
  getTombstones,
  isDirty,
  markDirty,
  markSynced,
  mergeTombstones,
  recordDeletions,
  setSyncTransport,
  takeSnapshot,
} from './syncMeta';
import {
  countMutations,
  enqueueMutation,
  listMutations,
  removeMutation,
} from './outbox';

export type StoreSource = 'local' | 'cloud';

interface PendingSave {
  userId: string;
  collection: string;
  payload: Partial<UserDataPayload>;
}

let saveDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let pendingSaves: Record<string, PendingSave> = {};
const DEBOUNCE_MS = 500;

/**
 * Queue a cloud write. The collection stays marked dirty until the write is
 * confirmed, which is what lets the next merge know this device holds newer data
 * than the cloud even if the write never lands.
 */
function scheduleCloudSave(
  collection: string,
  userId: string,
  build: () => Partial<UserDataPayload>,
): void {
  const timerKey = `${userId}-${collection}`;
  if (saveDebounceTimers[timerKey]) clearTimeout(saveDebounceTimers[timerKey]);
  let payload: Partial<UserDataPayload>;
  try {
    payload = {
      ...build(),
      sync_meta: { tombstones: getAllTombstones() },
    };
  } catch {
    setSyncTransport({ error: `Could not prepare ${collection} for sync` });
    return;
  }
  pendingSaves[timerKey] = { userId, collection, payload };
  void enqueueMutation(userId, collection, payload).then(() => refreshPendingCount(userId));

  saveDebounceTimers[timerKey] = setTimeout(() => {
    delete saveDebounceTimers[timerKey];
    delete pendingSaves[timerKey];
    void retryPendingSync(userId);
  }, DEBOUNCE_MS);
}

async function refreshPendingCount(userId?: string): Promise<void> {
  setSyncTransport({ pendingMutations: await countMutations(userId) });
}

let activeFlush: Promise<void> | null = null;

/** Drain durable writes. Safe to call from reconnect, refresh, and intervals. */
export function retryPendingSync(userId?: string): Promise<void> {
  if (activeFlush) return activeFlush;
  const run = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await refreshPendingCount(userId);
      return;
    }
    setSyncTransport({ syncing: true, error: undefined });
    try {
      const mutations = await listMutations(userId);
      for (const mutation of mutations) {
        const { error } = await saveUserData(
          mutation.userId,
          mutation.payload,
          mutation.revision,
        );
        if (error) throw error;
        await removeMutation(mutation.id, mutation.revision);
        const remaining = await listMutations(mutation.userId);
        if (mutation.collection === 'reconciliation') {
          for (const collection of SYNC_COLLECTIONS) {
            if (!remaining.some(item => item.collection === collection)) markSynced(collection);
          }
        } else if (!remaining.some(item => item.collection === mutation.collection)) {
          markSynced(mutation.collection);
        }
      }
      await refreshPendingCount(userId);
    } catch (error) {
      setSyncTransport({
        error: error instanceof Error ? error.message : 'Cloud sync failed',
      });
      await refreshPendingCount(userId);
    } finally {
      setSyncTransport({ syncing: false });
    }
  })();
  activeFlush = run.finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

/**
 * Push everything still queued in a single request before the page goes away.
 *
 * A normal `fetch` started here is usually cancelled when the document unloads,
 * so this uses a keepalive request that the browser is allowed to finish. It is
 * still best effort — keepalive bodies are capped at 64KB and the request may
 * fail silently — so correctness does not depend on it. Anything unconfirmed
 * stays dirty and wins the next merge instead.
 */
export function flushPendingSaves(): void {
  for (const timerKey of Object.keys(saveDebounceTimers)) {
    clearTimeout(saveDebounceTimers[timerKey]);
  }
  const pending = Object.values(pendingSaves);
  saveDebounceTimers = {};
  pendingSaves = {};
  if (pending.length === 0) return;

  const byUser = new Map<string, Partial<UserDataPayload>>();
  for (const save of pending) {
    const payload = byUser.get(save.userId) ?? {};
    Object.assign(payload, save.payload);
    byUser.set(save.userId, payload);
  }

  // Deliberately not marked synced: a keepalive request gives no response, so
  // these collections stay dirty and win the next merge. Being wrongly treated
  // as newer is harmless; being wrongly treated as saved is not.
  for (const [userId, payload] of byUser) {
    // Keepalive cannot perform the compatibility retry used by the normal
    // client, so only send columns guaranteed to exist before Phase 2.
    const legacyCompatible = { ...payload };
    delete legacyCompatible.sync_meta;
    saveUserDataOnUnload(userId, legacyCompatible);
  }
}

if (typeof window !== 'undefined') {
  // `visibilitychange` is the reliable one on mobile, where the tab is often
  // frozen without ever firing `beforeunload`.
  window.addEventListener('beforeunload', flushPendingSaves);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSaves();
  });
}

interface Entity {
  id?: string;
  updatedAt?: string;
}

/**
 * Stamp `updatedAt` on entities whose contents changed, and report which ids
 * disappeared.
 *
 * Doing this centrally in the save path, by diffing against what is already
 * stored, means none of the context mutators have to remember to maintain the
 * timestamp. `updatedAt` itself is excluded from the comparison so that a stamp
 * from a previous save is not mistaken for a change on the next one.
 */
function stampChanges(previous: unknown[], next: unknown[]): { stamped: unknown[]; removedIds: string[] } {
  const previousById = new Map<string, string>();
  for (const item of previous) {
    const entity = item as Entity;
    if (!entity?.id) continue;
    previousById.set(entity.id, comparableJson(entity));
  }

  const now = new Date().toISOString();
  const seen = new Set<string>();
  const stamped = next.map(item => {
    const entity = item as Entity;
    if (!entity?.id) return item;
    seen.add(entity.id);
    const before = previousById.get(entity.id);
    const after = comparableJson(entity);
    if (before === after) return item;
    return { ...entity, updatedAt: now };
  });

  const removedIds = [...previousById.keys()].filter(id => !seen.has(id));
  return { stamped, removedIds };
}

function comparableJson(entity: Entity): string {
  try {
    const withoutStamp: Record<string, unknown> = { ...entity };
    delete withoutStamp.updatedAt;
    return JSON.stringify(withoutStamp);
  } catch {
    return '';
  }
}

function persistEntities(
  collection: EntityCollection,
  next: unknown[],
  userId: string | null,
): void {
  const previous = readStoredArray(collection.storageKey);
  const { stamped, removedIds } = stampChanges(previous, next);

  try {
    localStorage.setItem(collection.storageKey, JSON.stringify(stamped));
  } catch (error) {
    console.error(`Error saving ${collection.payloadKey} to localStorage:`, error);
  }

  recordDeletions(collection.payloadKey, removedIds);
  markDirty(collection.payloadKey);

  if (userId) {
    scheduleCloudSave(collection.payloadKey, userId, () => ({
      [collection.payloadKey]: readStoredArray(collection.storageKey),
    }));
  }
}

function readStoredArray(storageKey: string): unknown[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function collection(payloadKey: EntityCollection['payloadKey']): EntityCollection {
  const found = ENTITY_COLLECTIONS.find(c => c.payloadKey === payloadKey);
  if (!found) throw new Error(`Unknown collection: ${payloadKey}`);
  return found;
}

/**
 * Reconcile local and cloud rather than letting either side win outright.
 *
 * The cloud copy used to replace the local one whenever it existed, which threw
 * away any work whose cloud write had not landed yet.
 */
export async function loadAll(userId: string | null): Promise<UserDataPayload> {
  if (!userId) return readLocalPayload();

  const cloud = await loadCloudState(userId);
  // Deliberately read after the network wait. Edits made while login fetches
  // must participate in this merge instead of being overwritten by its result.
  const currentLocal = readLocalPayload();
  if (!cloud) return currentLocal;

  mergeTombstones(cloud.tombstones);
  return mergePayloads(currentLocal, cloud.payload);
}

export function mergePayloads(local: UserDataPayload, cloud: UserDataPayload): UserDataPayload {
  const merged: UserDataPayload = {};

  for (const spec of ENTITY_COLLECTIONS) {
    merged[spec.payloadKey] = mergeEntities(
      (local[spec.payloadKey] ?? []) as Array<{ id: string }>,
      (cloud[spec.payloadKey] ?? []) as Array<{ id: string }>,
      getTombstones(spec.payloadKey),
      isDirty(spec.payloadKey),
    );
  }

  merged.habit_logs = mergeLogMaps(
    (local.habit_logs ?? {}) as Record<string, Array<{ date: string }>>,
    (cloud.habit_logs ?? {}) as Record<string, Array<{ date: string }>>,
    isDirty('habit_logs'),
  );

  merged.gamification = mergeGamification(local.gamification, cloud.gamification);

  // Preferences are last-write-wins; the dirty side is the more recent one.
  merged.settings = isDirty('settings')
    ? { ...cloud.settings, ...local.settings }
    : { ...local.settings, ...cloud.settings };

  return merged;
}

/**
 * Write a reconciled payload over local storage, snapshotting first so a bad
 * merge can be undone from Settings.
 *
 * Most launches reconcile to exactly what is already stored, and snapshotting
 * those would burn storage quota and bury the one snapshot worth keeping.
 */
export function applyPayloadToLocal(payload: UserDataPayload): void {
  if (changesLocalData(payload)) takeSnapshot('Before cloud sync');
  writePayloadToLocalStorage(payload);
}

function changesLocalData(payload: UserDataPayload): boolean {
  const local = readLocalPayload();
  return (Object.keys(payload) as Array<keyof UserDataPayload>).some(key => {
    try {
      return JSON.stringify(payload[key]) !== JSON.stringify(local[key]);
    } catch {
      return true;
    }
  });
}

/**
 * Push the reconciled result back up so the cloud converges on it, and clear the
 * dirty flags that merge decisions were based on.
 */
export async function pushMergedToCloud(userId: string, payload: UserDataPayload): Promise<void> {
  await enqueueMutation(userId, 'reconciliation', {
    ...payload,
    sync_meta: { tombstones: getAllTombstones() },
  });
  await refreshPendingCount(userId);
  await retryPendingSync(userId);
}

export function saveTasks(tasks: unknown[], userId: string | null): void {
  persistEntities(collection('tasks'), tasks, userId);
}

export function saveGoals(goals: unknown[], userId: string | null): void {
  persistEntities(collection('goals'), goals, userId);
}

export function saveHabits(habits: unknown[], userId: string | null): void {
  persistEntities(collection('habits'), habits, userId);
}

export function saveDailyLogs(logs: unknown[], userId: string | null): void {
  persistEntities(collection('daily_logs'), logs, userId);
}

export function saveProjects(projects: unknown[], userId: string | null): void {
  persistEntities(collection('projects'), projects, userId);
}

export function saveSubProjects(subProjects: unknown[], userId: string | null): void {
  persistEntities(collection('sub_projects'), subProjects, userId);
}

export function saveProjectTasks(tasks: unknown[], userId: string | null): void {
  persistEntities(collection('project_tasks'), tasks, userId);
}

export function saveHabitLogs(logs: Record<string, unknown>, userId: string | null): void {
  localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(logs));
  markDirty('habit_logs');
  if (userId) {
    scheduleCloudSave('habit_logs', userId, () => ({ habit_logs: logs }));
  }
}

export function saveGamification(
  skillTrees: unknown[],
  achievements: unknown[],
  userStats: unknown,
  userId: string | null
): void {
  localStorage.setItem(GAMIFICATION_KEYS.skillTrees, JSON.stringify(skillTrees));
  localStorage.setItem(GAMIFICATION_KEYS.achievements, JSON.stringify(achievements));
  localStorage.setItem(GAMIFICATION_KEYS.userStats, JSON.stringify(userStats));
  markDirty('gamification');
  if (userId) {
    scheduleCloudSave('gamification', userId, () => ({
      gamification: { skillTrees, achievements, userStats },
    }));
  }
}

export function saveSettings(partial: Record<string, unknown>, userId: string | null): void {
  for (const [field, key] of Object.entries(SETTINGS_KEYS)) {
    const value = partial[field];
    if (value !== undefined && value !== null) localStorage.setItem(key, String(value));
  }
  for (const [field, key] of Object.entries(JSON_SETTINGS_KEYS)) {
    const value = partial[field];
    if (value !== undefined && value !== null) localStorage.setItem(key, JSON.stringify(value));
  }
  markDirty('settings');
  if (userId) {
    scheduleCloudSave('settings', userId, () => ({
      settings: readLocalPayload().settings,
    }));
  }
}
