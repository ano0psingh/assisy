import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowRight, Crown, Sparkles, Star, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGoalContext, type LevelUpEvent } from '../../context/GoalContext';
import { useGamification, type GlobalLevelUpEvent } from '../../context/GamificationContext';
import { GoalTree } from '../goals/GoalTree';
import { hapticHeavy, hapticLight } from '../../lib/haptics';

const CONFETTI_COLORS = ['#B45309', '#0F766E', '#44403C', '#DC2626', '#D6D3D1'];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 10 + ((index * 37) % 80);
  const delay = (index % 9) * 0.09;
  const duration = 1.5 + (index % 7) * 0.2;
  const size = 4 + (index % 6);
  const rotation = (index * 47) % 360;
  const isCircle = index % 3 === 0;

  return (
    <div
      className="absolute confetti-particle motion-reduce:hidden"
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

type CelebrationData = {
  kind: 'goal';
  event: LevelUpEvent;
} | {
  kind: 'global';
  event: GlobalLevelUpEvent;
};

export function LevelUpCelebration() {
  const { levelUpEvent, clearLevelUp } = useGoalContext();
  const { globalLevelUp, clearGlobalLevelUp } = useGamification();
  const location = useLocation();
  const navigate = useNavigate();
  const isProgressRoute = location.pathname === '/progress';
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<CelebrationData | null>(null);
  const queue = useRef<CelebrationData[]>([]);

  const showNext = useCallback(() => {
    if (queue.current.length > 0) {
      const next = queue.current.shift()!;
      setData(next);
      setVisible(true);
      if (window.location.pathname === '/progress') hapticHeavy();
      else hapticLight();
    }
  }, []);

  useEffect(() => {
    if (levelUpEvent) {
      queue.current.push({ kind: 'goal', event: levelUpEvent });
      if (!visible) showNext();
    }
  }, [levelUpEvent, visible, showNext]);

  useEffect(() => {
    if (globalLevelUp) {
      queue.current.push({ kind: 'global', event: globalLevelUp });
      if (!visible) showNext();
    }
  }, [globalLevelUp, visible, showNext]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (data?.kind === 'goal') clearLevelUp();
      if (data?.kind === 'global') clearGlobalLevelUp();
      setData(null);
      showNext();
    }, 400);
  }, [data, clearLevelUp, clearGlobalLevelUp, showNext]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(handleDismiss, 6000);
    return () => clearTimeout(timer);
  }, [visible, handleDismiss]);

  if (!data) return null;

  const isGoal = data.kind === 'goal';
  const newLevel = data.event.newLevel;
  const totalXP = data.event.totalXP;
  const heading = isGoal ? 'Goal Level Up!' : 'Level Up!';
  const subtitle = isGoal ? (data.event as LevelUpEvent).goalTitle : (data.event as GlobalLevelUpEvent).title;

  if (!isProgressRoute) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[100] ml-auto max-w-sm border border-stone-300 bg-stone-50 p-4 shadow-lg shadow-stone-950/15 transition-all duration-300 motion-reduce:transition-none dark:border-stone-700 dark:bg-stone-950 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <Crown size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{heading} Level {newLevel}</p>
            <p className="mt-0.5 truncate text-xs text-stone-600 dark:text-stone-400">
              {subtitle} · {totalXP.toLocaleString()} XP
            </p>
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                navigate('/progress?view=achievements');
              }}
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-teal-700 underline decoration-teal-700/40 underline-offset-4 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
            >
              View the Progress record <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Dismiss level notification"
            onClick={handleDismiss}
            className="-mr-1 -mt-1 p-2 text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <X size={16} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-400 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-stone-950/60" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      <div
        className="relative levelup-card max-w-sm w-[90vw] mx-4 border border-stone-300 bg-stone-50 p-6 text-center shadow-2xl shadow-stone-950/30 dark:border-stone-700 dark:bg-stone-950 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Dismiss"
          onClick={handleDismiss}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
            'text-slate-400 hover:bg-slate-100 dark:text-gray-500 dark:hover:bg-white/10'
          }`}
        >
          <X size={18} />
        </button>

        <div className="levelup-crown mb-2">
          <Crown className="w-8 h-8 mx-auto text-amber-400 drop-shadow-lg" />
        </div>

        <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
          {heading}
        </h2>

        <div className="levelup-tree my-4 flex justify-center">
          {isGoal ? (
            <GoalTree level={newLevel} theme={(data.event as LevelUpEvent).goalTheme || 'forest'} size="lg" animate />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <Star className={`w-12 h-12 text-amber-500 dark:text-amber-400`} fill="currentColor" />
            </div>
          )}
        </div>

        <div className="levelup-badge mb-3 inline-flex items-center gap-2 border-y border-stone-300 px-6 py-3 dark:border-stone-700">
          <Sparkles className={`w-5 h-5 text-amber-500 dark:text-amber-400`} />
          <span className={`text-3xl font-black tabular-nums text-slate-800 dark:text-white`}>
            {newLevel}
          </span>
        </div>

        <p className={`text-base font-semibold mb-1 text-slate-800 dark:text-white`}>
          {subtitle}
        </p>

        <p className={`text-sm text-slate-500 dark:text-gray-400`}>
          {totalXP.toLocaleString()} XP earned
        </p>

        <p className={`mt-4 text-xs text-slate-400 dark:text-gray-400`}>
          Filed in your Progress record · tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
