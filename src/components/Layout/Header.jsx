import { Activity, LogOut, Circle, Menu, Clock } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import MobileNav from './MobileNav';

export default function Header() {
  const campaign = useCampaign();
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const menuRef = useRef(null);

  // Countdown timer for next email
  useEffect(() => {
    if (!campaign.isRunning || !campaign.nextEmailAt) {
      setCountdown(0);
      return;
    }
    
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(campaign.nextEmailAt).getTime();
      const remaining = Math.max(0, Math.ceil((target - now) / 1000));
      setCountdown(remaining);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [campaign.isRunning, campaign.nextEmailAt]);

  const handleLogout = async () => {
    setShowMenu(false);
    await signOut();
  };

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Close mobile nav on escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
        setShowMenu(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';
  const userName = user?.user_metadata?.full_name || 'User';

  return (
    <>
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Logo */}
              <div className="flex items-center gap-2">
                <img 
                  src="/sendium-logo.png" 
                  alt="Sendium" 
                  className="h-30 w-30 rounded-lg"
                />
              </div>
            </div>

            {/* Center Status - Desktop */}
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
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0)}%` }}
                    ></div>
                  </div>
                  {countdown > 0 && (
                    <>
                      <div className="h-4 w-px bg-stone-300"></div>
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium tabular-nums">{countdown}s</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-stone-500 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200">
                  <Circle className="w-2 h-2 fill-stone-400 text-stone-400" />
                  <span className="text-sm">Ready</span>
                </div>
              )}
            </div>

            {/* Mobile Status Indicator */}
            {campaign.isRunning && (
              <div className="md:hidden flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">{campaign.sent}/{campaign.total}</span>
                {countdown > 0 && (
                  <span className="text-xs font-medium text-amber-600 tabular-nums">{countdown}s</span>
                )}
              </div>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User Avatar & Dropdown */}
              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-stone-200 relative" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 hover:bg-stone-50 rounded-lg p-1 transition-colors"
                  aria-expanded={showMenu}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-stone-700 font-medium text-sm shadow-sm">
                    {userInitial.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-24 truncate">
                    {userName}
                  </span>
                </button>
                
                {showMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
