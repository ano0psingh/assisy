import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The app's button.
 *
 * Every button used to be built by hand — 344 of them — so padding, radius,
 * colour and hover state were re-decided at each call site, and each one carried
 * its own light/dark ternary. Dark styling lives here as `dark:` variants, which
 * means call sites no longer need the theme at all.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'min-h-12 bg-primary text-canvas hover:bg-primary-hover disabled:hover:bg-primary',
  secondary:
    'border border-border bg-surface-raised text-text hover:bg-surface-subtle',
  ghost:
    'text-text-muted hover:bg-surface-subtle hover:text-text',
  danger:
    'border border-danger bg-surface text-danger hover:bg-surface-subtle',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-2 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-sm gap-2 rounded-xl',
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 13, md: 16, lg: 18 };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the label at a size matched to the button. */
  icon?: LucideIcon;
  /** Stretch to the container width. Off by default. */
  block?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  block = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none
        ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={ICON_SIZES[size]} className="flex-shrink-0" />}
      {children}
    </button>
  );
}
