import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon-only button.
 *
 * `label` is required and becomes the accessible name, so an unlabelled icon
 * button cannot be written by accident — the earlier accessibility pass had to
 * retrofit `aria-label` onto 68 of these one at a time.
 *
 * Sizes hold a minimum 40px touch target at `md`, which is what the tap-target
 * work established, so call sites do not have to remember padding tricks.
 */
export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonTone = 'default' | 'danger' | 'primary' | 'success' | 'warning' | 'info';

/**
 * Every tone rests at the same neutral colour and differs only on hover, which
 * is the convention the call sites had already converged on by hand. The accent
 * tones exist because the app needed six of them: with only default and danger
 * here, any button tinted violet or emerald had to stay hand-rolled, which is
 * why adoption stalled at a few dozen call sites.
 */
const TONES: Record<IconButtonTone, string> = {
  default: 'hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-gray-200',
  danger: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400',
  primary: 'hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/20 dark:hover:text-violet-400',
  success: 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400',
  warning: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/20 dark:hover:text-amber-400',
  info: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400',
};

const RESTING = 'text-slate-500 dark:text-gray-400';

/** Toggle buttons (toolbars) read as pressed rather than merely hovered. */
const ACTIVE = 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300';

/**
 * The three icon sizes the app actually uses. `md` holds a 40px touch target,
 * which is what the tap-target work established.
 */
const SIZES: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'p-2 rounded-lg', icon: 14 },
  md: { box: 'p-3 rounded-xl', icon: 16 },
  lg: { box: 'p-3 rounded-xl', icon: 18 },
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: LucideIcon;
  /** Accessible name. Also used as the tooltip unless `title` is given. */
  label: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  /** Marks a toggle as on. Also sets aria-pressed, so state is not colour-only. */
  active?: boolean;
}

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  tone = 'default',
  active,
  title,
  className = '',
  ...rest
}: IconButtonProps) {
  const { box, icon } = SIZES[size];
  return (
    <button
      aria-label={label}
      title={title ?? label}
      aria-pressed={active === undefined ? undefined : active}
      className={`inline-flex items-center justify-center transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
        ${active ? ACTIVE : `${RESTING} ${TONES[tone]}`} ${box} ${className}`}
      {...rest}
    >
      <Icon size={icon} />
    </button>
  );
}
