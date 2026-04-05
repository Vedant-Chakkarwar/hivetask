'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { LockScreen } from './LockScreen';

interface SessionGuardProps {
  children: React.ReactNode;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const [isLocked, setIsLocked] = useState(false);

  const handleLock = useCallback(() => {
    // Clear private key from memory on lock (keep encrypted data for re-unlock)
    useCryptoStore.getState().lockKeys();
    setIsLocked(true);
  }, []);

  const handleLogout = useCallback(async () => {
    // Clear all keys and session state
    useCryptoStore.getState().clearKeys();
    useAuthStore.getState().setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    window.location.href = '/login';
  }, []);

  const { resetActivity } = useSessionTimeout({ onLock: handleLock, onLogout: handleLogout });

  function handleUnlock() {
    resetActivity();
    setIsLocked(false);
  }

  return (
    <>
      {children}
      {isLocked && <LockScreen onUnlock={handleUnlock} onLogout={handleLogout} />}
    </>
  );
}
