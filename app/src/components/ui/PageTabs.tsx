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
        bg-slate-100/80 dark:bg-white/5"
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
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              whitespace-nowrap transition-colors flex-shrink-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
              ${
                isActive
                  ? 'bg-white text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
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
