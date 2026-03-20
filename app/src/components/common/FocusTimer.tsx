import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { useAuth } from '../../context/AuthContext';
import { saveSettings } from '../../store/unifiedStore';
import { Play, Pause, RotateCcw, X, Zap, Timer, SkipForward, Coffee, Brain, Settings2 } from 'lucide-react';
import { notifyPomodoroComplete } from '../../lib/notifications';

type Phase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartWork: false,
};

const STORAGE_KEY = 'assisy_pomodoro';
const XP_PER_POMODORO = 50;

function loadSettings(): PomodoroSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY + '_settings');
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function loadTodayStats(): { completed: number; totalMinutes: number; date: string } {
  try {
    const data = localStorage.getItem(STORAGE_KEY + '_today');
    const parsed = data ? JSON.parse(data) : null;
    const today = new Date().toISOString().split('T')[0];
    if (parsed?.date === today) return parsed;
    return { completed: 0, totalMinutes: 0, date: today };
  } catch { return { completed: 0, totalMinutes: 0, date: new Date().toISOString().split('T')[0] }; }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Pleasant chime: C5 → E5 → G5
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onReopen?: () => void;
  taskTitle?: string;
}

export function FocusTimer({ isOpen, onClose, onReopen, taskTitle }: FocusTimerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const { recordTaskCompletion, checkAndUnlockAchievements } = useGamification();

  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<Phase>('work');
  const [remaining, setRemaining] = useState(settings.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [todayStats, setTodayStats] = useState(loadTodayStats);
  const [justCompleted, setJustCompleted] = useState<Phase | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseDuration = phase === 'work'
    ? settings.workMinutes * 60
    : phase === 'shortBreak'
    ? settings.shortBreakMinutes * 60
    : settings.longBreakMinutes * 60;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = phaseDuration > 0 ? ((phaseDuration - remaining) / phaseDuration) * 100 : 0;

  const phaseColor = phase === 'work'
    ? { ring: 'stroke-violet-500', text: isDark ? 'text-violet-400' : 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' }
    : phase === 'shortBreak'
    ? { ring: 'stroke-emerald-500', text: isDark ? 'text-emerald-400' : 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' }
    : { ring: 'stroke-blue-500', text: isDark ? 'text-blue-400' : 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' };

  const persistSettings = (s: PomodoroSettings) => {
    setSettings(s);
    localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(s));
    saveSettings({ assisy_pomodoro_settings: s }, user?.id ?? null);
  };

  const saveTodayStats = useCallback((stats: typeof todayStats) => {
    setTodayStats(stats);
    localStorage.setItem(STORAGE_KEY + '_today', JSON.stringify(stats));
    saveSettings({ assisy_pomodoro_today: stats }, user?.id ?? null);
  }, [user?.id]);

  const startPhase = useCallback((p: Phase) => {
    setPhase(p);
    setJustCompleted(null);
    const duration = p === 'work'
      ? settings.workMinutes * 60
      : p === 'shortBreak'
      ? settings.shortBreakMinutes * 60
      : settings.longBreakMinutes * 60;
    setRemaining(duration);
  }, [settings]);

  const completePhase = useCallback(() => {
    setRunning(false);
    playNotificationSound();
    notifyPomodoroComplete(phase);
    setJustCompleted(phase);

    if (phase === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);

      const newStats = {
        ...todayStats,
        completed: todayStats.completed + 1,
        totalMinutes: todayStats.totalMinutes + settings.workMinutes,
        date: new Date().toISOString().split('T')[0],
      };
      saveTodayStats(newStats);

      recordTaskCompletion('Personal', XP_PER_POMODORO);
      setTimeout(() => checkAndUnlockAchievements(), 200);

      // Auto-start break
      const isLongBreak = newCount % settings.longBreakInterval === 0;
      const nextPhase: Phase = isLongBreak ? 'longBreak' : 'shortBreak';

      if (settings.autoStartBreaks) {
        setTimeout(() => {
          startPhase(nextPhase);
          setRunning(true);
        }, 1500);
      } else {
        setTimeout(() => startPhase(nextPhase), 1500);
      }
    } else {
      // Break completed — go to work
      if (settings.autoStartWork) {
        setTimeout(() => {
          startPhase('work');
          setRunning(true);
        }, 1500);
      } else {
        setTimeout(() => startPhase('work'), 1500);
      }
    }
  }, [phase, sessionCount, todayStats, settings, startPhase, saveTodayStats, recordTaskCompletion, checkAndUnlockAchievements]);

  // Timer tick
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            completePhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining, completePhase]);

  // Refresh today stats when opening
  useEffect(() => {
    if (isOpen) {
      setTodayStats(loadTodayStats());
    }
  }, [isOpen]);

  // Mini floating indicator when running but modal closed
  if (!isOpen) {
    if (!running && !justCompleted) return null;
    return (
      <button
        onClick={onReopen || onClose}
        className={`fixed bottom-20 md:bottom-6 right-6 z-[55] flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 ${
          phase === 'work'
            ? isDark ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400' : 'bg-violet-100 border border-violet-200 text-violet-600'
            : isDark ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border border-emerald-200 text-emerald-600'
        }`}
        title="Open Pomodoro"
      >
        <div className="relative">
          <Timer size={16} />
          {running && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-current animate-pulse" />}
        </div>
        <span className="text-sm font-mono font-semibold tabular-nums">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-xs opacity-70">{phase === 'work' ? 'Focus' : 'Break'}</span>
      </button>
    );
  }

  const skipPhase = () => {
    setRunning(false);
    if (phase === 'work') {
      const isLong = (sessionCount + 1) % settings.longBreakInterval === 0;
      startPhase(isLong ? 'longBreak' : 'shortBreak');
    } else {
      startPhase('work');
    }
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const phaseLabel = phase === 'work' ? 'Focus' : phase === 'shortBreak' ? 'Short Break' : 'Long Break';
  const PhaseIcon = phase === 'work' ? Brain : Coffee;

  // Settings panel
  if (showSettings) {
    const inputCls = `w-full px-3 py-2 rounded-lg text-sm outline-none ${
      isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'
    }`;
    return (
      <div className="fixed inset-0 z-[55] flex items-center justify-center">
        <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-slate-900/30'}`} onClick={() => setShowSettings(false)} />
        <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden ${isDark ? 'bg-[#12121a] border border-white/10' : 'bg-white'} shadow-2xl`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Pomodoro Settings</h2>
            <button onClick={() => setShowSettings(false)} className={`p-1.5 rounded-lg ${isDark ? 'text-gray-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Focus Duration (min)</label>
              <input type="number" min={1} max={90} value={settings.workMinutes} onChange={e => persistSettings({ ...settings, workMinutes: Math.max(1, +e.target.value) })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Short Break (min)</label>
                <input type="number" min={1} max={30} value={settings.shortBreakMinutes} onChange={e => persistSettings({ ...settings, shortBreakMinutes: Math.max(1, +e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Long Break (min)</label>
                <input type="number" min={1} max={60} value={settings.longBreakMinutes} onChange={e => persistSettings({ ...settings, longBreakMinutes: Math.max(1, +e.target.value) })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Long break after every N sessions</label>
              <input type="number" min={2} max={8} value={settings.longBreakInterval} onChange={e => persistSettings({ ...settings, longBreakInterval: Math.max(2, +e.target.value) })} className={inputCls} />
            </div>
            <div className="space-y-2">
              {([
                { key: 'autoStartBreaks' as const, label: 'Auto-start breaks' },
                { key: 'autoStartWork' as const, label: 'Auto-start work sessions' },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={settings[key]} onChange={e => persistSettings({ ...settings, [key]: e.target.checked })} className="sr-only" />
                    <div className={`w-9 h-5 rounded-full transition-all ${settings[key] ? 'bg-violet-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${settings[key] ? 'translate-x-[18px]' : 'translate-x-[3px]'} mt-[3px]`} />
                    </div>
                  </div>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => { startPhase('work'); setShowSettings(false); }}
              className="btn-primary w-full py-2.5 rounded-xl text-sm"
            >
              Apply & Reset Timer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-slate-900/30'}`} onClick={() => !running && onClose()} />
      <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden ${isDark ? 'bg-[#12121a] border border-white/10' : 'bg-white'} shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${phaseColor.text}`} />
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Pomodoro</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(true)} className={`p-1.5 rounded-lg ${isDark ? 'text-gray-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`} title="Settings">
              <Settings2 size={16} />
            </button>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'text-gray-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Phase indicator tabs */}
          <div className={`flex rounded-xl overflow-hidden border mb-5 w-full ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {([
              { p: 'work' as Phase, label: 'Focus', icon: Brain },
              { p: 'shortBreak' as Phase, label: 'Short Break', icon: Coffee },
              { p: 'longBreak' as Phase, label: 'Long Break', icon: Coffee },
            ]).map(({ p, label, icon: Icon }) => (
              <button
                key={p}
                onClick={() => { if (!running) startPhase(p); }}
                disabled={running}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all ${
                  phase === p
                    ? p === 'work'
                      ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                      : p === 'shortBreak'
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                      : isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    : isDark ? 'text-gray-500' : 'text-slate-400'
                } ${running && phase !== p ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Task context */}
          {taskTitle && phase === 'work' && (
            <p className={`text-xs mb-3 px-3 py-1 rounded-lg ${isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-50 text-slate-500'}`}>
              {taskTitle}
            </p>
          )}

          {/* Circular timer */}
          <div className="relative w-48 h-48 mb-5">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r={radius} fill="none" strokeWidth="5"
                className={isDark ? 'stroke-white/5' : 'stroke-slate-100'} />
              <circle cx="90" cy="90" r={radius} fill="none" strokeWidth="5" strokeLinecap="round"
                className={justCompleted ? 'stroke-emerald-500' : phaseColor.ring}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 1s linear',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {justCompleted ? (
                <>
                  <span className={`text-lg font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                    {justCompleted === 'work' ? 'Session Complete!' : 'Break Over!'}
                  </span>
                  {justCompleted === 'work' && (
                    <span className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>
                      <Zap size={12} /> +{XP_PER_POMODORO} XP
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className={`text-4xl font-mono font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                  <span className={`text-xs mt-1 flex items-center gap-1 ${phaseColor.text}`}>
                    <PhaseIcon size={12} /> {phaseLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Session dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i < (sessionCount % settings.longBreakInterval)
                    ? isDark ? 'bg-violet-400' : 'bg-violet-500'
                    : i === (sessionCount % settings.longBreakInterval) && phase === 'work' && running
                    ? isDark ? 'bg-violet-400/50 animate-pulse' : 'bg-violet-300 animate-pulse'
                    : isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />
            ))}
            <span className={`ml-2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              #{sessionCount + (phase === 'work' && running ? 1 : 0)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!justCompleted && (
              <button
                onClick={() => running ? setRunning(false) : setRunning(true)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  running
                    ? isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'btn-primary'
                }`}
              >
                {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {remaining < phaseDuration ? 'Resume' : 'Start'}</>}
              </button>
            )}
            {running && (
              <button
                onClick={skipPhase}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm ${
                  isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title="Skip to next phase"
              >
                <SkipForward size={14} /> Skip
              </button>
            )}
            {!running && !justCompleted && remaining < phaseDuration && (
              <button
                onClick={() => startPhase(phase)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm ${
                  isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>

          {/* Today's stats */}
          <div className={`mt-5 flex items-center gap-4 px-4 py-2.5 rounded-xl w-full ${phaseColor.bg}`}>
            <div className="flex-1 text-center">
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{todayStats.completed}</div>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>sessions</p>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex-1 text-center">
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{todayStats.totalMinutes}</div>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>minutes</p>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex-1 text-center">
              <div className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{todayStats.completed * XP_PER_POMODORO}</div>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP earned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
