import { NavLink, useLocation } from 'react-router-dom';
import { hapticLight } from '../../lib/haptics';
import {
  isPrimaryDestinationActive,
  PRIMARY_NAV_ITEMS,
  useInboxCount,
} from './navigation';

export function BottomNav() {
  const { pathname } = useLocation();
  const inboxCount = useInboxCount();

  return (
    <nav
      className="bottom-nav-bar safe-area-pb fixed inset-x-0 bottom-0 z-50 border-t border-[var(--rule-strong)] bg-[var(--surface)] md:hidden"
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {PRIMARY_NAV_ITEMS.map(item => {
          const active = isPrimaryDestinationActive(pathname, item.to);
          const linkClass = `flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 px-1 text-[10px] font-semibold ${
            active
              ? 'border-[var(--action)] bg-[var(--state-selected)] text-[var(--ink)]'
              : 'border-transparent text-[var(--ink-muted)]'
          }`;

          if (item.to !== '/tasks') {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={hapticLight}
                className={linkClass}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          }

          return (
            <span key={item.to} className="relative flex min-w-0 flex-1">
              <NavLink
                to="/tasks"
                onClick={hapticLight}
                className={linkClass}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className="truncate">Tasks</span>
              </NavLink>
              {inboxCount > 0 && (
                <span
                  className="pointer-events-none absolute left-1/2 top-1 flex min-h-4 min-w-4 translate-x-1 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-center text-[9px] font-bold leading-4 tabular-nums text-[var(--ink-inverse)]"
                  aria-hidden="true"
                >
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
