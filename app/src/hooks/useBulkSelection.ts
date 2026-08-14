import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseBulkSelectionResult {
  /** True once the user has opted into selecting, even with nothing selected yet. */
  active: boolean;
  selectedIds: Set<string>;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Enters selection mode with nothing selected. */
  start: () => void;
  selectAll: () => void;
  /** Leaves selection mode and drops the selection. */
  clear: () => void;
  /** True when every currently visible id is selected. */
  allSelected: boolean;
}

/**
 * Selection state for the bulk action bars.
 *
 * `visibleIds` should be the ids the user can currently see (after filters), so
 * that "select all" and the deselect-on-disappear cleanup both respect them.
 */
export function useBulkSelection(visibleIds: string[]): UseBulkSelectionResult {
  const [active, setActive] = useState(false);
  const [rawSelected, setRawSelected] = useState<Set<string>>(new Set());

  const visibleKey = visibleIds.join(',');

  const clear = useCallback(() => {
    setActive(false);
    setRawSelected(new Set());
  }, []);

  // Escape leaves selection mode, matching the Feed page's behaviour.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, clear]);

  // Narrow to what is actually on screen at render time rather than syncing in
  // an effect: rows that get deleted or filtered away must not stay counted.
  const selectedIds = useMemo(() => {
    if (rawSelected.size === 0) return rawSelected;
    const visible = new Set(visibleKey ? visibleKey.split(',') : []);
    const next = new Set([...rawSelected].filter(id => visible.has(id)));
    return next.size === rawSelected.size ? rawSelected : next;
  }, [rawSelected, visibleKey]);

  const toggle = useCallback((id: string) => {
    setActive(true);
    setRawSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const start = useCallback(() => setActive(true), []);

  const selectAll = useCallback(() => {
    setActive(true);
    setRawSelected(new Set(visibleKey ? visibleKey.split(',') : []));
  }, [visibleKey]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const allSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id)),
    [visibleIds, selectedIds],
  );

  return {
    active,
    selectedIds,
    count: selectedIds.size,
    isSelected,
    toggle,
    start,
    selectAll,
    clear,
    allSelected,
  };
}
