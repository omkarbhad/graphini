/**
 * Simple rate limiting utility for API endpoints
 */

interface RateLimitOptions {
  interval: number; // in milliseconds
  limit: number;
  blockDuration?: number; // in milliseconds
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}

const store = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();

export function rateLimit(options: RateLimitOptions) {
  const { interval, limit, blockDuration = interval } = options;

  return function (identifier: string): RateLimitResult {
    const now = Date.now();
    const key = identifier;

    // Get or create rate limit entry
    let entry = store.get(key);
    if (!entry) {
      entry = { count: 0, resetTime: now + interval };
      store.set(key, entry);
    }

    // Check if blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        blocked: true
      };
    }

    // Reset if interval passed
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + interval;
      entry.blockedUntil = undefined;
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > limit) {
      entry.blockedUntil = now + blockDuration;
      return {
        success: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        blocked: true
      };
    }

    return {
      success: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
      blocked: false
    };
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetTime && (!entry.blockedUntil || now >= entry.blockedUntil)) {
      store.delete(key);
    }
  }
}, 60000); // Cleanup every minute
