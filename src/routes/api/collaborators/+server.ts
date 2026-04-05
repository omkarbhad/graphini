/**
 * Collaborators API
 * GET    - List collaborators for a workspace
 * POST   - Invite a collaborator by email
 * DELETE - Remove a collaborator
 * PATCH  - Update collaborator role
 */

import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Resolve workspace_id: if 'default' or missing, find/create the user's personal workspace */
async function resolveWorkspaceId(userId: string, rawId: string | null): Promise<string> {
  if (rawId && rawId !== 'default') return rawId;
  const db = getDb() as any;
  const client = db.client;
  if (!client) throw new Error('DB client not available');
  // Find existing workspace owned by user
  const { data: existing } = await client
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single();
  if (existing?.id) return existing.id;
  // Create personal workspace
  const { data: created, error } = await client
    .from('workspaces')
    .insert({ owner_id: userId, name: 'My Workspace', slug: `ws-${userId.slice(0, 8)}` })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create workspace: ${error.message}`);
  return created.id;
}

export const GET: RequestHandler = async ({ request, url }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const rawWorkspaceId = url.searchParams.get('workspace_id');
  if (!rawWorkspaceId) return json({ error: 'workspace_id required' }, { status: 400 });

  try {
    const workspaceId = await resolveWorkspaceId(user.id, rawWorkspaceId);
    const db = getDb();
    const collaborators = await db.listCollaborators(workspaceId);
    return json({ collaborators, workspace_id: workspaceId });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to list collaborators' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { workspace_id: rawWsId, email, role = 'editor' } = body;

    if (!rawWsId) return json({ error: 'workspace_id required' }, { status: 400 });
    if (!email) return json({ error: 'email required' }, { status: 400 });

    const workspace_id = await resolveWorkspaceId(user.id, rawWsId);
    const db = getDb();

    // Find user by email
    const invitee = await db.getUserByEmail(email.toLowerCase().trim());
    if (!invitee) {
      return json({ error: 'User not found. They must register first.' }, { status: 404 });
    }

    // Check if already a collaborator
    const existing = await db.listCollaborators(workspace_id);
    if (existing.some((c) => c.user_id === invitee.id)) {
      return json({ error: 'User is already a collaborator' }, { status: 409 });
    }

    const member = await db.addCollaborator({
      workspace_id,
      user_id: invitee.id,
      role: role as 'viewer' | 'editor' | 'admin',
      invited_by: user.id
    });

    return json({
      collaborator: {
        ...member,
        user: {
          id: invitee.id,
          email: invitee.email,
          display_name: invitee.display_name,
          avatar_url: invitee.avatar_url
        }
      }
    });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to invite collaborator' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { workspace_id: rawWsId, user_id } = body;

    if (!rawWsId || !user_id) {
      return json({ error: 'workspace_id and user_id required' }, { status: 400 });
    }

    const workspace_id = await resolveWorkspaceId(user.id, rawWsId);
    const db = getDb();
    await db.removeCollaborator(workspace_id, user_id);
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to remove collaborator' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { workspace_id: rawWsId, user_id, role } = body;

    if (!rawWsId || !user_id || !role) {
      return json({ error: 'workspace_id, user_id, and role required' }, { status: 400 });
    }

    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const workspace_id = await resolveWorkspaceId(user.id, rawWsId);
    const db = getDb();
    await db.updateCollaboratorRole(workspace_id, user_id, role);
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to update role' }, { status: 500 });
  }
};
