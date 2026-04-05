'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Wifi, WifiOff } from 'lucide-react';

type BannerState = 'hidden' | 'reconnecting' | 'back-online';

export function ReconnectBanner() {
  const [state, setState] = useState<BannerState>('hidden');

  useEffect(() => {
    const socket = getSocket();
    let backOnlineTimer: ReturnType<typeof setTimeout>;

    const onDisconnect = () => {
      clearTimeout(backOnlineTimer);
      setState('reconnecting');
    };

    const onConnect = () => {
      if (state === 'reconnecting') {
        setState('back-online');
        backOnlineTimer = setTimeout(() => setState('hidden'), 3000);
      }
    };

    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      clearTimeout(backOnlineTimer);
    };
  }, [state]);

  if (state === 'hidden') return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white transition-all"
      style={{
        backgroundColor: state === 'reconnecting' ? '#F59E0B' : '#10B981',
      }}
    >
      {state === 'reconnecting' ? (
        <>
          <WifiOff size={13} />
          Reconnecting…
        </>
      ) : (
        <>
          <Wifi size={13} />
          Back online
        </>
      )}
    </div>
  );
}
