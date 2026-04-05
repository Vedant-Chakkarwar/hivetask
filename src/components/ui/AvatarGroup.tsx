'use client';

import { Avatar } from './Avatar';

interface AvatarGroupUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color?: string;
}

interface AvatarGroupProps {
  users: AvatarGroupUser[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const sizeMap = { xs: 20, sm: 24, md: 32 };
  const px = sizeMap[size];
  const overlap = Math.floor(px * 0.3);

  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {visible.map((user, i) => (
        <div
          key={user.id}
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}
          className="ring-2 ring-white rounded-full"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} color={user.color} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-semibold ring-2 ring-white flex-shrink-0"
          style={{
            width: px,
            height: px,
            marginLeft: -overlap,
            fontSize: px * 0.35,
            zIndex: visible.length,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
