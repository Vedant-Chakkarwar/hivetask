import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
