/**
 * Domain helper — Workspaces & Collaboration
 */

import { and, desc, eq, inArray } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CollaborationMember, User, Workspace } from '../types';
import * as schema from '../schema';

// ── Row Mappers ────────────────────────────────────────────────────────────

export function mapWorkspace(row: typeof schema.workspaces.$inferSelect): Workspace {
  return {
    created_at: row.created_at.toISOString(),
    description: row.description,
    id: row.id,
    is_public: row.is_public,
    name: row.name,
    owner_id: row.owner_id,
    settings: (row.settings as Record<string, unknown>) ?? {},
    slug: row.slug,
    updated_at: row.updated_at.toISOString()
  };
}

export function mapCollabMember(
  row: typeof schema.collaborationMembers.$inferSelect
): CollaborationMember {
  return {
    id: row.id,
    invited_by: row.invited_by,
    joined_at: row.joined_at.toISOString(),
    role: row.role as CollaborationMember['role'],
    user_id: row.user_id,
    workspace_id: row.workspace_id
  };
}

// ── Workspace CRUD ─────────────────────────────────────────────────────────

export async function createWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  data: { owner_id: string; name: string; slug: string; description?: string }
): Promise<Workspace> {
  const [ws] = await db
    .insert(schema.workspaces)
    .values({
      owner_id: data.owner_id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null
    })
    .returning();
  return mapWorkspace(ws);
}

export async function getWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string
): Promise<Workspace | null> {
  const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id));
  return ws ? mapWorkspace(ws) : null;
}

export async function listUserWorkspaces(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string
): Promise<Workspace[]> {
  const owned = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.owner_id, user_id))
    .orderBy(desc(schema.workspaces.updated_at));

  const collabs = await db
    .select({ workspace_id: schema.collaborationMembers.workspace_id })
    .from(schema.collaborationMembers)
    .where(eq(schema.collaborationMembers.user_id, user_id));

  const ownedIds = new Set(owned.map((w) => w.id));
  const collabIds = collabs.map((c) => c.workspace_id).filter((id) => !ownedIds.has(id));

  if (collabIds.length > 0) {
    const collabWs = await db
      .select()
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, collabIds))
      .orderBy(desc(schema.workspaces.updated_at));
    return [...owned, ...collabWs].map((w) => mapWorkspace(w));
  }

  return owned.map((w) => mapWorkspace(w));
}

export async function updateWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string,
  data: Partial<Pick<Workspace, 'name' | 'description' | 'is_public' | 'settings'>>
): Promise<Workspace> {
  const [ws] = await db
    .update(schema.workspaces)
    .set(data)
    .where(eq(schema.workspaces.id, id))
    .returning();
  return mapWorkspace(ws);
}

export async function deleteWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string
): Promise<void> {
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
}

// ── Collaboration ──────────────────────────────────────────────────────────

export async function addCollaborator(
  db: NeonHttpDatabase<typeof schema>,
  data: {
    workspace_id: string;
    user_id: string;
    role: CollaborationMember['role'];
    invited_by?: string;
  }
): Promise<CollaborationMember> {
  const [member] = await db
    .insert(schema.collaborationMembers)
    .values({
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      role: data.role,
      invited_by: data.invited_by ?? null
    })
    .returning();
  return mapCollabMember(member);
}

export async function removeCollaborator(
  db: NeonHttpDatabase<typeof schema>,
  workspace_id: string,
  user_id: string
): Promise<void> {
  await db
    .delete(schema.collaborationMembers)
    .where(
      and(
        eq(schema.collaborationMembers.workspace_id, workspace_id),
        eq(schema.collaborationMembers.user_id, user_id)
      )
    );
}

export async function listCollaborators(
  db: NeonHttpDatabase<typeof schema>,
  workspace_id: string
): Promise<(CollaborationMember & { user?: User })[]> {
  const rows = await db
    .select()
    .from(schema.collaborationMembers)
    .leftJoin(schema.users, eq(schema.collaborationMembers.user_id, schema.users.id))
    .where(eq(schema.collaborationMembers.workspace_id, workspace_id));

  return rows.map((r) => ({
    ...mapCollabMember(r.collaboration_members),
    user: r.users
      ? {
          id: r.users.id,
          email: r.users.email,
          display_name: r.users.display_name,
          avatar_url: r.users.avatar_url
        }
      : undefined
  })) as (CollaborationMember & { user?: User })[];
}

export async function updateCollaboratorRole(
  db: NeonHttpDatabase<typeof schema>,
  workspace_id: string,
  user_id: string,
  role: CollaborationMember['role']
): Promise<void> {
  await db
    .update(schema.collaborationMembers)
    .set({ role })
    .where(
      and(
        eq(schema.collaborationMembers.workspace_id, workspace_id),
        eq(schema.collaborationMembers.user_id, user_id)
      )
    );
}
