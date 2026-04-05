import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/auth';

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

// Simple in-memory rate limiting (IP → { count, resetAt })
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 5) return false;

  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials format' }, { status: 400 });
  }

  const { identifier, password } = parsed.data;

  // Look up by email or username (name field)
  const isEmail = identifier.includes('@');
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findFirst({ where: { name: { equals: identifier, mode: 'insensitive' } } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid username/email or password' }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: 'Invalid username/email or password' }, { status: 401 });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: user.color,
      // E2E crypto fields — returned to client for private key decryption
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      keySalt: user.keySalt,
      keyIv: user.keyIv,
    },
  });
}
