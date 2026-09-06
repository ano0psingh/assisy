import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon-only button.
 *
 * `label` is required and becomes the accessible name, so an unlabelled icon
 * button cannot be written by accident — the earlier accessibility pass had to
 * retrofit `aria-label` onto 68 of these one at a time.
 *
 * Sizes use explicit square boxes so toolbars align and primary mobile actions
 * can opt into the 48px `lg` target.
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
  default: 'hover:bg-surface-subtle hover:text-text',
  danger: 'hover:bg-surface-subtle hover:text-danger',
  primary: 'hover:bg-primary-soft hover:text-primary',
  success: 'hover:bg-surface-subtle hover:text-success',
  warning: 'hover:bg-surface-subtle hover:text-warning',
  info: 'hover:bg-surface-subtle hover:text-info',
};

const RESTING = 'text-text-muted';

/** Toggle buttons (toolbars) read as pressed rather than merely hovered. */
const ACTIVE = 'bg-primary-soft text-primary';

/**
 * The three icon sizes the app actually uses.
 */
const SIZES: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'h-9 w-9 rounded-lg', icon: 14 },
  md: { box: 'h-11 w-11 rounded-xl', icon: 16 },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 18 },
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
      className={`inline-flex flex-shrink-0 items-center justify-center transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        focus-visible:outline-none
        ${active ? ACTIVE : `${RESTING} ${TONES[tone]}`} ${box} ${className}`}
      {...rest}
    >
      <Icon size={icon} />
    </button>
  );
}
