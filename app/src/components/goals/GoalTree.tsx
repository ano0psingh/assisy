import type { GoalTheme } from '../../types';

interface GoalTreeProps {
  level: number;
  theme?: GoalTheme;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const THEME_COLORS: Record<GoalTheme, { trunk: string; leaves: string; accent: string; ground: string; glow: string }> = {
  forest: { trunk: '#8B5E3C', leaves: '#22C55E', accent: '#86EFAC', ground: '#65A30D', glow: '#4ADE80' },
  mountain: { trunk: '#78716C', leaves: '#94A3B8', accent: '#CBD5E1', ground: '#57534E', glow: '#E2E8F0' },
  ocean: { trunk: '#0E7490', leaves: '#22D3EE', accent: '#67E8F9', ground: '#155E75', glow: '#06B6D4' },
  space: { trunk: '#6D28D9', leaves: '#A78BFA', accent: '#C4B5FD', ground: '#4C1D95', glow: '#8B5CF6' },
  garden: { trunk: '#92400E', leaves: '#F472B6', accent: '#FBCFE8', ground: '#A16207', glow: '#EC4899' },
};

const SIZE_MAP = { sm: 80, md: 160, lg: 280 };

function getStagePaths(level: number, colors: typeof THEME_COLORS.forest) {
  if (level <= 2) {
    // Seed/sprout
    return (
      <g>
        <ellipse cx="50" cy="90" rx="15" ry="4" fill={colors.ground} opacity="0.4" />
        <line x1="50" y1="90" x2="50" y2={level === 1 ? 78 : 70} stroke={colors.trunk} strokeWidth="3" strokeLinecap="round" />
        {level >= 2 && (
          <>
            <ellipse cx="50" cy="66" rx="8" ry="12" fill={colors.leaves} opacity="0.9" />
            <ellipse cx="45" cy="70" rx="6" ry="8" fill={colors.leaves} opacity="0.7" />
          </>
        )}
        {level === 1 && (
          <ellipse cx="50" cy="76" rx="5" ry="7" fill={colors.leaves} opacity="0.8" />
        )}
      </g>
    );
  }

  if (level <= 4) {
    // Sapling
    return (
      <g>
        <ellipse cx="50" cy="92" rx="20" ry="5" fill={colors.ground} opacity="0.3" />
        <path d="M50 92 Q49 60 50 40" stroke={colors.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M50 65 Q35 55 30 48" stroke={colors.trunk} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {level >= 4 && <path d="M50 55 Q65 48 70 42" stroke={colors.trunk} strokeWidth="2" fill="none" strokeLinecap="round" />}
        <circle cx="50" cy="36" r="14" fill={colors.leaves} opacity="0.85" />
        <circle cx="35" cy="44" r="10" fill={colors.leaves} opacity="0.75" />
        {level >= 4 && <circle cx="68" cy="38" r="10" fill={colors.leaves} opacity="0.7" />}
        <circle cx="50" cy="30" r="8" fill={colors.accent} opacity="0.4" />
      </g>
    );
  }

  if (level <= 6) {
    // Young tree
    return (
      <g>
        <ellipse cx="50" cy="94" rx="28" ry="6" fill={colors.ground} opacity="0.3" />
        <path d="M50 94 Q48 55 50 28" stroke={colors.trunk} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M50 70 Q32 58 22 50" stroke={colors.trunk} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M50 55 Q68 45 76 38" stroke={colors.trunk} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M50 45 Q35 35 28 28" stroke={colors.trunk} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="22" r="18" fill={colors.leaves} opacity="0.85" />
        <circle cx="28" cy="44" r="13" fill={colors.leaves} opacity="0.8" />
        <circle cx="74" cy="32" r="14" fill={colors.leaves} opacity="0.75" />
        <circle cx="32" cy="26" r="11" fill={colors.leaves} opacity="0.7" />
        {level >= 6 && <circle cx="60" cy="18" r="10" fill={colors.accent} opacity="0.5" />}
        {level >= 6 && <circle cx="22" cy="38" r="4" fill={colors.accent} opacity="0.6" />}
      </g>
    );
  }

  if (level <= 8) {
    // Full tree with blossoms
    return (
      <g>
        <ellipse cx="50" cy="95" rx="32" ry="5" fill={colors.ground} opacity="0.3" />
        <path d="M50 95 Q47 50 50 20" stroke={colors.trunk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M50 75 Q28 60 16 48" stroke={colors.trunk} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M50 60 Q72 48 82 36" stroke={colors.trunk} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M50 45 Q30 32 22 22" stroke={colors.trunk} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M50 35 Q65 25 74 18" stroke={colors.trunk} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="15" r="20" fill={colors.leaves} opacity="0.85" />
        <circle cx="20" cy="42" r="15" fill={colors.leaves} opacity="0.8" />
        <circle cx="80" cy="30" r="16" fill={colors.leaves} opacity="0.8" />
        <circle cx="26" cy="20" r="13" fill={colors.leaves} opacity="0.75" />
        <circle cx="72" cy="14" r="14" fill={colors.leaves} opacity="0.75" />
        <circle cx="50" cy="8" r="10" fill={colors.accent} opacity="0.5" />
        {/* Blossoms */}
        <circle cx="35" cy="12" r="3" fill={colors.accent} opacity="0.8" />
        <circle cx="65" cy="10" r="3" fill={colors.accent} opacity="0.8" />
        <circle cx="18" cy="35" r="2.5" fill={colors.accent} opacity="0.7" />
        <circle cx="82" cy="24" r="2.5" fill={colors.accent} opacity="0.7" />
        {level >= 8 && (
          <>
            <circle cx="28" cy="28" r="3" fill={colors.accent} opacity="0.9" />
            <circle cx="70" cy="20" r="3" fill={colors.accent} opacity="0.9" />
            <circle cx="50" cy="5" r="2" fill="#FFF" opacity="0.6" />
          </>
        )}
      </g>
    );
  }

  // Level 9-10: Majestic tree with glow
  return (
    <g>
      <ellipse cx="50" cy="96" rx="35" ry="4" fill={colors.ground} opacity="0.3" />
      {/* Glow effect */}
      <circle cx="50" cy="40" r="45" fill={colors.glow} opacity="0.08">
        <animate attributeName="opacity" values="0.05;0.12;0.05" dur="3s" repeatCount="indefinite" />
      </circle>
      <path d="M50 96 Q46 48 50 14" stroke={colors.trunk} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M50 78 Q24 62 10 44" stroke={colors.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M50 62 Q76 48 90 32" stroke={colors.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M50 48 Q26 32 16 18" stroke={colors.trunk} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 36 Q72 22 82 12" stroke={colors.trunk} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 28 Q40 18 34 8" stroke={colors.trunk} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Dense canopy */}
      <circle cx="50" cy="10" r="22" fill={colors.leaves} opacity="0.9" />
      <circle cx="14" cy="38" r="17" fill={colors.leaves} opacity="0.85" />
      <circle cx="86" cy="26" r="18" fill={colors.leaves} opacity="0.85" />
      <circle cx="22" cy="16" r="15" fill={colors.leaves} opacity="0.8" />
      <circle cx="78" cy="10" r="16" fill={colors.leaves} opacity="0.8" />
      <circle cx="50" cy="4" r="14" fill={colors.accent} opacity="0.45" />
      <circle cx="36" cy="6" r="10" fill={colors.accent} opacity="0.35" />
      <circle cx="64" cy="4" r="10" fill={colors.accent} opacity="0.35" />
      {/* Sparkle particles */}
      {[
        { cx: 30, cy: 8 }, { cx: 70, cy: 6 }, { cx: 16, cy: 30 },
        { cx: 84, cy: 20 }, { cx: 50, cy: 2 }, { cx: 40, cy: 18 },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="2" fill="#FFF" opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="r" values="1.5;2.5;1.5" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

export function GoalTree({ level, theme = 'forest', size = 'md', animate = true }: GoalTreeProps) {
  const colors = THEME_COLORS[theme];
  const px = SIZE_MAP[size];
  const clampedLevel = Math.max(1, Math.min(10, level));

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={animate ? 'transition-all duration-700' : ''}
    >
      {getStagePaths(clampedLevel, colors)}
    </svg>
  );
}

export function GoalTreeThumbnail({ level, theme = 'forest' }: { level: number; theme?: GoalTheme }) {
  const colors = THEME_COLORS[theme];
  const clampedLevel = Math.max(1, Math.min(10, level));
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      {getStagePaths(clampedLevel, colors)}
    </svg>
  );
}
