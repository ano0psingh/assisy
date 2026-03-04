import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { hasLocalData } from '../../store/cloudStore';
import { User, Lock, Trash2, AlertTriangle, Check, Mail, Database, CloudOff } from 'lucide-react';

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

export function AccountSettings({ onClose }: AccountSettingsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, resetPassword, updatePassword, deleteAccount, signOut } = useAuth();

  const [section, setSection] = useState<'main' | 'password' | 'clear' | 'delete'>('main');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : 'Unknown';

  const provider = user?.app_metadata?.provider ?? 'email';

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    setMessage(null);
    const { error } = await resetPassword(user.email);
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
    }
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
    setMessage({ type: 'success', text: 'Local data cleared.' });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
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

  const itemCls = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
    isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
  }`;

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
    isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
  }`;

  const backBtn = (
    <button
      onClick={() => { setSection('main'); setMessage(null); }}
      className={`text-xs font-medium mb-4 ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
    >
      &larr; Back
    </button>
  );

  const msgEl = message && (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs ${
      message.type === 'success'
        ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
        : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
    }`}>
      {message.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {message.text}
    </div>
  );

  if (section === 'password') {
    return (
      <div className="p-5 space-y-4">
        {backBtn}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
            <Lock className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          </div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Change Password</h3>
        </div>
        {provider === 'google' ? (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            You signed in with Google. Password management is handled through your Google account.
          </p>
        ) : (
          <>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputCls} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputCls} />
            </div>
            {msgEl}
            <button onClick={handleUpdatePassword} disabled={loading} className="w-full btn-primary py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <div className={`text-center ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              <span className="text-xs">or </span>
              <button onClick={handleResetPassword} disabled={loading} className={`text-xs font-medium ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}>
                send a reset email instead
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (section === 'clear') {
    return (
      <div className="p-5 space-y-4">
        {backBtn}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
            <CloudOff className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Clear Local Data</h3>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          This removes all data stored in this browser (tasks, goals, habits, projects, settings). {user ? 'Your cloud data will not be affected.' : 'This cannot be undone.'}
        </p>
        {hasLocalData() ? (
          <>
            {msgEl}
            <button onClick={handleClearLocalData} className={`w-full py-2.5 rounded-lg text-sm font-medium ${isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
              Clear local data
            </button>
          </>
        ) : (
          <p className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>No local data found.</p>
        )}
      </div>
    );
  }

  if (section === 'delete') {
    return (
      <div className="p-5 space-y-4">
        {backBtn}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <Trash2 className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Delete Account</h3>
        </div>
        <div className={`px-3 py-2.5 rounded-lg text-xs ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
          <p className="font-medium">This action cannot be undone.</p>
          <p className="mt-1 opacity-80">All your cloud data will be permanently deleted and you will be signed out.</p>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" className={inputCls} />
        </div>
        {msgEl}
        <button
          onClick={handleDeleteAccount}
          disabled={deleteConfirm !== 'DELETE' || loading}
          className={`w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-30 ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
        >
          {loading ? 'Deleting...' : 'Permanently Delete Account'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Profile card */}
      <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {(user?.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {user?.user_metadata?.full_name || user?.email}
          </p>
          {user?.user_metadata?.full_name && (
            <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{user.email}</p>
          )}
          <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            <span className="flex items-center gap-1">
              <Mail size={10} /> {provider === 'google' ? 'Google' : 'Email'}
            </span>
            <span>Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="space-y-1">
        {provider !== 'google' && (
          <button onClick={() => { setSection('password'); setMessage(null); }} className={itemCls}>
            <Lock size={16} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
            Change Password
          </button>
        )}
        <button onClick={() => { setSection('clear'); setMessage(null); }} className={itemCls}>
          <Database size={16} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
          Clear Local Data
        </button>
        <button onClick={() => { setSection('delete'); setMessage(null); }} className={`${itemCls} ${isDark ? '!text-red-400' : '!text-red-500'}`}>
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      {/* Sign out */}
      <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
        <button onClick={() => { signOut(); onClose(); }} className={`${itemCls} ${isDark ? '!text-gray-500' : '!text-slate-400'}`}>
          <User size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
