'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-success animate-in slide-in-from-top duration-300">
        <Wifi size={14} />
        Back online! Changes are syncing...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-honey-600 animate-in slide-in-from-top duration-300">
      <WifiOff size={14} />
      You&rsquo;re offline. Changes will sync when you&rsquo;re back online.
    </div>
  );
}
