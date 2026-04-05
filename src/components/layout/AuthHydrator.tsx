'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  color: string;
}

interface AuthHydratorProps {
  user: AuthUser;
}

/**
 * Hydrates the client-side auth store with the server-fetched user.
 * Renders nothing — purely for side-effect.
 */
export function AuthHydrator({ user }: AuthHydratorProps) {
  const setUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    setUser(user);
    return () => setUser(null);
  }, [user, setUser]);
  return null;
}
