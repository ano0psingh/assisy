import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDataVersion } from '../../context/DataVersionContext';
import { loadAll, applyPayloadToLocal } from '../../store/unifiedStore';

export function CloudSyncEffect() {
  const { user } = useAuth();
  const { refresh } = useDataVersion();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadAll(user.id).then((payload) => {
      if (cancelled) return;
      applyPayloadToLocal(payload);
      refresh();
    });
    return () => { cancelled = true; };
  }, [user?.id, refresh]);

  return null;
}
