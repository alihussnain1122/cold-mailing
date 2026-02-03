import { Mail, Activity, Zap, Bell, LogOut } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function Header() {
  const campaign = useCampaign();
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-400 mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-linear-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                MailFlow
                <span className="text-xs font-medium bg-linear-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Pro
                </span>
              </h1>
              <p className="text-xs text-gray-500">Email Campaign Manager</p>
            </div>
          </div>

          {/* Center Status */}
          <div className="hidden md:flex items-center gap-6">
            {campaign.isRunning ? (
              <div className="flex items-center gap-4 bg-linear-to-r from-green-50 to-emerald-50 px-5 py-2.5 rounded-full border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Campaign Running</span>
                </div>
                <div className="h-4 w-px bg-green-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-800">{campaign.sent}</span>
                  <span className="text-green-600">/</span>
                  <span className="text-sm text-green-600">{campaign.total}</span>
                </div>
                <div className="w-20 h-2 bg-green-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(campaign.sent / campaign.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Ready to send</span>
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {campaign.failed > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                  {userInitial.toUpperCase()}
                </div>
              </button>
              
              {showMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
