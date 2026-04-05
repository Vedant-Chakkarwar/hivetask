'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCryptoStore } from '@/stores/cryptoStore';
import { deriveWrappingKey, decryptPrivateKey } from '@/lib/crypto';

export default function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const setKeys = useCryptoStore((s) => s.setKeys);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync autofilled password into React state when eye is toggled,
  // so the value remains visible when switching to text type.
  function handleTogglePassword() {
    const input = document.getElementById('password') as HTMLInputElement | null;
    if (input && !password && input.value) {
      setPassword(input.value);
    }
    setShowPassword((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Read from DOM so autofill values are captured even if onChange was skipped
    const identifierInput = document.getElementById('identifier') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const identifierVal = identifierInput?.value.trim() ?? identifier.trim();
    const passwordVal = passwordInput?.value ?? password;

    if (!identifierVal || !passwordVal) {
      setError('Please enter your email/username and password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifierVal, password: passwordVal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setUser(data.user);

      // Decrypt and store private key in memory (never persisted)
      const { publicKey, encryptedPrivateKey, keySalt, keyIv } = data.user;
      if (publicKey && encryptedPrivateKey && keySalt && keyIv) {
        try {
          const salt = Uint8Array.from(atob(keySalt), (c) => c.charCodeAt(0));
          const wrappingKey = await deriveWrappingKey(passwordVal, salt);
          const privateKey = await decryptPrivateKey(encryptedPrivateKey, keyIv, wrappingKey);
          setKeys({ privateKey, publicKeyJwk: publicKey, encryptedPrivateKey, keySalt, keyIv });
        } catch {
          console.warn('Failed to initialise E2E crypto keys');
        }
      }

      // Hard navigation avoids Next.js router cache issues with the custom server
      window.location.href = '/lists';
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-honey-50 px-4">
      <div
        className="w-full max-w-md bg-white rounded-card shadow-card p-8"
        style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-5xl mb-3 select-none">🐝</div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">HiveTask</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email or Username */}
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email or Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-button border border-gray-200 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent transition-all"
              style={{ borderRadius: '8px' }}
              placeholder="you@example.com or username"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 rounded-button border border-gray-200 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent transition-all"
                style={{ borderRadius: '8px' }}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-chip bg-red-50 border border-red-200 text-red-600 text-sm" style={{ borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-button font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderRadius: '8px',
              backgroundColor: '#F59E0B',
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D97706';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F59E0B';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Collaborate. Organize. Get things done.
        </p>
      </div>
    </main>
  );
}
