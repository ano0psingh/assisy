import { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Download, Upload, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { ALL_DATA_KEYS } from '../../store/storageKeys';
import { listSnapshots, restoreSnapshot, takeSnapshot } from '../../store/syncMeta';
import { getLocalDateString } from '../../lib/dateUtils';

// Sourced from the store so an export can never again silently omit a key. The
// hardcoded list here had drifted and was excluding all gamification data.
const ALL_KEYS = ALL_DATA_KEYS;

export function DataExportImport({ onClose: _onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [snapshots, setSnapshots] = useState(() => listSnapshots());

  const handleExport = () => {
    const data: Record<string, unknown> = {};
    ALL_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assisy-backup-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('success');
    setMessage('Backup downloaded successfully');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid format');

        takeSnapshot('Before importing a backup');

        let restored = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (ALL_KEYS.includes(key)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            restored++;
          }
        });

        if (restored === 0) throw new Error('No valid data found in file');

        setStatus('success');
        setMessage(`Restored ${restored} data sets. Reload the page to see changes.`);
        setSnapshots(listSnapshots());
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to import data');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = (takenAt: string) => {
    if (restoreSnapshot(takenAt)) {
      setStatus('success');
      setMessage('Restored that snapshot. Reload the page to see changes.');
      setSnapshots(listSnapshots());
    } else {
      setStatus('error');
      setMessage('That snapshot is no longer available.');
    }
  };

  return (
    <div className="space-y-5">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Export Backup</h3>
        <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          Download all your data as a JSON file. Includes tasks, goals, habits, projects, achievements, and settings.
        </p>
        <button
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            isDark
              ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
              : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
          }`}
        >
          <Download size={16} />
          Export Data
        </button>
      </div>

      <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Import Backup</h3>
        <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          Restore from a previously exported JSON file. This will overwrite your current data.
        </p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            isDark
              ? 'bg-white/10 text-gray-300 hover:bg-white/15'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          <Upload size={16} />
          Import Data
        </button>
      </div>

      {snapshots.length > 0 && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Automatic Snapshots
          </h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
            Taken automatically before your data is merged with the cloud or overwritten by an
            import, so a bad sync can be undone.
          </p>
          <div className="space-y-2">
            {snapshots.map(snapshot => (
              <div
                key={snapshot.takenAt}
                className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    {snapshot.reason}
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    {new Date(snapshot.takenAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRestoreSnapshot(snapshot.takenAt)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                    isDark
                      ? 'bg-white/10 text-gray-300 hover:bg-white/15'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <History size={13} />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
          status === 'success'
            ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
        }`}>
          {status === 'success' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
          {message}
        </div>
      )}
    </div>
  );
}
