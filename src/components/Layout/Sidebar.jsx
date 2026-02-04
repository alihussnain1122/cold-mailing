import { NavLink } from 'react-router-dom';
import { Settings, FileText, Users, Send, LayoutDashboard, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/send', label: 'Send Emails', icon: Send },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-stone-200 min-h-[calc(100vh-64px)] flex flex-col">
      <nav className="flex-1 p-4" role="navigation" aria-label="Main navigation">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-stone-500 group-hover:text-stone-700'}`} aria-hidden="true" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
      
      {/* Bottom Section */}
      <div className="p-4 border-t border-stone-100">
        <div className="text-center">
          <span className="text-xs text-stone-400">Sendium v1.0</span>
        </div>
      </div>
    </aside>
  );
}
