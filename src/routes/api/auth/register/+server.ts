import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLocalSession, localSessionCookie } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { authLimiter, getClientKey, rateLimitResponse } from '$lib/server/rate-limit';

/**
 * POST /api/auth/register — local/dev registration with email + password
 */
export const POST: RequestHandler = async ({ request }) => {
  const rl = authLimiter.check(getClientKey(request));
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs ?? 0);

  try {
    const { email, password, displayName } = await request.json();
    if (!email || !password) {
      return json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();

    // Check if user already exists
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Hash password
    const { scrypt, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = await new Promise<string>((resolve, reject) => {
      scrypt(password, salt, 64, (err, derived) => {
        if (err) return reject(err);
        resolve(`${derived.toString('hex')}:${salt}`);
      });
    });

    // Create user
    const user = await db.createUser({
      email,
      password_hash: hash,
      display_name: displayName || email.split('@')[0]
    });

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
        status: 201,
        headers: {
          'Set-Cookie': localSessionCookie(signed)
        }
      }
    );
  } catch {
    return json({ error: 'Registration failed' }, { status: 500 });
  }
};
