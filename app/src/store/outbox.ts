import type { UserDataPayload } from './cloudStore';

const DB_NAME = 'assisy-sync';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

export interface OutboxMutation {
  id: string;
  userId: string;
  collection: string;
  payload: Partial<UserDataPayload>;
  revision: number;
  createdAt: string;
}

const memoryFallback = new Map<string, OutboxMutation>();
let lastRevision = 0;

function mutationId(userId: string, collection: string): string {
  return `${userId}:${collection}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Coalescing by collection makes retries idempotent and bounds offline growth. */
export async function enqueueMutation(
  userId: string,
  collection: string,
  payload: Partial<UserDataPayload>,
): Promise<OutboxMutation> {
  const revision = Math.max(Date.now(), lastRevision + 1);
  lastRevision = revision;
  const mutation: OutboxMutation = {
    id: mutationId(userId, collection),
    userId,
    collection,
    payload,
    revision,
    createdAt: new Date(revision).toISOString(),
  };
  memoryFallback.set(mutation.id, mutation);

  const db = await openDatabase();
  if (!db) return mutation;
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(mutation.id)) as OutboxMutation | undefined;
    if (!current || current.revision <= mutation.revision) store.put(mutation);
  } catch {
    // The in-memory copy still gives this session a retry path.
  } finally {
    db.close();
  }
  return mutation;
}

export async function listMutations(userId?: string): Promise<OutboxMutation[]> {
  const db = await openDatabase();
  if (!db) {
    return [...memoryFallback.values()].filter(item => !userId || item.userId === userId);
  }
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = userId
      ? store.index('userId').getAll(IDBKeyRange.only(userId))
      : store.getAll();
    const persisted = await requestResult(request) as OutboxMutation[];
    for (const mutation of memoryFallback.values()) {
      if ((!userId || mutation.userId === userId) &&
          !persisted.some(item => item.id === mutation.id && item.revision >= mutation.revision)) {
        persisted.push(mutation);
      }
    }
    return persisted.sort((a, b) => a.revision - b.revision);
  } catch {
    return [...memoryFallback.values()].filter(item => !userId || item.userId === userId);
  } finally {
    db.close();
  }
}

/** Only remove the exact revision sent; a newer edit may share the same id. */
export async function removeMutation(id: string, revision: number): Promise<void> {
  const memory = memoryFallback.get(id);
  // Another tab may already have persisted a newer revision. Once revision R
  // is acknowledged, no in-memory copy at or below R can still be useful; if
  // retained it could be merged back into IndexedDB and replayed later.
  if (memory && memory.revision <= revision) memoryFallback.delete(id);

  const db = await openDatabase();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(id)) as OutboxMutation | undefined;
    if (current?.revision === revision) store.delete(id);
  } finally {
    db.close();
  }
}

export async function countMutations(userId?: string): Promise<number> {
  return (await listMutations(userId)).length;
}
