import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon-only button.
 *
 * `label` is required and becomes the accessible name, so an unlabelled icon
 * button cannot be written by accident — the earlier accessibility pass had to
 * retrofit `aria-label` onto 68 of these one at a time.
 *
 * Coarse pointers receive a 44px minimum target through the shared semantic
 * control styles, so call sites do not need padding tricks.
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
  default: '',
  danger: 'ui-icon-button--danger',
  primary: 'ui-icon-button--primary',
  success: 'ui-icon-button--success',
  warning: 'ui-icon-button--warning',
  info: 'ui-icon-button--info',
};

/**
 * The three icon sizes the app actually uses.
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
      className={`ui-control ui-icon-button inline-flex items-center justify-center
        ${TONES[tone]} ${box} ${className}`}
      {...rest}
    >
      <Icon size={icon} />
    </button>
  );
}
