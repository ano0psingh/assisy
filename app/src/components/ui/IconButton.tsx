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
export type IconButtonSize = 'sm' | 'md';
export type IconButtonTone = 'default' | 'danger';

const TONES: Record<IconButtonTone, string> = {
  default:
    'text-slate-500 hover:bg-slate-200 hover:text-slate-700 ' +
    'dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200',
  danger:
    'text-slate-400 hover:bg-red-50 hover:text-red-600 ' +
    'dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400',
};

const SIZES: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'p-2 rounded-lg', icon: 14 },
  md: { box: 'p-3 rounded-xl', icon: 16 },
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: LucideIcon;
  /** Accessible name. Also used as the tooltip unless `title` is given. */
  label: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
}

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  tone = 'default',
  title,
  className = '',
  ...rest
}: IconButtonProps) {
  const { box, icon } = SIZES[size];
  return (
    <button
      aria-label={label}
      title={title ?? label}
      className={`inline-flex items-center justify-center transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
        ${TONES[tone]} ${box} ${className}`}
      {...rest}
    >
      <Icon size={icon} />
    </button>
  );
}
