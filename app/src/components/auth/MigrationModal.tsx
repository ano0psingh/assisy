import { Cloud, X } from 'lucide-react';
import { hasLocalData, migrateLocalToCloud } from '../../store/cloudStore';
import { IconButton } from '../ui';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onMigrated: () => void;
}

export function MigrationModal({ isOpen, onClose, userId, onMigrated }: MigrationModalProps) {

  if (!isOpen || !hasLocalData()) return null;

  const handleMigrate = async () => {
    const { error } = await migrateLocalToCloud(userId, true);
    if (!error) {
      onMigrated();
      onClose();
      window.location.reload();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className={`absolute inset-0 bg-slate-900/50 dark:bg-black/70`} onClick={handleSkip} />
      <div className={`relative rounded-2xl max-w-sm w-full overflow-hidden bg-white border border-slate-200 dark:bg-slate-900 dark:border-white/10`}>
        <div className={`flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 dark:bg-violet-500/20`}>
              <Cloud className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />
            </div>
            <div>
              <h2 className={`font-semibold text-slate-800 dark:text-white`}>Import local data?</h2>
              <p className={`text-xs text-slate-500 dark:text-gray-500`}>You have data on this device</p>
            </div>
          </div>
          <IconButton
            icon={X}
            label="Close"
            size="lg"
            onClick={handleSkip}
          />
        </div>
        <div className="p-6 space-y-4">
          <p className={`text-sm text-slate-600 dark:text-gray-400`}>
            Import your local tasks, goals, habits, and projects to the cloud so they sync across devices.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleMigrate}
              className="flex-1 btn-primary py-3 rounded-lg text-sm font-medium"
            >
              Import to cloud
            </button>
            <button
              onClick={handleSkip}
              className={`flex-1 py-3 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10`}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
