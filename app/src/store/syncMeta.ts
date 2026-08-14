/**
 * Bookkeeping that makes a safe local/cloud merge possible.
 *
 * Two things have to be remembered between sessions:
 *
 *  - Tombstones. A merge that unions both sides would otherwise resurrect
 *    anything deleted locally but still present in the cloud copy.
 *  - Dirty collections. A collection with writes that have not been confirmed
 *    saved to the cloud is the tie-breaker for entities carrying no timestamp.
 *
 * It also holds the pre-merge snapshot, so a bad reconciliation is recoverable
 * rather than final.
 */

import { ALL_DATA_KEYS, SYNC_COLLECTIONS, safeParse } from './storageKeys';
import type { TombstoneMap } from './merge';

const META_KEY = 'assisy_sync_meta';
const SNAPSHOTS_KEY = 'assisy_snapshots';
const MAX_SNAPSHOTS = 2;
/** Deletions older than this are assumed to have propagated everywhere. */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface SyncMeta {
  tombstones: Record<string, TombstoneMap>;
  dirty: Record<string, boolean>;
  lastSyncedAt?: string;
}

const EMPTY_META: SyncMeta = { tombstones: {}, dirty: {} };

function readMeta(): SyncMeta {
  const meta = safeParse<SyncMeta>(localStorage.getItem(META_KEY), EMPTY_META);
  return {
    tombstones: meta.tombstones ?? {},
    dirty: meta.dirty ?? {},
    lastSyncedAt: meta.lastSyncedAt,
  };
}

function writeMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Out of quota. Losing this bookkeeping degrades merge accuracy but the
    // union still protects the data itself, so carry on.
  }
  notifyListeners();
}

/**
 * Change notification, so the UI can report whether work is saved.
 *
 * Saving was previously silent, which left no way to tell whether today's edits
 * had reached the cloud. The dirty flags already answer that; this just makes
 * them observable.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must not break a save.
    }
  }
}

export function subscribeSyncMeta(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A stable primitive, safe to use as a `useSyncExternalStore` snapshot. */
export function getPendingSummary(): string {
  const meta = readMeta();
  const pending = Object.keys(meta.dirty).sort();
  return `${pending.length}:${pending.join(',')}:${meta.lastSyncedAt ?? ''}`;
}

export function getPendingCollections(): string[] {
  return Object.keys(readMeta().dirty).sort();
}

export function getTombstones(collection: string): TombstoneMap {
  return readMeta().tombstones[collection] ?? {};
}

export function isDirty(collection: string): boolean {
  return readMeta().dirty[collection] === true;
}

export function recordDeletions(collection: string, ids: string[]): void {
  if (ids.length === 0) return;
  const meta = readMeta();
  const existing = meta.tombstones[collection] ?? {};
  const deletedAt = new Date().toISOString();
  for (const id of ids) existing[id] = { deletedAt };
  meta.tombstones[collection] = existing;
  writeMeta(meta);
}

export function markDirty(collection: string): void {
  const meta = readMeta();
  if (meta.dirty[collection]) return;
  meta.dirty[collection] = true;
  writeMeta(meta);
}

/**
 * Called once a collection is known to be in the cloud. Tombstones are dropped
 * only after they have been pushed, otherwise a deletion would come straight
 * back on the next merge.
 */
export function markSynced(collection: string): void {
  const meta = readMeta();
  delete meta.dirty[collection];

  const tombstones = meta.tombstones[collection];
  if (tombstones) {
    const cutoff = Date.now() - TOMBSTONE_TTL_MS;
    const kept: TombstoneMap = {};
    for (const [id, tombstone] of Object.entries(tombstones)) {
      if (new Date(tombstone.deletedAt).getTime() >= cutoff) kept[id] = tombstone;
    }
    if (Object.keys(kept).length > 0) meta.tombstones[collection] = kept;
    else delete meta.tombstones[collection];
  }

  meta.lastSyncedAt = new Date().toISOString();
  writeMeta(meta);
}

export function getLastSyncedAt(): string | undefined {
  return readMeta().lastSyncedAt;
}

export interface Snapshot {
  takenAt: string;
  reason: string;
  data: Record<string, string>;
}

function readSnapshots(): Snapshot[] {
  return safeParse<Snapshot[]>(localStorage.getItem(SNAPSHOTS_KEY), []);
}

export function listSnapshots(): Array<Omit<Snapshot, 'data'>> {
  return readSnapshots().map(({ takenAt, reason }) => ({ takenAt, reason }));
}

/**
 * Copy every data key aside before something rewrites it. Best effort: a
 * snapshot is worth having but never worth failing a real write for, so quota
 * errors drop the oldest entries and then give up quietly.
 */
export function takeSnapshot(reason: string): void {
  const data: Record<string, string> = {};
  for (const key of ALL_DATA_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;

  const snapshots = [{ takenAt: new Date().toISOString(), reason, data }, ...readSnapshots()]
    .slice(0, MAX_SNAPSHOTS);

  for (let attempt = snapshots.length; attempt > 0; attempt--) {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots.slice(0, attempt)));
      return;
    } catch {
      // Too large; try again keeping fewer snapshots.
    }
  }
  try {
    localStorage.removeItem(SNAPSHOTS_KEY);
  } catch {
    // Nothing further to do.
  }
}

/** Returns false if the snapshot no longer exists. */
export function restoreSnapshot(takenAt: string): boolean {
  const snapshot = readSnapshots().find(s => s.takenAt === takenAt);
  if (!snapshot) return false;
  for (const key of ALL_DATA_KEYS) {
    const value = snapshot.data[key];
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }
  // The restored copy has to be treated as authoritative and pushed up, or the
  // next merge would reconcile it straight back to what we just undid.
  const meta = readMeta();
  meta.dirty = {};
  for (const collection of SYNC_COLLECTIONS) meta.dirty[collection] = true;
  writeMeta(meta);
  return true;
}
