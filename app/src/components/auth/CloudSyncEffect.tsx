import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDataVersion } from '../../context/DataVersionContext';
import { loadAll, applyPayloadToLocal, pushMergedToCloud } from '../../store/unifiedStore';

export function CloudSyncEffect() {
  const { user } = useAuth();
  const { refresh } = useDataVersion();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;

    loadAll(userId).then((payload) => {
      if (cancelled) return;
      applyPayloadToLocal(payload);
      refresh();
      // The reconciled copy exists only on this device until it is pushed; until
      // then the cloud still holds the pre-merge version.
      void pushMergedToCloud(userId, payload);
    });

    return () => { cancelled = true; };
  }, [user?.id, refresh]);

  return null;
}
