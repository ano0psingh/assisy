import type { HTMLAttributes, ReactNode } from 'react';

/**
 * A panel.
 *
 * Light surfaces were previously drawn with any of nine near-duplicate white
 * opacities between 50% and 95%, chosen per call site. There are three levels
 * here and no more: the page-level card, something nested inside it, and a
 * quieter inset region.
 */
export type SurfaceLevel = 'card' | 'nested' | 'inset';
export type SurfaceRadius = 'lg' | 'xl' | '2xl';

const LEVELS: Record<SurfaceLevel, string> = {
  // Delegates to the `.card` class rather than restating it in Tailwind. Restating
  // it meant a panel built from this component had no shadow and no backdrop blur
  // while the forty-odd panels using the class directly had both, so the two routes
  // to "a card" did not agree. The class derives its colours from the theme
  // variables, which is what makes it work in both themes without a dark: variant.
  card: 'card',
  nested: 'bg-slate-50 border border-slate-200/60 dark:bg-white/5 dark:border-white/5',
  inset: 'bg-slate-50/70 dark:bg-white/5',
};

const RADII: Record<SurfaceRadius, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  radius?: SurfaceRadius;
  /** Apply the standard inner padding. Off when the content manages its own. */
  padded?: boolean;
  children?: ReactNode;
}

export function Surface({
  level = 'card',
  radius = '2xl',
  padded = true,
  className = '',
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={`${LEVELS[level]} ${RADII[radius]} ${padded ? 'p-4' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
