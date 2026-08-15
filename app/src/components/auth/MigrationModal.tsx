import { useTheme } from '../../context/ThemeContext';
import { Cloud, X } from 'lucide-react';
import { hasLocalData, migrateLocalToCloud } from '../../store/cloudStore';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onMigrated: () => void;
}

export function MigrationModal({ isOpen, onClose, userId, onMigrated }: MigrationModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
      <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-slate-900/50'}`} onClick={handleSkip} />
      <div className={`relative rounded-2xl max-w-sm w-full overflow-hidden ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
              <Cloud className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <div>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Import local data?</h2>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>You have data on this device</p>
            </div>
          </div>
          <button aria-label="Close" onClick={handleSkip} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
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
              className={`flex-1 py-3 rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
