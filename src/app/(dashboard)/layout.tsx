import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AuthHydrator } from '@/components/layout/AuthHydrator';
import { ReconnectBanner } from '@/components/layout/ReconnectBanner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { SessionGuard } from '@/components/auth/SessionGuard';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  let userId: string | null = null;
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) userId = payload.userId;
  }
  if (!userId && refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) userId = payload.userId;
  }
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true, color: true },
  });
  if (!user) redirect('/login');

  return (
    <div className="flex h-dvh overflow-hidden bg-honey-50">
      <AuthHydrator user={user} />
      <SessionGuard>
        <Sidebar userName={user.name} userColor={user.color} userAvatarUrl={user.avatarUrl} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <OfflineBanner />
          <ReconnectBanner />
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <BottomNav />
        </div>
      </SessionGuard>
    </div>
  );
}
