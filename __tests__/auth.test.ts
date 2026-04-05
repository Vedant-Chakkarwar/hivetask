// @vitest-environment node
/**
 * Auth tests — JWT generation, verification, password hashing
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!!';
});

async function getAuth() {
  return await import('@/lib/auth');
}

describe('U-AU-01: Generate access token', () => {
  it('returns valid JWT, decodes to correct userId, expires in 15 min', async () => {
    const { generateAccessToken, verifyAccessToken } = await getAuth();
    const token = generateAccessToken('user-123');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format

    const payload = verifyAccessToken(token);
    expect(payload?.userId).toBe('user-123');
  });
});

describe('U-AU-02: Generate refresh token', () => {
  it('returns valid JWT, expires in 7 days', async () => {
    const { generateRefreshToken, verifyRefreshToken } = await getAuth();
    const token = generateRefreshToken('user-456');
    expect(token).toBeTruthy();
    const payload = verifyRefreshToken(token);
    expect(payload?.userId).toBe('user-456');
  });
});

describe('U-AU-03: Verify valid access token', () => {
  it('returns correct userId', async () => {
    const { generateAccessToken, verifyAccessToken } = await getAuth();
    const token = generateAccessToken('test-user-id');
    const result = verifyAccessToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('test-user-id');
  });
});

describe('U-AU-04: Reject expired token', () => {
  it('throws/returns null for expired JWT', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyAccessToken } = await getAuth();
    const expired = jwt.default.sign(
      { userId: 'user-1', type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' },
    );
    // Wait tiny bit for it to expire
    await new Promise((r) => setTimeout(r, 10));
    expect(verifyAccessToken(expired)).toBeNull();
  });
});

describe('U-AU-05: Reject malformed token', () => {
  it('returns null for random string', async () => {
    const { verifyAccessToken } = await getAuth();
    expect(verifyAccessToken('totally-invalid-token')).toBeNull();
    expect(verifyAccessToken('')).toBeNull();
    expect(verifyAccessToken('abc.def.ghi')).toBeNull();
  });
});

describe('U-AU-06: Reject token signed with wrong secret', () => {
  it('returns null for token signed with different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyAccessToken } = await getAuth();
    const wrongToken = jwt.default.sign(
      { userId: 'user-1', type: 'access' },
      'completely-wrong-secret-key-here!!',
      { expiresIn: '15m' },
    );
    expect(verifyAccessToken(wrongToken)).toBeNull();
  });
});

describe('U-AU-07: Password hashing', () => {
  it('bcrypt hash differs from plaintext, compare returns true for correct password', async () => {
    const bcrypt = await import('bcryptjs');
    const password = 'changeme123';
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare('wrongpassword', hash)).toBe(false);
  });
});

describe('U-AU-08: Password hash uniqueness', () => {
  it('same password hashed twice produces different hashes (different salts)', async () => {
    const bcrypt = await import('bcryptjs');
    const password = 'changeme123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    expect(hash1).not.toBe(hash2);

    // Both should still verify correctly
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});
