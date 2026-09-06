import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLastSyncedAt, getPendingSummary, subscribeSyncMeta } from '../../store/syncMeta';

/**
 * Whether the current work has reached the cloud.
 *
 * Saving is debounced and invisible, so there was previously no way to tell
 * whether closing the tab would lose anything. The store already tracks which
 * collections are unsaved in order to reconcile them, so this reports that
 * state rather than guessing at it.
 */
function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

interface SyncSummary {
  pending: string[];
  outbox: number;
  syncing: boolean;
  error: string;
}

function parseSummary(summary: string): SyncSummary {
  try {
    return JSON.parse(summary) as SyncSummary;
  } catch {
    return { pending: [], outbox: 0, syncing: false, error: '' };
  }
}

function requestSync(): void {
  window.dispatchEvent(new Event('assisy:sync-request'));
}

function formatSyncedAt(iso: string | undefined): string {
  if (!iso) return 'Not synced yet';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Not synced yet';
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return 'Synced just now';
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}

export function SyncStatus() {
  const { user } = useAuth();
  const online = useOnline();
  const summary = useSyncExternalStore(subscribeSyncMeta, getPendingSummary, getPendingSummary);

  // Nothing to report for local-only use: there is no cloud to be behind.
  if (!user?.id) return null;

  const stateSummary = parseSummary(summary);
  const pending = stateSummary.pending;
  const pendingCount = Math.max(pending.length, stateSummary.outbox);
  const hasPending = pendingCount > 0;

  const state = stateSummary.error && online
    ? {
        Icon: TriangleAlert,
        text: 'Sync issue',
        title: `${stateSummary.error}. Your data remains saved on this device.`,
        tone: 'text-red-600 dark:text-red-400',
      }
    : !online
    ? {
        Icon: CloudOff,
        text: 'Offline',
        title: hasPending
          ? `Saved on this device. ${pendingCount} change set${pendingCount === 1 ? '' : 's'} will sync when you reconnect.`
          : 'Saved on this device. Will sync when you reconnect.',
        tone: 'text-amber-600 dark:text-amber-400',
      }
    : hasPending
      ? {
          Icon: RefreshCw,
          text: 'Saving',
          title: `Saving ${pending.join(', ')} to the cloud. Already saved on this device.`,
          tone: 'text-slate-500 dark:text-gray-400',
        }
      : {
          Icon: Check,
          text: 'Saved',
          title: formatSyncedAt(getLastSyncedAt()),
          tone: 'text-emerald-600 dark:text-emerald-400',
        };

  const { Icon, text, title, tone } = state;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}
      title={title}
      aria-live="polite"
    >
      <Icon size={13} className={stateSummary.syncing ? 'animate-spin' : undefined} />
      <span className="hidden sm:inline">{text}</span>
      <span className="sr-only">{title}</span>
    </span>
  );
}

/** Shown in Settings, where there is room to explain and to offer a retry. */
export function SyncStatusDetail() {
  const { user } = useAuth();
  const online = useOnline();
  const summary = useSyncExternalStore(subscribeSyncMeta, getPendingSummary, getPendingSummary);

  if (!user?.id) return null;

  const stateSummary = parseSummary(summary);
  const pendingCount = Math.max(stateSummary.pending.length, stateSummary.outbox);
  if (pendingCount === 0 && !stateSummary.error) {
    return (
      <p className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
        <Check size={13} />
        Everything is saved to the cloud. {formatSyncedAt(getLastSyncedAt())}.
      </p>
    );
  }

  return (
    <div className={`flex items-start gap-2 text-xs ${
      stateSummary.error ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
    }`}>
      <TriangleAlert size={13} className="mt-1 flex-shrink-0" />
      <span>
        {stateSummary.error
          ? `Cloud sync failed: ${stateSummary.error}. Your data is still saved on this device.`
          : `${pendingCount} change set${pendingCount === 1 ? '' : 's'} not yet confirmed in the cloud.`
        }
        {' '}
        <button
          type="button"
          onClick={requestSync}
          disabled={!online || stateSummary.syncing}
          className="underline disabled:opacity-50"
        >
          {stateSummary.syncing ? 'Retrying…' : 'Retry now'}
        </button>
      </span>
    </div>
  );
}
