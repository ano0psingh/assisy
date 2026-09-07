import { useState, useCallback } from 'react';
import {
  CheckSquare,
  Sunrise,
  Sparkles,
  Target,
  TreePine,
} from 'lucide-react';
import { isOnboardingComplete, markOnboardingComplete } from '../../lib/onboarding';
import { ExpandableModal } from './ExpandableModal';
import { Button } from '../ui';

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
    <ExpandableModal
      isOpen={visible}
      onClose={finish}
      title={title}
      icon={<Icon className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-sm"
      expandable={false}
      showClose={false}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={finish}>Skip tour</Button>
          <Button variant="primary" onClick={next}>
            {isLast ? 'Start planning' : 'Next'}
          </Button>
        </div>
      )}
    >
      {() => (
        <div key={step} className="px-5 py-6 sm:px-6">
          <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
            {description}
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--rule)] pt-4">
            <span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">
              STEP {step + 1} / {STEPS.length}
            </span>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 transition-[width,background-color] duration-200 ${
                    i === step
                      ? 'w-6 bg-[var(--action)]'
                      : 'w-2 bg-[var(--rule-strong)]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </ExpandableModal>
  );
}
