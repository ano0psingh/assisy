import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * `useState` that survives navigation and reloads by mirroring to localStorage.
 *
 * Page filters, view modes and drill-down positions live in component state, so
 * they reset every time a route unmounts — which the swipe-between-pages
 * gesture makes easy to do by accident. Persisting them keeps the user where
 * they left off.
 *
 * Only for small UI preferences. Domain data belongs in the stores, which
 * handle cloud sync.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : (JSON.parse(stored) as T);
    } catch {
      // Corrupt or unreadable entry: fall back rather than break the page.
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or a full quota — the in-memory value still works.
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Same as {@link usePersistentState} for a `Set`, which JSON cannot represent
 * directly. Used for expanded/collapsed group ids.
 */
export function usePersistentSet(
  key: string,
  defaultValue: string[] = [],
): [Set<string>, (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void] {
  const [ids, setIds] = usePersistentState<string[]>(key, defaultValue);

  // `ids` only changes identity when it is actually set, so this stays stable
  // for consumers that depend on the Set.
  const asSet = useMemo(() => new Set(ids), [ids]);

  const setSet = useCallback(
    (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setIds(prev => {
        const prevSet = new Set(prev);
        const resolved = typeof next === 'function' ? next(prevSet) : next;
        return Array.from(resolved);
      });
    },
    [setIds],
  );

  return [asSet, setSet];
}
