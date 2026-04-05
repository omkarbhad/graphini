/**
 * Auth utilities - magnova-auth cookie-based authentication
 *
 * magnova-auth sets a `magnova_session` httpOnly cookie containing a signed token.
 * This module reads that cookie, verifies the HMAC signature, upserts the local user,
 * and applies admin overrides.
 */

import { env } from '$env/dynamic/private';
import { getCache, userCacheKeys } from '$lib/server/cache';
import type { User } from '$lib/server/db';
import { getDb } from '$lib/server/db';

const ADMIN_EMAIL_OVERRIDES = (env.ADMIN_EMAIL_OVERRIDES || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Get the cookie signing secret. Falls back to a dev-only default.
 * In production, COOKIE_SECRET must be set to a strong random value.
 */
function getCookieSecret(): string {
  const secret = env.COOKIE_SECRET;
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        '[auth] COOKIE_SECRET must be set in production. Refusing to start with an insecure default.'
      );
    }
    console.warn(
      '[auth] COOKIE_SECRET not set — using insecure dev default. Set it in production!'
    );
    return 'graphini-dev-secret-do-not-use-in-production';
  }
  return secret;
}

/**
 * Sign a value with HMAC-SHA256 using the cookie secret.
 */
export async function signValue(value: string): Promise<string> {
  const secret = getCookieSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${value}.${sigHex}`;
}

/**
 * Verify and extract a signed value. Returns null if signature is invalid.
 */
export async function verifySignedValue(signedValue: string): Promise<string | null> {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signedValue.substring(0, lastDot);
  const providedSig = signedValue.substring(lastDot + 1);

  const secret = getCookieSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Convert hex signature back to bytes
  const sigBytes = new Uint8Array(
    providedSig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(value));
  return valid ? value : null;
}

const applyAdminOverrides = (user: User): User => {
  if (ADMIN_EMAIL_OVERRIDES.length === 0) return user;
  if (ADMIN_EMAIL_OVERRIDES.includes(user.email.toLowerCase()) && user.role === 'user') {
    return { ...user, role: 'admin' };
  }
  return user;
};

/**
 * Extract the raw magnova_session cookie value.
 */
function extractCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  return cookies['magnova_session'] || null;
}

/**
 * Extract the Firebase UID from the magnova_session cookie.
 * Verifies the HMAC signature before returning the UID.
 * Falls back to accepting unsigned cookies for backward compatibility
 * (logs a warning so operators know to re-sign).
 */
async function extractFirebaseUid(request: Request): Promise<string | null> {
  const raw = extractCookieValue(request);
  if (!raw) return null;

  // Try signed format first: "uid.signature"
  const verified = await verifySignedValue(raw);
  if (verified) return verified;

  // Backward compatibility: only accept unsigned cookies when explicitly opted in via env var.
  // This path MUST NOT be enabled in production — it allows an attacker to forge a session
  // by setting the cookie to any short Firebase UID string, bypassing HMAC verification.
  if (env.ALLOW_UNSIGNED_COOKIES === 'true') {
    if (!raw.includes('.') || raw.length < 64) {
      console.warn(
        '[auth] WARNING: Unsigned magnova_session cookie accepted because ALLOW_UNSIGNED_COOKIES=true. ' +
          'This is insecure and must NOT be used in production. Remove this env var once all sessions are re-signed.'
      );
      return raw;
    }
  }

  // Has a dot but signature is invalid, or unsigned cookies are not allowed — reject
  return null;
}

/**
 * Validate the current session by reading the magnova_session cookie.
 * Looks up the user by Firebase UID (does NOT upsert with empty email),
 * applies admin overrides, and caches the result for 5 minutes.
 */
export async function validateSession(request: Request): Promise<User | null> {
  const firebaseUid = await extractFirebaseUid(request);
  if (!firebaseUid) return null;

  const cache = getCache();

  // Check cache first
  const cached = await cache.get<User>(userCacheKeys.session(firebaseUid));
  if (cached) return cached;

  const db = getDb();

  // Look up user by Firebase UID — do NOT upsert with empty email
  // The user record should already exist from the login/dev-login flow
  const user = await db.getUserByFirebaseUid(firebaseUid);

  if (!user || !user.is_active) return null;

  const result = applyAdminOverrides(user);

  // Cache for 5 minutes
  await cache.set(userCacheKeys.session(firebaseUid), result, { ttlSeconds: 300 });

  return result;
}

/**
 * Get the magnova-auth login URL for graphini-branded login page.
 * magnova-auth reads `?redirect=` to know where to send user after auth.
 */
export function getAuthUrl(returnTo?: string): string {
  const baseUrl = env.MAGNOVA_AUTH_URL || 'https://auth.magnova.ai';
  const loginUrl = `${baseUrl}/graphini`;
  if (returnTo) {
    return `${loginUrl}?redirect=${encodeURIComponent(returnTo)}`;
  }
  return loginUrl;
}

/**
 * Get the magnova-auth signout URL.
 */
export function getSignoutUrl(redirectTo?: string): string {
  const baseUrl = env.MAGNOVA_AUTH_URL || 'https://auth.magnova.ai';
  const redirect = redirectTo || '/';
  return `${baseUrl}/api/auth/signout?redirect=${encodeURIComponent(redirect)}`;
}
