import type { LucideIcon } from 'lucide-react';

/**
 * Tab bar for a destination that hosts several related pages.
 *
 * Used by Plan and Progress, which group what were previously separate
 * top-level destinations. Rendered as a tablist so the grouping is conveyed to
 * assistive tech rather than only visually.
 */
export interface PageTab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface PageTabsProps {
  tabs: PageTab[];
  active: string;
  onChange: (id: string) => void;
  /** Accessible name for the group, e.g. "Plan views". */
  label: string;
}

export function PageTabs({ tabs, active, onChange, label }: PageTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto
        border border-border bg-surface-subtle"
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-11 items-center gap-2 px-3 rounded-lg text-sm font-medium
              whitespace-nowrap transition-colors duration-150 flex-shrink-0 focus-visible:outline-none
              ${
                isActive
                  ? 'bg-surface-raised text-text shadow-soft'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`}
          >
            {Icon && <Icon size={15} className="flex-shrink-0" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
