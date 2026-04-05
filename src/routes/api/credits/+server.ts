import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = await validateSession(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const balance = await db.getCreditBalance(user.id);
    const transactions = await db.getCreditTransactions(user.id, { limit: 20 });
    const pricing = await db.listModelPricing();

    return json({
      balance: balance
        ? {
            balance: balance.balance,
            lifetime_earned: balance.lifetime_earned,
            lifetime_spent: balance.lifetime_spent
          }
        : { balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
      transactions,
      pricing: pricing.map((p) => ({
        model_id: p.model_id,
        model_name: p.model_name,
        provider: p.provider,
        credits_per_request: p.credits_per_request,
        is_free: p.is_free
      }))
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to fetch credits' }, { status: 500 });
  }
};
