'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCryptoStore } from '@/stores/cryptoStore';
import { deriveWrappingKey, decryptPrivateKey } from '@/lib/crypto';
import { Avatar } from '@/components/ui/Avatar';

const AUTO_LOGOUT_SECONDS = 5 * 60; // 5 minutes on lock screen → force logout

interface LockScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
}

export function LockScreen({ onUnlock, onLogout }: LockScreenProps) {
  const user = useAuthStore((s) => s.user);
  const { encryptedPrivateKey, keySalt, keyIv, restorePrivateKey } = useCryptoStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(AUTO_LOGOUT_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown to auto-logout
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [onLogout]);

  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      if (encryptedPrivateKey && keySalt && keyIv) {
        // Re-derive wrapping key and decrypt private key
        const salt = Uint8Array.from(atob(keySalt), (c) => c.charCodeAt(0));
        const wrappingKey = await deriveWrappingKey(password, salt);
        const privateKey = await decryptPrivateKey(encryptedPrivateKey, keyIv, wrappingKey);
        restorePrivateKey(privateKey);
        if (countdownRef.current) clearInterval(countdownRef.current);
        onUnlock();
      } else {
        // No crypto data — verify password via server
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          onUnlock();
        } else {
          setError('Unable to verify password. Please try again.');
        }
      }
    } catch {
      setError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(31, 41, 55, 0.7)' }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-card shadow-2xl p-8"
        style={{ borderRadius: '12px' }}
      >
        {/* Logo + status */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-5xl mb-2 select-none">🐝</div>
          <h1 className="text-xl font-bold text-gray-800">HiveTask</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Session Locked</p>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-button" style={{ borderRadius: '8px' }}>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} color={user.color} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Unlock form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to unlock"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-2.5 pr-11 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              style={{ borderRadius: '8px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-button" style={{ borderRadius: '8px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-button disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Unlocking…</> : 'Unlock'}
          </button>
        </form>

        {/* Logout + countdown */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
          <p className="text-xs text-amber-600 font-medium">
            Auto-logout in {formatCountdown(countdown)}
          </p>
        </div>
      </div>
    </div>
  );
}
