import { useMemo } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { useTheme } from '../../context/ThemeContext';
import type { SkillTree } from '../../types';

// Level milestones for visual display
const LEVEL_MILESTONES = [1, 5, 10, 25, 50, 100];

function SkillNode({ skill, isDark, index }: { skill: SkillTree; isDark: boolean; index: number }) {
  const xpToNextLevel = 100;
  const currentLevelXP = skill.currentXP % xpToNextLevel;
  const progress = (currentLevelXP / xpToNextLevel) * 100;

  // Calculate ring progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get next milestone
  const nextMilestone = LEVEL_MILESTONES.find(m => m > skill.level) || skill.level + 10;

  return (
    <div
      className="relative group"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Main skill node */}
      <div
        className="relative flex flex-col items-center border border-[var(--rule)] bg-[var(--surface-raised)] p-6 transition-colors hover:border-[var(--action)]"
        style={{
          boxShadow: isDark
            ? '0 8px 20px rgba(0,0,0,0.22)'
            : '0 8px 20px rgba(41,37,36,0.06)',
        }}
      >
        {/* Circular progress ring */}
        <div className="relative w-28 h-28 mb-4">
          {/* Background ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              strokeWidth="8"
              fill="none"
            />
            {/* Progress ring */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={skill.color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-colors"
              style={{
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="mb-1 text-xl font-bold uppercase" style={{ color: skill.color }} aria-hidden="true">
              {skill.name.slice(0, 1)}
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: skill.color }}
            >
              Lv.{skill.level}
            </span>
          </div>
        </div>

        {/* Skill name */}
        <h3 className={`font-semibold text-center mb-1 text-[var(--ink)]`}>
          {skill.name}
        </h3>

        {/* XP Progress */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs">
            <span className={'text-[var(--ink-muted)]'}>
              {currentLevelXP} / {xpToNextLevel} XP
            </span>
            <span style={{ color: skill.color }} className="font-medium">
              {Math.round(progress)}%
            </span>
          </div>

          {/* XP bar */}
          <div className={`h-2 rounded-full overflow-hidden bg-[var(--surface-inset)]`}>
            <div
              className="h-full rounded-full transition-colors"
              style={{
                width: `${progress}%`,
                backgroundColor: skill.color,
              }}
            />
          </div>
        </div>

        {/* Total XP */}
        <p className={`text-xs mt-3 text-[var(--ink-muted)]`}>
          Total: {skill.currentXP.toLocaleString()} XP
        </p>

        {/* Milestone indicator */}
        <div className={`mt-3 px-3 py-2 rounded-full text-xs font-medium ${
          'bg-[var(--surface-subtle)]'
        }`}>
          <span className={'text-[var(--ink-muted)]'}>
            Next milestone: Lv.{nextMilestone}
          </span>
        </div>
      </div>
    </div>
  );
}

// Central hub showing total level
function CentralHub() {
  const { getTotalLevel, getTotalXP, getTitle, userStats, getStreakMultiplier } = useGamification();
  const level = getTotalLevel();
  const totalXP = getTotalXP();
  const title = getTitle();
  const multiplier = getStreakMultiplier();

  return (
    <section className="relative border-y border-[var(--rule-strong)] bg-[var(--surface-raised)] p-6 sm:p-8">
      <div className="relative flex flex-col items-center text-center">
        {/* Level badge */}
        <div className="mb-4 flex h-24 w-24 items-center justify-center border border-[var(--warning)] bg-[var(--warning-soft)] dark:border-amber-800 dark:bg-amber-950">
          <span className="text-4xl font-bold text-[var(--warning)]">
            {level}
          </span>
        </div>

        <h2 className={`text-2xl font-bold mb-1 text-[var(--ink)]`}>
          {title}
        </h2>

        <p className={`text-sm mb-4 text-[var(--ink-muted)]`}>
          Total XP: {totalXP.toLocaleString()}
        </p>

        {/* Streak multiplier */}
        {multiplier > 1 && (
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            'bg-[var(--warning-soft)] text-[var(--warning)]'
          }`}>
            {multiplier}x streak bonus active
          </div>
        )}

        {/* Quick stats */}
        <div className="mt-6 grid w-full max-w-xl grid-cols-3 divide-x divide-[var(--rule)] border-y border-[var(--rule)]">
          <div className="p-3">
            <div className={`text-lg font-bold text-[var(--ink)]`}>
              {userStats.dailyLoginStreak}
            </div>
            <div className={`text-xs text-[var(--ink-muted)]`}>
              Day Streak
            </div>
          </div>
          <div className="p-3">
            <div className={`text-lg font-bold text-[var(--ink)]`}>
              {userStats.totalDaysActive}
            </div>
            <div className={`text-xs text-[var(--ink-muted)]`}>
              Days Active
            </div>
          </div>
          <div className="p-3">
            <div className={`text-lg font-bold text-[var(--ink)]`}>
              {userStats.productiveDays}
            </div>
            <div className={`text-xs text-[var(--ink-muted)]`}>
              Productive
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SkillTreeViz() {
  const { theme } = useTheme();
  const { skillTrees } = useGamification();
  const isDark = theme === 'dark';

  // Sort skills by level (highest first)
  const sortedSkills = useMemo(() =>
    [...skillTrees].sort((a, b) => b.currentXP - a.currentXP),
    [skillTrees]
  );

  return (
    <div className="space-y-8">
      {/* Central Hub */}
      <CentralHub />

      {/* Skill Tree Grid */}
      <div className="grid grid-cols-1 divide-y divide-[var(--rule)] border-y border-[var(--rule-strong)] bg-[var(--surface)] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {sortedSkills.map((skill, index) => (
          <SkillNode
            key={skill.id}
            skill={skill}
            isDark={isDark}
            index={index}
          />
        ))}
      </div>

      {/* Legend / How it works */}
      <div className="border-y border-[var(--rule-strong)] bg-[var(--surface-raised)] p-6">
        <h4 className="mb-4 text-lg font-bold tracking-[-0.015em] text-[var(--ink)]">
          How skill XP works
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className={`p-3 rounded-md bg-[var(--surface)]`}>

            <span className={'text-[var(--ink-secondary)]'}>
              <strong>Productivity:</strong> Complete tasks, plan days
            </span>
          </div>
          <div className={`p-3 rounded-md bg-[var(--surface)]`}>

            <span className={'text-[var(--ink-secondary)]'}>
              <strong>Financial:</strong> Financial category tasks
            </span>
          </div>
          <div className={`p-3 rounded-md bg-[var(--surface)]`}>

            <span className={'text-[var(--ink-secondary)]'}>
              <strong>Health:</strong> Exercise & wellness habits
            </span>
          </div>
          <div className={`p-3 rounded-md bg-[var(--surface)]`}>

            <span className={'text-[var(--ink-secondary)]'}>
              <strong>Learning:</strong> Reading & learning habits
            </span>
          </div>
        </div>

        {/* Streak multiplier info */}
        <div className={`mt-4 p-4 rounded-md border ${
          'bg-[var(--warning-soft)] border-[var(--warning)] dark:border-orange-500/20'
        }`}>
          <h5 className={`font-medium mb-2 text-[var(--warning)]`}>
            Streak multipliers
          </h5>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={'text-[var(--ink-secondary)]'}>
              <strong>3+ days:</strong> 1.1x
            </span>
            <span className={'text-[var(--ink-secondary)]'}>
              <strong>7+ days:</strong> 1.25x
            </span>
            <span className={'text-[var(--ink-secondary)]'}>
              <strong>14+ days:</strong> 1.5x
            </span>
            <span className={'text-[var(--ink-secondary)]'}>
              <strong>30+ days:</strong> 2x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
