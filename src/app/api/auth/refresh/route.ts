import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newAccessToken = generateAccessToken(payload.userId);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('access_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https'),
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60,
  });

  return response;
}
