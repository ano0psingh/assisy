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
      className="ui-page-tabs flex items-center gap-1 px-1 overflow-x-auto"
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
            className="ui-control ui-page-tab inline-flex items-center gap-2 px-3 py-2
              whitespace-nowrap flex-shrink-0"
          >
            {Icon && <Icon size={15} className="flex-shrink-0" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
