import { useState, useCallback } from 'react';
import {
  CheckSquare,
  Sunrise,
  Sparkles,
  Target,
  TreePine,
} from 'lucide-react';
import { isOnboardingComplete, markOnboardingComplete } from '../../lib/onboarding';

interface Step {
  icon: typeof CheckSquare;
  title: string;
  description: string;
  /** Used instead of the above on touch devices, where gestures apply. */
  touch?: { title: string; description: string };
}

/**
 * Whether the primary input is touch. The tour used to describe swiping and
 * tapping unconditionally, so desktop users were told to perform gestures their
 * mouse cannot do.
 */
function isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

const STEPS: Step[] = [
  {
    icon: CheckSquare,
    title: 'Complete a task in one click',
    description: 'Click the checkbox on any task card to mark it done.',
    touch: {
      title: 'Swipe tasks to complete',
      description: 'Swipe any task card left or right to mark it done instantly.',
    },
  },
  {
    icon: Sunrise,
    title: 'Plan your day each morning',
    description: 'Use Plan Your Day to pick your top priorities before you start.',
  },
  {
    icon: Sparkles,
    title: 'AI powers your briefing & insights',
    description: 'Get a smart daily briefing and personalized productivity insights.',
  },
  {
    icon: Target,
    title: 'Track habits with one click',
    description: 'Click a habit circle to log it — streaks build automatically.',
    touch: {
      title: 'Track habits with one tap',
      description: 'Tap a habit circle to log it — streaks build automatically.',
    },
  },
  {
    icon: TreePine,
    title: 'Watch your goal trees grow',
    description: 'Goals branch into milestones and tasks that visually grow as you progress.',
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(
    () => !isOnboardingComplete(),
  );

  const finish = useCallback(() => {
    markOnboardingComplete();
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    if (step === STEPS.length - 1) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  }, [step, finish]);

  if (!visible) return null;

  const current = STEPS[step];
  const { icon: Icon } = current;
  const { title, description } =
    current.touch && isTouchPrimary() ? current.touch : current;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div
        key={step}
        className={`
          relative mx-4 w-full max-w-sm rounded-2xl border p-6
          shadow-2xl backdrop-blur-xl
          animate-fade-in
          border-violet-200 bg-white/80 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white
        `}
      >
        <div className={`
          mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl
          bg-violet-100 dark:bg-violet-500/20
        `}>
          <Icon className="h-7 w-7 text-violet-500" />
        </div>

        <h2 className="mb-1 text-center text-lg font-bold">{title}</h2>
        <p className={`mb-6 text-center text-sm text-slate-500 dark:text-gray-400`}>
          {description}
        </p>

        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`
                h-2 rounded-full transition-all duration-300
                ${i === step
                  ? 'w-6 bg-violet-500'
                  : 'w-2 bg-slate-300 dark:bg-white/20'}
              `}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className={`text-sm font-medium text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors`}
          >
            Skip
          </button>
          <button
            onClick={next}
            className="rounded-lg bg-violet-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-105 active:scale-95"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
