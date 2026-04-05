import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { authLimiter, getClientKey, rateLimitResponse } from '$lib/server/rate-limit';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  const rl = authLimiter.check(getClientKey(request));
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs ?? 0);

  try {
    const user = await validateSession(request);
    if (!user) {
      return json({ user: null, credits: null }, { status: 401 });
    }

    // Get credit balance
    const db = getDb();
    const credits = await db.getCreditBalance(user.id);

    return json({
      user: {
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        display_name: user.display_name,
        email: user.email,
        id: user.id,
        role: user.role
      },
      credits: credits
        ? {
            balance: credits.balance,
            lifetime_earned: credits.lifetime_earned,
            lifetime_spent: credits.lifetime_spent
          }
        : null
    });
  } catch {
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
