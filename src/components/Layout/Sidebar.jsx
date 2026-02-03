import { NavLink } from 'react-router-dom';
import { Settings, FileText, Users, Send, LayoutDashboard, HelpCircle, ExternalLink } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & stats' },
  { path: '/templates', label: 'Templates', icon: FileText, description: 'Email templates' },
  { path: '/contacts', label: 'Contacts', icon: Users, description: 'Manage recipients' },
  { path: '/send', label: 'Send Emails', icon: Send, description: 'Start campaign' },
  { path: '/settings', label: 'Settings', icon: Settings, description: 'SMTP config' },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] flex flex-col">
      <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="Main navigation">
        <div className="px-3 py-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</span>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                  }`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`block font-medium ${isActive ? 'text-blue-700' : ''}`}>
                      {item.label}
                    </span>
                    <span className={`block text-xs truncate ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                      {item.description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full -mr-1"></div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        {/* Help Card */}
        <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <HelpCircle className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Need Help?</h4>
              <p className="text-xs text-gray-500 mt-0.5">Check our setup guide</p>
            </div>
          </div>
          <button className="mt-3 w-full text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-white transition-colors">
            View Documentation
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        
        {/* Version */}
        <div className="text-center">
          <span className="text-xs text-gray-400">MailFlow v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
