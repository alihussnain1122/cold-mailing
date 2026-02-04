import { Activity, Bell, LogOut, Circle } from 'lucide-react';
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
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-400 mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/sendium-logo.png" 
              alt="Sendium" 
              className="h-30"
            />
          </div>

          {/* Center Status */}
          <div className="hidden md:flex items-center">
            {campaign.isRunning ? (
              <div className="flex items-center gap-4 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                  <Activity className="w-4 h-4 text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">Sending</span>
                </div>
                <div className="h-4 w-px bg-stone-300"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-900">{campaign.sent}</span>
                  <span className="text-stone-400">/</span>
                  <span className="text-sm text-stone-500">{campaign.total}</span>
                </div>
                <div className="w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-stone-700 rounded-full transition-all duration-300"
                    style={{ width: `${(campaign.sent / campaign.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-stone-500 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200">
                <Circle className="w-2 h-2 fill-stone-400 text-stone-400" />
                <span className="text-sm">Ready</span>
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {campaign.failed > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-3 border-l border-stone-200 relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 hover:bg-stone-50 rounded-lg p-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 font-medium text-sm">
                  {userInitial.toUpperCase()}
                </div>
              </button>
              
              {showMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
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
