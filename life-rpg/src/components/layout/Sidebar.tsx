import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CheckSquare, Target, Calendar, Trophy, BarChart3 } from 'lucide-react';

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  to: string;
}

function SidebarItem({ icon, label, to }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-purple-600 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const menuItems = [
    { icon: <Home size={18} />, label: 'Dashboard', to: '/' },
    { icon: <CheckSquare size={18} />, label: 'Tasks', to: '/tasks' },
    { icon: <Target size={18} />, label: 'Goals', to: '/goals' },
    { icon: <Calendar size={18} />, label: 'Habits', to: '/habits' },
    { icon: <Trophy size={18} />, label: 'Achievements', to: '/achievements' },
    { icon: <BarChart3 size={18} />, label: 'Stats', to: '/stats' },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700 p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            to={item.to}
          />
        ))}
      </nav>
    </aside>
  );
}