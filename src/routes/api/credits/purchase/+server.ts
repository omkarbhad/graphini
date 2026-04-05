import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

const PLANS: Record<string, { gems: number; price: number }> = {
  starter: { gems: 100, price: 4.99 },
  pro: { gems: 500, price: 19.99 },
  unlimited: { gems: 2000, price: 49.99 }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await validateSession(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { plan_id } = body;

    const plan = PLANS[plan_id];
    if (!plan) return json({ error: 'Invalid plan' }, { status: 400 });

    // TODO: Integrate real payment provider (Stripe, etc.)
    // For now, directly add gems to the user's balance
    const db = getDb();
    await db.addCredits(
      user.id,
      plan.gems,
      'purchase',
      `Purchased ${plan.gems} gems (${plan_id} plan)`
    );

    const balance = await db.getCreditBalance(user.id);

    return json({
      success: true,
      gems_added: plan.gems,
      new_balance: balance?.balance ?? plan.gems
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Purchase failed' }, { status: 500 });
  }
};
