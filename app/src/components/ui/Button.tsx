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
    'bg-violet-600 text-white hover:bg-violet-500 disabled:hover:bg-violet-600',
  secondary:
    'bg-slate-200 text-slate-700 hover:bg-slate-300 ' +
    'dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15',
  ghost:
    'text-slate-600 hover:bg-slate-100 ' +
    'dark:text-gray-400 dark:hover:bg-white/10',
  danger:
    'bg-red-50 text-red-600 hover:bg-red-100 ' +
    'dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs gap-2 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-sm gap-2 rounded-xl',
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
      className={`inline-flex items-center justify-center font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
        ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={ICON_SIZES[size]} className="flex-shrink-0" />}
      {children}
    </button>
  );
}
