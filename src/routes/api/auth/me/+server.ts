import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
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
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at
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
