/**
 * Domain helper — Enabled Models & Diagram Workspaces
 */

import { asc, desc, eq, ilike, and, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { DiagramWorkspaceRow, DiagramWorkspaceSummaryRow, EnabledModel } from '../types';
import * as schema from '../schema';

// ── Row Mappers ────────────────────────────────────────────────────────────

export function mapEnabledModel(row: typeof schema.enabledModels.$inferSelect): EnabledModel {
  return {
    category: row.category,
    created_at: row.created_at.toISOString(),
    description: row.description,
    gems_per_message: row.gems_per_message,
    id: row.id,
    is_enabled: row.is_enabled,
    is_free: row.is_free,
    max_tokens: row.max_tokens ?? 4000,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    model_id: row.model_id,
    model_name: row.model_name,
    provider: row.provider,
    sort_order: row.sort_order ?? 0,
    tool_support: row.tool_support,
    updated_at: row.updated_at.toISOString()
  };
}

export function mapDiagramWorkspace(
  row: typeof schema.diagramWorkspaces.$inferSelect
): DiagramWorkspaceRow {
  return {
    created_at: row.created_at.toISOString(),
    description: row.description,
    diagram_type: row.diagram_type,
    document: (row.document as Record<string, unknown>) ?? {},
    element_count: row.element_count,
    id: row.id,
    is_starred: row.is_starred,
    tags: (row.tags as string[]) ?? [],
    thumbnail_url: row.thumbnail_url,
    title: row.title,
    updated_at: row.updated_at.toISOString(),
    user_id: row.user_id
  };
}

// ── Enabled Models ─────────────────────────────────────────────────────────

export async function listEnabledModels(
  db: NeonHttpDatabase<typeof schema>,
  onlyEnabled = true
): Promise<EnabledModel[]> {
  const conditions = onlyEnabled ? eq(schema.enabledModels.is_enabled, true) : undefined;
  const rows = await db
    .select()
    .from(schema.enabledModels)
    .where(conditions)
    .orderBy(asc(schema.enabledModels.sort_order));
  return rows.map((r) => mapEnabledModel(r));
}

export async function getEnabledModel(
  db: NeonHttpDatabase<typeof schema>,
  model_id: string
): Promise<EnabledModel | null> {
  const [row] = await db
    .select()
    .from(schema.enabledModels)
    .where(eq(schema.enabledModels.model_id, model_id));
  return row ? mapEnabledModel(row) : null;
}

export async function upsertEnabledModel(
  db: NeonHttpDatabase<typeof schema>,
  data: Omit<EnabledModel, 'id' | 'created_at' | 'updated_at'>
): Promise<EnabledModel> {
  const [row] = await db
    .insert(schema.enabledModels)
    .values(data)
    .onConflictDoUpdate({
      target: schema.enabledModels.model_id,
      set: {
        category: data.category,
        description: data.description,
        gems_per_message: data.gems_per_message,
        is_enabled: data.is_enabled,
        is_free: data.is_free,
        max_tokens: data.max_tokens,
        metadata: data.metadata,
        model_name: data.model_name,
        provider: data.provider,
        sort_order: data.sort_order,
        tool_support: data.tool_support
      }
    })
    .returning();
  return mapEnabledModel(row);
}

export async function deleteEnabledModel(
  db: NeonHttpDatabase<typeof schema>,
  model_id: string
): Promise<void> {
  await db.delete(schema.enabledModels).where(eq(schema.enabledModels.model_id, model_id));
}

// ── Diagram Workspaces ─────────────────────────────────────────────────────

export async function createDiagramWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  data: {
    user_id: string;
    title: string;
    description?: string;
    document?: Record<string, unknown>;
  }
): Promise<DiagramWorkspaceRow> {
  const [row] = await db
    .insert(schema.diagramWorkspaces)
    .values({
      user_id: data.user_id,
      title: data.title,
      description: data.description ?? null,
      document: data.document ?? {
        canvas: {
          connections: [],
          elements: [],
          gridEnabled: true,
          gridSize: 20,
          snapToGrid: true,
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        chat: { messages: [] },
        documentMarkdown: '',
        mermaidCode: '',
        version: 1
      }
    })
    .returning();
  return mapDiagramWorkspace(row);
}

export async function getDiagramWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string
): Promise<DiagramWorkspaceRow | null> {
  const [row] = await db
    .select()
    .from(schema.diagramWorkspaces)
    .where(eq(schema.diagramWorkspaces.id, id));
  return row ? mapDiagramWorkspace(row) : null;
}

