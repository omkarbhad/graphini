/**
 * User Preferences API
 * GET  - Fetch user preferences from server (stored in user.metadata.preferences)
 * PUT  - Save/update user preferences on server
 */

import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const user = await validateSession(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const preferences = (user.metadata?.preferences as Record<string, unknown>) || {};
	return json({ preferences });
};

export const PUT: RequestHandler = async ({ request }) => {
	const user = await validateSession(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		const { preferences } = body;

		if (!preferences || typeof preferences !== 'object') {
			return json({ error: 'Invalid preferences data' }, { status: 400 });
		}

		const db = getDb();
		const existingMetadata = user.metadata || {};
		const updatedMetadata = {
			...existingMetadata,
			preferences: {
				...((existingMetadata.preferences as Record<string, unknown>) || {}),
				...preferences
			}
		};

		await db.updateUser(user.id, { metadata: updatedMetadata });

		return json({ success: true, preferences: updatedMetadata.preferences });
	} catch (e: any) {
		return json({ error: e?.message || 'Failed to save preferences' }, { status: 500 });
	}
};
