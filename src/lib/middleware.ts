import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from './auth';
import { cookies } from 'next/headers';

export type AuthenticatedRequest = NextRequest & { userId: string };

type RouteHandler = (req: NextRequest, context: { userId: string }) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, _routeContext?: unknown): Promise<NextResponse> => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    let userId: string | null = null;
    let newAccessToken: string | null = null;

    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Access token expired — try to refresh
    if (!userId && refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        userId = payload.userId;
        newAccessToken = generateAccessToken(userId);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await handler(req, { userId });

    // Rotate access token if we refreshed
    if (newAccessToken) {
      response.cookies.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https'),
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60,
      });
    }

    return response;
  };
}

// Helper for dynamic routes that need to handle params alongside auth
export async function getAuthUser(): Promise<{ userId: string; newAccessToken?: string } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  let userId: string | null = null;
  let newAccessToken: string | undefined;

  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) userId = payload.userId;
  }

  if (!userId && refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) {
      userId = payload.userId;
      newAccessToken = generateAccessToken(userId);
    }
  }

  if (!userId) return null;
  return { userId, newAccessToken };
}

export function applyNewToken(response: NextResponse, newAccessToken?: string): NextResponse {
  if (newAccessToken) {
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https'),
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });
  }
  return response;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
