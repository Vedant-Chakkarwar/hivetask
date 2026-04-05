import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { newAccessToken } = auth;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      color: true,
      publicKey: true,
    },
    orderBy: { name: 'asc' },
  });

  return applyNewToken(NextResponse.json(users), newAccessToken);
}
