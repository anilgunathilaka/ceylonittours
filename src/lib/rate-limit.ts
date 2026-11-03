/**
 * Small in-memory fixed-window rate limiter. Good enough for a single Node.js instance
 * (the Hostinger app); counters reset when the server restarts.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the action is allowed, false once `limit` is reached within `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  // Opportunistic cleanup so the map can't grow without bound
  if (windows.size > 10_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Test helper */
export function resetRateLimits() {
  windows.clear();
}
