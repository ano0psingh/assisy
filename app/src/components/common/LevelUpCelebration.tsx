import { useEffect, useState, useCallback } from 'react';
import { Crown, Sparkles, X } from 'lucide-react';
import { useGoalContext, type LevelUpEvent } from '../../context/GoalContext';
import { GoalTree } from '../goals/GoalTree';
import { useTheme } from '../../context/ThemeContext';
import { hapticHeavy } from '../../lib/haptics';

const CONFETTI_COLORS = ['#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#60A5FA', '#F87171'];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 10 + Math.random() * 80;
  const delay = Math.random() * 0.8;
  const duration = 1.5 + Math.random() * 1.5;
  const size = 4 + Math.random() * 6;
  const rotation = Math.random() * 360;
  const isCircle = index % 3 === 0;

  return (
    <div
      className="absolute confetti-particle"
      style={{
        left: `${left}%`,
        top: '-5%',
        width: size,
        height: isCircle ? size : size * 2.5,
        backgroundColor: color,
        borderRadius: isCircle ? '50%' : '2px',
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

export function LevelUpCelebration() {
  const { levelUpEvent, clearLevelUp } = useGoalContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState<LevelUpEvent | null>(null);

  useEffect(() => {
    if (levelUpEvent) {
      setEvent(levelUpEvent);
      setVisible(true);
      hapticHeavy();
    }
  }, [levelUpEvent]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      clearLevelUp();
      setEvent(null);
    }, 400);
  }, [clearLevelUp]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(handleDismiss, 6000);
    return () => clearTimeout(timer);
  }, [visible, handleDismiss]);

  if (!event) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-400 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`} />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Main card */}
      <div
        className={`relative levelup-card rounded-3xl p-6 sm:p-8 max-w-sm w-[90vw] mx-4 text-center shadow-2xl ${
          isDark
            ? 'bg-gradient-to-b from-violet-950/95 via-gray-900/95 to-gray-950/95 border border-violet-500/30'
            : 'bg-gradient-to-b from-violet-50 via-white to-slate-50 border border-violet-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors ${
            isDark ? 'text-gray-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <X size={18} />
        </button>

        {/* Glow ring */}
        <div className="levelup-glow absolute -inset-1 rounded-3xl opacity-50 blur-xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
        />

        {/* Crown icon */}
        <div className="levelup-crown mb-2">
          <Crown className="w-8 h-8 mx-auto text-amber-400 drop-shadow-lg" />
        </div>

        {/* Title */}
        <h2 className={`text-sm font-semibold uppercase tracking-widest mb-1 ${
          isDark ? 'text-violet-400' : 'text-violet-600'
        }`}>
          Level Up!
        </h2>

        {/* Tree visualization */}
        <div className="levelup-tree my-4 flex justify-center">
          <GoalTree level={event.newLevel} theme={event.goalTheme || 'forest'} size="lg" animate />
        </div>

        {/* Level badge */}
        <div className="levelup-badge inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl mb-3"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(168,85,247,0.2))'
              : 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
            border: isDark ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <Sparkles className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <span className={`text-3xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {event.newLevel}
          </span>
        </div>

        {/* Goal name */}
        <p className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {event.goalTitle}
        </p>

        {/* Sub text */}
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          {event.totalXP.toLocaleString()} XP earned
        </p>

        {/* Tap to dismiss */}
        <p className={`mt-4 text-[11px] ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
