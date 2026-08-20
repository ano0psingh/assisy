import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasLocalData, resetCloudData, downloadCloudData } from '../../store/cloudStore';
import { SyncStatusDetail } from '../common/SyncStatus';
import { getLocalDateString } from '../../lib/dateUtils';
import { User, Lock, Trash2, AlertTriangle, Check, Mail, Database, CloudOff, Download, RotateCcw } from 'lucide-react';

const LOCAL_KEYS = [
  'life-rpg-tasks', 'life-rpg-goals', 'life-rpg-habits', 'life-rpg-habit-logs',
  'life-rpg-daily-logs', 'assisy_projects', 'assisy_subprojects', 'assisy_project_tasks',
  'assisy_skill_trees', 'assisy_achievements', 'assisy_user_stats', 'life-rpg-theme',
  'equippedTitle', 'achievement_sounds_enabled', 'planYourDay_lastSeen',
  'assisy_pomodoro_settings', 'assisy_pomodoro_today',
];

interface AccountSettingsProps {
  onClose: () => void;
}

type Section = 'main' | 'password' | 'clearLocal' | 'resetCloud' | 'delete';

export function AccountSettings({ onClose }: AccountSettingsProps) {
  const { user, resetPassword, updatePassword, deleteAccount, signOut } = useAuth();

  const [section, setSection] = useState<Section>('main');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState('');

  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : 'Unknown';

  const provider = user?.app_metadata?.provider ?? 'email';

  const go = (s: Section) => { setSection(s); setMessage(null); setDangerConfirm(''); };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    setMessage(null);
    const { error } = await resetPassword(user.email);
    setLoading(false);
    setMessage(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Password reset email sent. Check your inbox.' });
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await updatePassword(newPassword);
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleClearLocalData = () => {
    LOCAL_KEYS.forEach(k => localStorage.removeItem(k));
    setMessage({ type: 'success', text: 'Local data cleared. Reloading...' });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleResetCloudData = async () => {
    if (dangerConfirm !== 'RESET' || !user?.id) return;
    setLoading(true);
    setMessage(null);
    const { error } = await resetCloudData(user.id);
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      LOCAL_KEYS.forEach(k => localStorage.removeItem(k));
      setMessage({ type: 'success', text: 'All data reset. Reloading...' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleDeleteAccount = async () => {
    if (dangerConfirm !== 'DELETE') return;
    setLoading(true);
    setMessage(null);
    const { error } = await deleteAccount();
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      LOCAL_KEYS.forEach(k => localStorage.removeItem(k));
      onClose();
      window.location.reload();
    }
  };

  const handleDownloadCloudData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await downloadCloudData(user.id);
    setLoading(false);
    if (!data) {
      setMessage({ type: 'error', text: 'No cloud data found.' });
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assisy-cloud-backup-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Cloud data downloaded.' });
  };

  const itemCls = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
    'hover:bg-slate-50 text-slate-700 dark:hover:bg-white/5 dark:text-gray-300'
  }`;

  const inputCls = `w-full px-3 py-3 rounded-lg text-sm outline-none border ${
    'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-600'
  }`;

  const backBtn = (
    <button onClick={() => go('main')} className={`text-xs font-medium mb-4 text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300`}>
      &larr; Back
    </button>
  );

  const msgEl = message && (
    <div className={`flex items-center gap-2 px-3 py-3 rounded-lg text-xs ${
      message.type === 'success'
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
        : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
    }`}>
      {message.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {message.text}
    </div>
  );

  // ---------- PASSWORD ----------
  if (section === 'password') {
    return (
      <div className="p-6 space-y-4">
        {backBtn}
        <SectionHeader icon={Lock} title="Change Password" color="violet" />
        {provider === 'google' ? (
          <p className={`text-sm text-slate-500 dark:text-gray-400`}>
            You signed in with Google. Password management is handled through your Google account.
          </p>
        ) : (
          <>
            <div>
              <label className={`block text-xs font-medium mb-2 text-slate-500 dark:text-gray-400`}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputCls} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-2 text-slate-500 dark:text-gray-400`}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputCls} />
            </div>
            {msgEl}
            <button onClick={handleUpdatePassword} disabled={loading} className="w-full btn-primary py-3 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <div className={`text-center text-slate-400 dark:text-gray-500`}>
              <span className="text-xs">or </span>
              <button onClick={handleResetPassword} disabled={loading} className={`text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300`}>
                send a reset email instead
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- CLEAR LOCAL ----------
  if (section === 'clearLocal') {
    return (
      <div className="p-6 space-y-4">
        {backBtn}
        <SectionHeader icon={CloudOff} title="Clear Local Data" color="amber" />
        <p className={`text-sm text-slate-500 dark:text-gray-400`}>
          Removes all data stored in this browser (tasks, goals, habits, projects, settings).
          {user ? ' Your cloud data will not be affected.' : ' This cannot be undone.'}
        </p>
        {hasLocalData() ? (
          <>
            {msgEl}
            <button onClick={handleClearLocalData} className={`w-full py-3 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30`}>
              Clear local data
            </button>
          </>
        ) : (
          <p className={`text-sm italic text-slate-400 dark:text-gray-500`}>No local data found.</p>
        )}
      </div>
    );
  }

  // ---------- RESET CLOUD ----------
  if (section === 'resetCloud') {
    return (
      <div className="p-6 space-y-4">
        {backBtn}
        <SectionHeader icon={RotateCcw} title="Reset Cloud Data" color="orange" />
        <div className={`px-3 py-3 rounded-lg text-xs bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400`}>
          <p className="font-medium">This will erase all your cloud data.</p>
          <p className="mt-1 opacity-80">All tasks, goals, habits, projects, achievements, and settings stored in the cloud will be permanently deleted. Local browser data will also be cleared.</p>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-2 text-slate-500 dark:text-gray-400`}>
            Type <span className="font-mono font-bold">RESET</span> to confirm
          </label>
          <input type="text" value={dangerConfirm} onChange={e => setDangerConfirm(e.target.value)} placeholder="RESET" className={inputCls} />
        </div>
        {msgEl}
        <button
          onClick={handleResetCloudData}
          disabled={dangerConfirm !== 'RESET' || loading}
          className={`w-full py-3 rounded-lg text-sm font-medium disabled:opacity-30 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30`}
        >
          {loading ? 'Resetting...' : 'Reset All Cloud Data'}
        </button>
      </div>
    );
  }

  // ---------- DELETE ACCOUNT ----------
  if (section === 'delete') {
    return (
      <div className="p-6 space-y-4">
        {backBtn}
        <SectionHeader icon={Trash2} title="Delete Account" color="red" />
        <div className={`px-3 py-3 rounded-lg text-xs bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400`}>
          <p className="font-medium">This action cannot be undone.</p>
          <p className="mt-1 opacity-80">All your cloud data will be permanently deleted and you will be signed out. Your account will need to be re-created.</p>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-2 text-slate-500 dark:text-gray-400`}>
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input type="text" value={dangerConfirm} onChange={e => setDangerConfirm(e.target.value)} placeholder="DELETE" className={inputCls} />
        </div>
        {msgEl}
        <button
          onClick={handleDeleteAccount}
          disabled={dangerConfirm !== 'DELETE' || loading}
          className={`w-full py-3 rounded-lg text-sm font-medium disabled:opacity-30 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30`}
        >
          {loading ? 'Deleting...' : 'Permanently Delete Account'}
        </button>
      </div>
    );
  }

  // ---------- MAIN ----------
  return (
    <div className="p-6 space-y-4">
      {/* Profile card */}
      <div className={`flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5`}>
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {(user?.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate text-slate-800 dark:text-white`}>
            {user?.user_metadata?.full_name || user?.email}
          </p>
          {user?.user_metadata?.full_name && (
            <p className={`text-xs truncate text-slate-400 dark:text-gray-500`}>{user.email}</p>
          )}
          <div className={`flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-gray-400`}>
            <span className="flex items-center gap-1">
              <Mail size={10} /> {provider === 'google' ? 'Google' : 'Email'}
            </span>
            <span>Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl bg-slate-50 dark:bg-white/5`}>
        <SyncStatusDetail />
      </div>

      {/* Security */}
      {provider !== 'google' && (
        <div>
          <p className={`text-xs uppercase tracking-wider font-semibold mb-1 px-4 text-slate-400 dark:text-gray-400`}>Security</p>
          <button onClick={() => go('password')} className={itemCls}>
            <Lock size={16} className={'text-slate-400 dark:text-gray-500'} />
            Change Password
          </button>
        </div>
      )}

      {/* Data */}
      <div>
        <p className={`text-xs uppercase tracking-wider font-semibold mb-1 px-4 text-slate-400 dark:text-gray-400`}>Data</p>
        <div className="space-y-1">
          <button onClick={handleDownloadCloudData} disabled={loading} className={itemCls}>
            <Download size={16} className={'text-slate-400 dark:text-gray-500'} />
            Download Cloud Backup
          </button>
          <button onClick={() => go('clearLocal')} className={itemCls}>
            <Database size={16} className={'text-slate-400 dark:text-gray-500'} />
            Clear Local Data
          </button>
          <button onClick={() => go('resetCloud')} className={`${itemCls} !text-orange-500 dark:!text-orange-400`}>
            <RotateCcw size={16} />
            Reset Cloud Data
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <p className={`text-xs uppercase tracking-wider font-semibold mb-1 px-4 text-red-400 dark:text-red-500/60`}>Danger Zone</p>
        <button onClick={() => go('delete')} className={`${itemCls} !text-red-500 dark:!text-red-400`}>
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      {/* Sign out */}
      <div className={`pt-3 border-t border-slate-100 dark:border-white/10`}>
        <button onClick={() => { signOut(); onClose(); }} className={`${itemCls} !text-slate-400 dark:!text-gray-500`}>
          <User size={16} />
          Sign Out
        </button>
      </div>

      {msgEl}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: typeof Lock; title: string; color: string; }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    violet: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
    red: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
  };
  const c = colorMap[color] ?? colorMap.violet;
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <h3 className={`font-semibold text-slate-800 dark:text-white`}>{title}</h3>
    </div>
  );
}
