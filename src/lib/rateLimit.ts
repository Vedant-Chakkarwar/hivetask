// Simple in-memory rate limiter
// For production, replace with Redis or upstash/ratelimit

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

export interface RateLimitOptions {
  windowMs: number; // time window in ms
  max: number;      // max requests per window
  name?: string;    // store name (allows separate limits per route)
}

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * key: unique identifier (IP address, userId, etc.)
 */
export function checkRateLimit(key: string, options: RateLimitOptions): boolean {
  const { windowMs, max, name = 'default' } = options;
  const store = getStore(name);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}

// Convenience wrapper for Next.js API route handlers
export function getClientIp(req: Request): string {
  const headers = req instanceof Request
    ? { get: (h: string) => req.headers.get(h) }
    : (req as { headers: { get: (h: string) => string | null } }).headers;

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
