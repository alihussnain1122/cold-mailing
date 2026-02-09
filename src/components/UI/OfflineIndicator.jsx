import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      // Hide the "reconnected" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">Connection restored</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg">
        <WifiOff className="w-5 h-5 animate-pulse" />
        <div>
          <p className="text-sm font-medium">No internet connection</p>
          <p className="text-xs opacity-90">Please check your network and try again</p>
        </div>
      </div>
    </div>
  );
}
