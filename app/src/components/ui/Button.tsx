import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The app's button.
 *
 * Every button used to be built by hand — 344 of them — so padding, radius,
 * colour and hover state were re-decided at each call site. Visual states now
 * resolve through semantic CSS tokens, so call sites remain theme-independent.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'ui-button--primary',
  secondary: 'ui-button--secondary',
  ghost: 'ui-button--ghost',
  danger: 'ui-button--danger',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs gap-2',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
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
      className={`ui-control ui-button inline-flex items-center justify-center
        ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={ICON_SIZES[size]} className="flex-shrink-0" />}
      {children}
    </button>
  );
}
