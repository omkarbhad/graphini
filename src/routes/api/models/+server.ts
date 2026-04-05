/**
 * Public Models API - Returns enabled models for users
 * Reads from enabled_models table (admin-managed via DB)
 */

import { getDb } from '$lib/server/db';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    const db = getDb();
    const enabledModels = await db.listEnabledModels(true);

    const models = enabledModels.map((m: any) => ({
      id: m.model_id,
      name: m.model_name,
      provider: m.provider || 'openrouter',
      category: m.category || 'General',
      toolSupport: m.tool_support || false,
      description: m.description || '',
      gemsPerMessage: m.gems_per_message ?? 2,
      isFree: m.is_free || false,
      isEnabled: m.is_enabled !== false,
      maxTokens: m.max_tokens || 4000
    }));

    return json({ success: true, data: models });
  } catch (error) {
    console.error('Models API error:', error);
    return json({ success: false, error: 'Failed to fetch models' }, { status: 500 });
  }
};
