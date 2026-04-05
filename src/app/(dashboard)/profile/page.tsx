'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import { LogOut, Mail, User as UserIcon, Shield } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Avatar & name card */}
      <div className="bg-white rounded-card border border-gray-100 p-6 mb-4 flex flex-col items-center text-center" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Avatar
          name={user.name}
          color={user.color}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <h2 className="text-lg font-bold text-gray-900 mt-3">{user.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
        <div
          className="mt-3 px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: user.color }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-white rounded-card border border-gray-100 divide-y divide-gray-50 mb-4" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3 p-4">
          <UserIcon size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Display Name</p>
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Mail size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-800">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Shield size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Security</p>
            <p className="text-sm font-medium text-gray-800">End-to-end encryption enabled</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-white border border-danger/30 text-danger rounded-card p-3.5 font-medium text-sm hover:bg-danger/5 transition-colors"
        style={{ borderRadius: '12px' }}
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">HiveTask MVP · All phases complete</p>
    </div>
  );
}
