import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useAuth } from '../../context/AuthContext';
import { useDataVersion } from '../../context/DataVersionContext';
import { Button } from '../ui';
import { readLocalPayload } from '../../store/cloudStore';
import {
  loadAll,
  applyPayloadToLocal,
  flushPendingSaves,
  mergePayloads,
  pushMergedToCloud,
  retryPendingSync,
} from '../../store/unifiedStore';

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;

export function CloudSyncEffect() {
  const { user } = useAuth();
  const { dataVersion, refresh } = useDataVersion();
  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const suppressRefreshRef = useRef(false);
  const previousVersionRef = useRef(dataVersion);
  const userIdRef = useRef(user?.id);
  const reconcileRef = useRef<() => Promise<void>>(async () => {});
  const updateServiceWorkerRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  userIdRef.current = user?.id;

  const reconcile = useCallback(async () => {
    const userId = user?.id;
    if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;

    try {
      // Pull and merge before draining the outbox. An offline mutation may be
      // based on an older cloud snapshot; the reconciliation write queued
      // below is deliberately sent last so both sides converge safely.
      const payload = await loadAll(userId);
      if (userIdRef.current !== userId) return;
      // Close the final fetch-to-apply window as well: an edit can land after
      // loadAll's post-fetch read but before this continuation resumes.
      const latestPayload = mergePayloads(readLocalPayload(), payload);
      applyPayloadToLocal(latestPayload);
      suppressRefreshRef.current = true;
      refresh();
      await pushMergedToCloud(userId, latestPayload);
    } finally {
      runningRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        // Use the latest callback so an account switch cannot rerun the
        // reconciliation captured for the previous account.
        void reconcileRef.current();
      }
    }
  }, [user?.id, refresh]);
  reconcileRef.current = reconcile;

  useEffect(() => {
    if (!user?.id) return;
    void reconcile();

    const onOnline = () => { void reconcile(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reconcile();
    };
    const onManualSync = () => { void reconcile(); };
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reconcile();
    }, RECONCILE_INTERVAL_MS);

    window.addEventListener('online', onOnline);
    window.addEventListener('assisy:sync-request', onManualSync);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('assisy:sync-request', onManualSync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, reconcile]);

  // Pull-to-refresh increments DataVersion. Treat that as a manual cloud
  // reconciliation, except when the increment was produced by this component.
  useEffect(() => {
    if (previousVersionRef.current === dataVersion) return;
    previousVersionRef.current = dataVersion;
    if (suppressRefreshRef.current) {
      suppressRefreshRef.current = false;
      return;
    }
    void reconcile();
  }, [dataVersion, reconcile]);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateAvailable(true);
      },
    });
    updateServiceWorkerRef.current = updateSW;
    return () => {
      updateServiceWorkerRef.current = null;
    };
  }, []);

  const applyUpdate = async () => {
    const updateServiceWorker = updateServiceWorkerRef.current;
    if (!updateServiceWorker) return;
    setApplyingUpdate(true);
    flushPendingSaves();
    await retryPendingSync(userIdRef.current);
    await updateServiceWorker(true);
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="card fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl p-4 text-slate-800 shadow-elevated dark:text-white sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Assisy is ready to update</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          We’ll save pending changes before reloading.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={() => setUpdateAvailable(false)}>
          Later
        </Button>
        <Button variant="primary" onClick={() => void applyUpdate()} disabled={applyingUpdate}>
          {applyingUpdate ? 'Saving…' : 'Update now'}
        </Button>
      </div>
    </div>
  );
}
