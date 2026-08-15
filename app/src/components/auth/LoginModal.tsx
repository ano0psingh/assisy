import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { LogIn, Mail, Lock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const reset = () => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = mode === 'signin'
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password);
      if (err) {
        setError(err.message);
      } else if (mode === 'signup') {
        setSuccess('Check your email to confirm your account.');
      } else {
        onClose();
        reset();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message);
      else onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (!isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-slate-900/50'}`} onClick={onClose} />
        <div className={`relative rounded-2xl p-6 max-w-sm w-full ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Sign-in is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local. See SUPABASE_SETUP.md.
          </p>
          <button onClick={onClose} className="mt-4 btn-primary px-4 py-2 rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-slate-900/50'}`} onClick={onClose} />
      <div className={`relative rounded-2xl max-w-sm w-full overflow-hidden ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
              <LogIn className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <div>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Sign in</h2>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Sync your data across devices</p>
            </div>
          </div>
          <button aria-label="Close sign in" onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signin' ? (isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600') : (isDark ? 'text-gray-500 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50')}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signup' ? (isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600') : (isDark ? 'text-gray-500 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50')}`}
            >
              Sign up
            </button>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm outline-none border ${
                  isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm outline-none border ${
                  isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-500">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="relative">
            <div className={`absolute inset-0 flex items-center ${isDark ? '' : ''}`}>
              <span className={`flex-1 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
              <span className={`px-2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>or</span>
              <span className={`flex-1 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium border ${
              isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            } disabled:opacity-50`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
