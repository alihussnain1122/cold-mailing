import { NavLink } from 'react-router-dom';
import { X, Settings, FileText, Users, Send, LayoutDashboard, BarChart3, HelpCircle } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/send', label: 'Send Emails', icon: Send },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/help', label: 'Help & Docs', icon: HelpCircle },
];

export default function MobileNav({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl z-50 lg:hidden transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <img 
              src="/sendium-logo.png" 
              alt="Sendium" 
              className="h-8 w-8 rounded-lg"
            />
            <span className="font-semibold text-stone-900">Sendium</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4" role="navigation" aria-label="Mobile navigation">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-stone-500 group-hover:text-stone-700'}`} aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
        
        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-100">
          <div className="text-center">
            <span className="text-xs text-stone-400">Sendium v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
