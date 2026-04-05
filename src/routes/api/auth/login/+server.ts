import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  createLocalSession,
  getAuthUrl,
  localSessionCookie,
  validateSession
} from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { authLimiter, getClientKey, rateLimitResponse } from '$lib/server/rate-limit';

/**
 * GET /api/auth/login — redirect to magnova-auth for OAuth login.
 * If DEV_BYPASS_AUTH is active and user is already authenticated,
 * redirect back to the app instead of magnova-auth.
 */
export const GET: RequestHandler = async ({ request, url }) => {
  const returnTo = url.searchParams.get('returnTo') || '/';

  // If dev bypass is active, user is already "logged in" — just go back
  const user = await validateSession(request);
  if (user) {
    throw redirect(302, returnTo);
  }

  throw redirect(302, getAuthUrl(returnTo, url));
};

/**
 * POST /api/auth/login — local/dev login with email + password
 * Creates a graphini_session cookie signed with COOKIE_SECRET.
 */
export const POST: RequestHandler = async ({ request }) => {
  const rl = authLimiter.check(getClientKey(request));
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs ?? 0);

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();
    const user = await db.getUserByEmail(email);
    if (!user) {
      return json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    if (!user.password_hash) {
      return json(
        { error: 'This account uses OAuth login. Use Sign in with Google.' },
        { status: 401 }
      );
    }

    const { scrypt, timingSafeEqual } = await import('node:crypto');
    const valid = await new Promise<boolean>((resolve) => {
      const [hash, salt] = (user.password_hash ?? '').split(':');
      scrypt(password, salt, 64, (err, derived) => {
        if (err) return resolve(false);
        resolve(timingSafeEqual(Buffer.from(hash, 'hex'), derived));
      });
    });

    if (!valid) {
      return json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create signed session
    const signed = await createLocalSession(email);

    return json(
      {
        user: {
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          display_name: user.display_name,
          email: user.email,
          id: user.id,
          role: user.role
        }
      },
      {
        headers: {
          'Set-Cookie': localSessionCookie(signed)
        }
      }
    );
  } catch {
    return json({ error: 'Login failed' }, { status: 500 });
  }
};
