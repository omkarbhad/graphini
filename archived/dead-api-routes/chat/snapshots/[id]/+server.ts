/**
 * Single Snapshot API Endpoint
 * GET    /api/chat/snapshots/[id] - Get snapshot
 * POST   /api/chat/snapshots/[id]/restore - Restore snapshot
 * DELETE /api/chat/snapshots/[id] - Delete snapshot
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getSnapshot, deleteSnapshot } from '$lib/server/db';

// GET /api/chat/snapshots/[id]
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Snapshot ID is required' },
        { status: 400 }
      );
    }

    const snapshot = await getSnapshot(id);

    if (!snapshot) {
      return json({ error: 'Not Found', message: 'Snapshot not found' }, { status: 404 });
    }

    return json({ snapshot });
  } catch (error) {
    console.error('Failed to get snapshot:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get snapshot'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/snapshots/[id]
export async function DELETE(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Snapshot ID is required' },
        { status: 400 }
      );
    }

    // Check if snapshot exists
    const existing = await getSnapshot(id);
    if (!existing) {
      return json({ error: 'Not Found', message: 'Snapshot not found' }, { status: 404 });
    }

    await deleteSnapshot(id);

    return json({ success: true, message: 'Snapshot deleted' });
  } catch (error) {
    console.error('Failed to delete snapshot:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete snapshot'
      },
      { status: 500 }
    );
  }
}
