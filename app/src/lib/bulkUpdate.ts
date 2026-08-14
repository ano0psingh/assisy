import type { BulkPatch } from '../types';

/**
 * Records what each targeted row holds today, so a bulk edit can be undone
 * field by field.
 *
 * Call this against render-time state and return the result from the mutator,
 * rather than collecting inside a `setState` updater — updaters can run twice
 * under StrictMode, which would double the patches.
 */
export function collectBulkPatches<T extends { id: string }>(
  items: T[],
  ids: string[],
  updates: Partial<T>,
  /** Extra fields to capture because applying `updates` recalculates them. */
  alsoCapture: Array<keyof T> = [],
): BulkPatch<T>[] {
  const targets = new Set(ids);
  if (targets.size === 0) return [];

  // Read keys from `updates`, not the row, so clearing a field to undefined is
  // still captured and can be put back.
  const keys = [...(Object.keys(updates) as Array<keyof T>), ...alsoCapture];

  return items
    .filter(item => targets.has(item.id))
    .map(item => {
      const previous: Partial<T> = {};
      for (const key of keys) {
        (previous as Record<string, unknown>)[key as string] = item[key];
      }
      return { id: item.id, previous };
    });
}

/** Applies `updates` to every row in `ids`, leaving other rows untouched. */
export function applyBulkUpdate<T extends { id: string }>(
  items: T[],
  ids: string[],
  updates: Partial<T>,
): T[] {
  const targets = new Set(ids);
  if (targets.size === 0) return items;
  return items.map(item => (targets.has(item.id) ? { ...item, ...updates } : item));
}

/** Restores the values captured by {@link collectBulkPatches}. */
export function revertBulkUpdate<T extends { id: string }>(
  items: T[],
  patches: BulkPatch<T>[],
): T[] {
  if (patches.length === 0) return items;
  const previousById = new Map(patches.map(patch => [patch.id, patch.previous]));
  return items.map(item => {
    const previous = previousById.get(item.id);
    return previous ? { ...item, ...previous } : item;
  });
}

/** Count for toasts, e.g. "3 tasks" / "1 task". */
export function pluralise(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Parses a `YYYY-MM-DD` value from a date input at local midnight.
 *
 * `new Date('YYYY-MM-DD')` parses as UTC midnight, which lands on the previous
 * day for anyone behind UTC.
 */
export function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00`);
}
