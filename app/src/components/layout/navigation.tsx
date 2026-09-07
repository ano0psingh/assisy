import type { LucideIcon } from 'lucide-react';
import { BarChart3, CalendarDays, CheckSquare, Home, Target } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

export interface PrimaryNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { icon: Home, label: 'Today', to: '/' },
  { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
  { icon: CalendarDays, label: 'Calendar', to: '/calendar' },
  { icon: Target, label: 'Plan', to: '/plan' },
  { icon: BarChart3, label: 'Progress', to: '/progress' },
];

export function isPrimaryDestinationActive(pathname: string, destination: string): boolean {
  if (destination === '/') return pathname === '/';
  return pathname === destination || pathname.startsWith(`${destination}/`);
}

export function useInboxCount(): number {
  const { tasks } = useTaskContext();
  return tasks.filter(task => task.inbox === true && task.status !== 'Completed').length;
}
