/**
 * Auth utilities - password hashing, session management, token generation
 */

import { env } from '$env/dynamic/private';
import { getCache, userCacheKeys } from '$lib/server/cache';
import type { Session, User } from '$lib/server/db';
import { getDb } from '$lib/server/db';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ADMIN_EMAIL_OVERRIDES = (env.ADMIN_EMAIL_OVERRIDES || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const applyAdminOverrides = (user: User): User => {
  if (ADMIN_EMAIL_OVERRIDES.length === 0) return user;
  if (ADMIN_EMAIL_OVERRIDES.includes(user.email.toLowerCase()) && user.role === 'user') {
    return { ...user, role: 'admin' };
  }
  return user;
};

// ============================================================================
// Password Hashing (scrypt - built-in, no deps)
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      resolve(timingSafeEqual(keyBuffer, derivedKey));
    });
  });
}

// ============================================================================
// Token Generation
// ============================================================================

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// Auth Operations
// ============================================================================

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: User; session: Session; token: string }> {
  const db = getDb();

  // Check if user exists
  const existing = await db.getUserByEmail(email.toLowerCase().trim());
  if (existing) {
    throw new Error('Email already registered');
  }

  // Validate
  if (!email || !email.includes('@')) throw new Error('Invalid email');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password))
    throw new Error('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password))
    throw new Error('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain at least one number');

  const passwordHash = await hashPassword(password);
  const user = await db.createUser({
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    display_name: displayName || email.split('@')[0]
  });

  // Create session
  const token = generateSessionToken();
  const session = await db.createSession({
    user_id: user.id,
    token,
    expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  });

  return { user: applyAdminOverrides(user), session, token };
}

export async function login(
  email: string,
  password: string,
  meta?: { ip_address?: string; user_agent?: string }
): Promise<{ user: User; session: Session; token: string }> {
  const db = getDb();

  const user = await db.getUserByEmail(email.toLowerCase().trim());
  if (!user) throw new Error('Invalid email or password');
  if (!user.is_active) throw new Error('Account is disabled');

  // Verify password - user has password_hash but it's not in the User type since it's excluded from selects
  // We need to fetch it separately or include it
  const valid = await verifyPassword(password, (user as any).password_hash);
  if (!valid) throw new Error('Invalid email or password');

  // Update last login
  await db.updateUser(user.id, { last_login_at: new Date().toISOString() });

  // Create session
  const token = generateSessionToken();
  const session = await db.createSession({
    user_id: user.id,
    token,
    expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    ip_address: meta?.ip_address,
    user_agent: meta?.user_agent
  });

  return { user, session, token };
}

export async function logout(token: string): Promise<void> {
  const db = getDb();
  const session = await db.getSessionByToken(token);
  if (session) {
    await db.deleteSession(session.id);
    // Invalidate cache
    const cache = getCache();
    await cache.delete(userCacheKeys.session(token));
  }
}

export async function validateSession(
  token: string
): Promise<{ user: User; session: Session } | null> {
  if (!token) return null;

  const cache = getCache();

  // Check cache first
  const cached = await cache.get<{ user: User; session: Session }>(userCacheKeys.session(token));
  if (cached) return cached;

  const db = getDb();
  const session = await db.getSessionByToken(token);
  if (!session) return null;

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    await db.deleteSession(session.id);
    return null;
  }

  const user = await db.getUserById(session.user_id);
  if (!user || !user.is_active) return null;

  const result = { user: applyAdminOverrides(user), session };

  // Cache for 5 minutes
  await cache.set(userCacheKeys.session(token), result, { ttlSeconds: 300 });

  return result;
}

/**
 * Extract session token from request cookies or Authorization header
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      })
    );
    if (cookies['session_token']) return cookies['session_token'];
  }

  return null;
}

/**
 * Create session cookie string
 */
export function createSessionCookie(token: string, maxAgeDays = 7): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? ' Secure;' : '';
  return `session_token=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAgeDays * 86400}`;
}

/**
 * Create expired session cookie (for logout)
 */
export function clearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? ' Secure;' : '';
  return `session_token=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}
