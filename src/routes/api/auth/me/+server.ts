import { extractToken, validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  try {
    const token = extractToken(request);
    if (!token) {
      return json({ user: null, credits: null });
    }

    const result = await validateSession(token);
    if (!result) {
      return json({ user: null, credits: null });
    }

    // Get credit balance
    const db = getDb();
    const credits = await db.getCreditBalance(result.user.id);

    return json({
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        avatar_url: result.user.avatar_url,
        role: result.user.role,
        created_at: result.user.created_at
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
    return json({ user: null, credits: null });
  }
};
