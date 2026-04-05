'use client';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: { px: 20, text: '10px' },
  sm: { px: 24, text: '11px' },
  md: { px: 32, text: '13px' },
  lg: { px: 40, text: '15px' },
};

export function Avatar({ name, avatarUrl, color = '#F59E0B', size = 'md', className = '' }: AvatarProps) {
  const { px, text } = sizeMap[size];
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white select-none ${className}`}
      style={{ width: px, height: px, backgroundColor: color, fontSize: text }}
      title={name}
    >
      {initials}
    </div>
  );
}