export async function listDiagramWorkspaces(
  db: NeonHttpDatabase<typeof schema>,
  user_id: string,
  options?: { limit?: number; offset?: number; starred_only?: boolean; search?: string }
): Promise<{ workspaces: DiagramWorkspaceSummaryRow[]; total: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const conditions = [eq(schema.diagramWorkspaces.user_id, user_id)];
  if (options?.starred_only) {
    conditions.push(eq(schema.diagramWorkspaces.is_starred, true));
  }
  if (options?.search) {
    conditions.push(ilike(schema.diagramWorkspaces.title, `%${options.search}%`));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      created_at: schema.diagramWorkspaces.created_at,
      description: schema.diagramWorkspaces.description,
      diagram_type: schema.diagramWorkspaces.diagram_type,
      element_count: schema.diagramWorkspaces.element_count,
      id: schema.diagramWorkspaces.id,
      is_starred: schema.diagramWorkspaces.is_starred,
      tags: schema.diagramWorkspaces.tags,
      thumbnail_url: schema.diagramWorkspaces.thumbnail_url,
      title: schema.diagramWorkspaces.title,
      updated_at: schema.diagramWorkspaces.updated_at,
      user_id: schema.diagramWorkspaces.user_id
    })
    .from(schema.diagramWorkspaces)
    .where(where)
    .orderBy(desc(schema.diagramWorkspaces.updated_at))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.diagramWorkspaces)
    .where(where);

  return {
    workspaces: rows.map((r) => ({
      created_at: r.created_at.toISOString(),
      description: r.description,
      diagram_type: r.diagram_type,
      element_count: r.element_count,
      id: r.id,
      is_starred: r.is_starred,
      tags: (r.tags as string[]) ?? [],
      thumbnail_url: r.thumbnail_url,
      title: r.title,
      updated_at: r.updated_at.toISOString(),
      user_id: r.user_id
    })),
    total: count
  };
}

export async function updateDiagramWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string,
  data: Partial<Pick<DiagramWorkspaceRow, 'title' | 'description' | 'is_starred' | 'tags'>>
): Promise<DiagramWorkspaceRow> {
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_starred !== undefined) updateData.is_starred = data.is_starred;
  if (data.tags !== undefined) updateData.tags = data.tags;

  const [row] = await db
    .update(schema.diagramWorkspaces)
    .set(updateData)
    .where(eq(schema.diagramWorkspaces.id, id))
    .returning();
  return mapDiagramWorkspace(row);
}

export async function deleteDiagramWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string
): Promise<void> {
  await db.delete(schema.diagramWorkspaces).where(eq(schema.diagramWorkspaces.id, id));
}

export async function updateDiagramWorkspaceDocument(
  db: NeonHttpDatabase<typeof schema>,
  id: string,
  document: Record<string, unknown>,
  meta?: { element_count?: number; diagram_type?: string | null }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    document,
    updated_at: new Date()
  };
  if (meta?.element_count !== undefined) updateData.element_count = meta.element_count;
  if (meta?.diagram_type !== undefined) updateData.diagram_type = meta.diagram_type;

  await db
    .update(schema.diagramWorkspaces)
    .set(updateData)
    .where(eq(schema.diagramWorkspaces.id, id));
}

export async function duplicateDiagramWorkspace(
  db: NeonHttpDatabase<typeof schema>,
  id: string,
  newTitle: string
): Promise<DiagramWorkspaceRow> {
  const original = await getDiagramWorkspace(db, id);
  if (!original) throw new Error('Workspace not found');

  const [row] = await db
    .insert(schema.diagramWorkspaces)
    .values({
      description: original.description,
      diagram_type: original.diagram_type,
      document: original.document as Record<string, unknown>,
      element_count: original.element_count,
      is_starred: false,
      tags: original.tags,
      thumbnail_url: null,
      title: newTitle,
      user_id: original.user_id
    })
    .returning();
  return mapDiagramWorkspace(row);
}
