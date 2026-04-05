'use client';

import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT = 15 * 60 * 1000;       // 15 minutes
const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const BACKGROUND_TIMEOUT = 5 * 60 * 1000;  // 5 minutes in background
const THROTTLE_MS = 30_000;                 // update lastActivity at most every 30 seconds

interface SessionTimeoutOptions {
  onLock: () => void;
  onLogout: () => void;
}

export function useSessionTimeout({ onLock, onLogout }: SessionTimeoutOptions) {
  const lastActivityRef = useRef(Date.now());
  const loginTimestampRef = useRef(Date.now());
  const backgroundStartRef = useRef<number | null>(null);
  const lastThrottleRef = useRef(Date.now());
  const lockedRef = useRef(false);

  useEffect(() => {
    function updateActivity() {
      const now = Date.now();
      if (now - lastThrottleRef.current > THROTTLE_MS) {
        lastActivityRef.current = now;
        lastThrottleRef.current = now;
      }
    }

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;
    activityEvents.forEach((e) => document.addEventListener(e, updateActivity, { passive: true }));

    // Idle + absolute check every 60 seconds
    const idleTimer = setInterval(() => {
      if (lockedRef.current) return;
      const now = Date.now();

      if (now - loginTimestampRef.current > ABSOLUTE_TIMEOUT) {
        onLogout();
        return;
      }

      if (now - lastActivityRef.current > IDLE_TIMEOUT) {
        lockedRef.current = true;
        onLock();
      }
    }, 60_000);

    // Background/visibility check
    function handleVisibilityChange() {
      if (document.hidden) {
        backgroundStartRef.current = Date.now();
      } else {
        if (backgroundStartRef.current !== null) {
          const elapsed = Date.now() - backgroundStartRef.current;
          backgroundStartRef.current = null;
          if (!lockedRef.current && elapsed > BACKGROUND_TIMEOUT) {
            lockedRef.current = true;
            onLock();
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((e) => document.removeEventListener(e, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(idleTimer);
    };
  }, [onLock, onLogout]);

  // Called by the lock screen when the session is successfully resumed
  function resetActivity() {
    lockedRef.current = false;
    lastActivityRef.current = Date.now();
  }

  return { resetActivity };
}
