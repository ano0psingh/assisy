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
  // `.card` remains alongside the semantic class while page call sites migrate.
  card: 'card ui-surface--card',
  nested: 'ui-surface--nested',
  inset: 'ui-surface--inset',
};

const RADII: Record<SurfaceRadius, string> = {
  lg: 'rounded-[var(--radius-md)]',
  xl: 'rounded-[var(--radius-lg)]',
  '2xl': 'rounded-[var(--radius-xl)]',
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
      className={`ui-surface ${LEVELS[level]} ${RADII[radius]} ${padded ? 'p-4' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
