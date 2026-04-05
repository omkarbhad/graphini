/**
 * Domain helper — Credits & Billing
 */

import { asc, desc, eq, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  CreditBalance,
  CreditTransaction,
  DeductCreditsResult,
  ModelPricing,
  PaginationOptions
} from '../types';
import * as schema from '../schema';

// ── Row Mappers ────────────────────────────────────────────────────────────

export function mapCreditBalance(row: typeof schema.creditBalances.$inferSelect): CreditBalance {
  return {
    balance: row.balance,
    id: row.id,
    lifetime_earned: row.lifetime_earned,
    lifetime_spent: row.lifetime_spent,
    updated_at: row.updated_at.toISOString(),
    user_id: row.user_id
  };
}

export function mapCreditTransaction(
  row: typeof schema.creditTransactions.$inferSelect
): CreditTransaction {
  return {
    amount: row.amount,
    balance_after: row.balance_after,
    conversation_id: row.conversation_id,
    created_at: row.created_at.toISOString(),
    description: row.description,
    id: row.id,
    message_id: row.message_id,
    model_id: row.model_id,
    type: row.type as CreditTransaction['type'],
    user_id: row.user_id
  };
}

export function mapModelPricing(row: typeof schema.modelPricing.$inferSelect): ModelPricing {
  return {
    credits_per_1k_input_tokens: Number(row.credits_per_1k_input_tokens),
    credits_per_1k_output_tokens: Number(row.credits_per_1k_output_tokens),
    credits_per_request: row.credits_per_request,
    id: row.id,
    is_active: row.is_active,
    is_free: row.is_free,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    model_id: row.model_id,
    model_name: row.model_name,
    provider: row.provider
  };
}

// ── Credit Balance ─────────────────────────────────────────────────────────

export async function getCreditBalance(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string
): Promise<CreditBalance | null> {
  const [row] = await db
    .select()
    .from(schema.creditBalances)
    .where(eq(schema.creditBalances.user_id, user_id));
  return row ? mapCreditBalance(row) : null;
}

export async function deductCredits(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string,
  amount: number,
  description?: string,
  model_id?: string,
  conversation_id?: string,
  message_id?: string
): Promise<DeductCreditsResult> {
  // Use the SQL function if available, otherwise do it in-app
  try {
    const rows = await db.execute<{
      success: boolean;
      new_balance: number;
      error_message: string | null;
    }>(
      sql`SELECT * FROM deduct_credits(
        ${user_id}::uuid,
        ${amount}::int,
        ${description ?? null}::text,
        ${model_id ?? null}::text,
        ${conversation_id ?? null}::uuid,
        ${message_id ?? null}::uuid
      )`
    );
    const result = (
      rows as unknown as { success: boolean; new_balance: number; error_message: string | null }[]
    )[0];
    return {
      success: result.success,
      new_balance: result.new_balance,
      error_message: result.error_message
    };
  } catch {
    // Fallback: manual deduction
    const balance = await getCreditBalance(db, user_id);
    if (!balance) return { success: false, new_balance: 0, error_message: 'Balance not found' };
    if (balance.balance < amount)
      return {
        success: false,
        new_balance: balance.balance,
        error_message: 'Insufficient credits'
      };

    const newBalance = balance.balance - amount;
    await db
      .update(schema.creditBalances)
      .set({ balance: newBalance, lifetime_spent: balance.lifetime_spent + amount })
      .where(eq(schema.creditBalances.user_id, user_id));

    await db.insert(schema.creditTransactions).values({
      amount: -amount,
      balance_after: newBalance,
      conversation_id: conversation_id ?? null,
      description: description ?? null,
      message_id: message_id ?? null,
      model_id: model_id ?? null,
      type: 'usage',
      user_id
    });

    return { success: true, new_balance: newBalance, error_message: null };
  }
}

export async function addCredits(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string,
  amount: number,
  type: CreditTransaction['type'],
  description?: string
): Promise<CreditBalance> {
  const balance = await getCreditBalance(db, user_id);
  if (!balance) throw new Error('User credit balance not found');

  const newBalance = balance.balance + amount;
  const [updated] = await db
    .update(schema.creditBalances)
    .set({
      balance: newBalance,
      lifetime_earned: balance.lifetime_earned + amount
    })
    .where(eq(schema.creditBalances.user_id, user_id))
    .returning();

  await db.insert(schema.creditTransactions).values({
    amount,
    balance_after: newBalance,
    description: description ?? null,
    type,
    user_id
  });

  return mapCreditBalance(updated);
}

export async function getCreditTransactions(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string,
  options?: PaginationOptions
): Promise<CreditTransaction[]> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const rows = await db
    .select()
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.user_id, user_id))
    .orderBy(desc(schema.creditTransactions.created_at))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => mapCreditTransaction(r));
}

// ── Model Pricing ──────────────────────────────────────────────────────────

export async function getModelPricing(
  db: NeonHttpDatabase<typeof schema>,
  model_id: string
): Promise<ModelPricing | null> {
  const [row] = await db
    .select()
    .from(schema.modelPricing)
    .where(eq(schema.modelPricing.model_id, model_id));
  return row ? mapModelPricing(row) : null;
}

export async function listModelPricing(
  db: NeonHttpDatabase<typeof schema>
): Promise<ModelPricing[]> {
  const rows = await db
    .select()
    .from(schema.modelPricing)
    .where(eq(schema.modelPricing.is_active, true))
    .orderBy(asc(schema.modelPricing.model_name));
  return rows.map((r) => mapModelPricing(r));
}

export async function upsertModelPricing(
  db: NeonHttpDatabase<typeof schema>,
  data: Omit<ModelPricing, 'id'>
): Promise<ModelPricing> {
  const [row] = await db
    .insert(schema.modelPricing)
    .values({
      credits_per_1k_input_tokens: String(data.credits_per_1k_input_tokens),
      credits_per_1k_output_tokens: String(data.credits_per_1k_output_tokens),
      credits_per_request: data.credits_per_request,
      is_active: data.is_active,
      is_free: data.is_free,
      metadata: data.metadata,
      model_id: data.model_id,
      model_name: data.model_name,
      provider: data.provider
    })
    .onConflictDoUpdate({
      target: schema.modelPricing.model_id,
      set: {
        credits_per_1k_input_tokens: String(data.credits_per_1k_input_tokens),
        credits_per_1k_output_tokens: String(data.credits_per_1k_output_tokens),
        credits_per_request: data.credits_per_request,
        is_active: data.is_active,
        is_free: data.is_free,
        metadata: data.metadata,
        model_name: data.model_name,
        provider: data.provider
      }
    })
    .returning();
  return mapModelPricing(row);
}
