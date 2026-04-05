const Database = require('better-sqlite3');
import { dirname, join } from 'path';

const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../database/models.db');

// SQLite Database Manager for Model Management
export class ModelDatabase {
  private db: any;

  constructor() {
    this.db = new Database.default(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  // Provider CRUD Operations
  getProviders() {
    const stmt = this.db.prepare(`
      SELECT api_key, provider_id, provider_name, base_url, description, requires_api_key
      FROM providers
      ORDER BY provider_name
    `);
    return stmt.all() as Provider[];
  }

  getProvider(apiKey: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM providers WHERE api_key = ?
    `);
    return stmt.get(apiKey) as Provider | undefined;
  }

  createProvider(provider: Omit<Provider, 'created_at' | 'updated_at'>) {
    const stmt = this.db.prepare(`
      INSERT INTO providers (api_key, provider_id, provider_name, base_url, description, requires_api_key)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      provider.api_key,
      provider.provider_id,
      provider.provider_name,
      provider.base_url,
      provider.description,
      provider.requires_api_key
    );
  }

  updateProvider(
    apiKey: string,
    updates: Partial<Omit<Provider, 'api_key' | 'created_at' | 'updated_at'>>
  ) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE providers SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE api_key = ?
    `);
    return stmt.run(...values, apiKey);
  }

  deleteProvider(apiKey: string) {
    const stmt = this.db.prepare('DELETE FROM providers WHERE api_key = ?');
    return stmt.run(apiKey);
  }

  // Model CRUD Operations
  getModels(providerApiKey?: string) {
    let query = `
      SELECT m.*, p.provider_id, p.provider_name
      FROM models m
      JOIN providers p ON m.provider_api_key = p.api_key
    `;

    if (providerApiKey) {
      query += ' WHERE m.provider_api_key = ?';
    }

    query += ' ORDER BY p.provider_name, m.model_name';

    const stmt = this.db.prepare(query);
    return providerApiKey
      ? (stmt.all(providerApiKey) as ModelWithProvider[])
      : (stmt.all() as ModelWithProvider[]);
  }

  getModel(providerApiKey: string, modelId: string) {
    const stmt = this.db.prepare(`
      SELECT m.*, p.provider_id, p.provider_name
      FROM models m
      JOIN providers p ON m.provider_api_key = p.api_key
      WHERE m.provider_api_key = ? AND m.model_id = ?
    `);
    return stmt.get(providerApiKey, modelId) as ModelWithProvider | undefined;
  }

  createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>) {
    const stmt = this.db.prepare(`
      INSERT INTO models (provider_api_key, model_id, model_name, category, tool_support, max_tokens, cost_per_token, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      model.provider_api_key,
      model.model_id,
      model.model_name,
      model.category,
      model.tool_support,
      model.max_tokens,
      model.cost_per_token,
      model.description
    );
  }

  updateModel(
    providerApiKey: string,
    modelId: string,
    updates: Partial<
      Omit<Model, 'id' | 'provider_api_key' | 'model_id' | 'created_at' | 'updated_at'>
    >
  ) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE models SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE provider_api_key = ? AND model_id = ?
    `);
    return stmt.run(...values, providerApiKey, modelId);
  }

  deleteModel(providerApiKey: string, modelId: string) {
    const stmt = this.db.prepare('DELETE FROM models WHERE provider_api_key = ? AND model_id = ?');
    return stmt.run(providerApiKey, modelId);
  }

  // Combined queries
  getProviderModels() {
    const stmt = this.db.prepare(
      'SELECT * FROM provider_models ORDER BY provider_name, model_name'
    );
    return stmt.all() as ProviderModel[];
  }

  getModelsByProviderId(providerId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM provider_models 
      WHERE provider_id = ? 
      ORDER BY model_name
    `);
    return stmt.all(providerId) as ProviderModel[];
  }

  // Search functionality
  searchModels(query: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM provider_models 
      WHERE model_name LIKE ? OR model_id LIKE ? OR provider_name LIKE ?
      ORDER BY provider_name, model_name
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm) as ProviderModel[];
  }

  close() {
    this.db.close();
  }
}

// Types
export interface Provider {
  api_key: string;
  provider_id: string;
  provider_name: string;
  base_url: string | null;
  description: string | null;
  requires_api_key: number;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: number;
  provider_api_key: string;
  model_id: string;
  model_name: string;
  category: string | null;
  tool_support: number;
  max_tokens: number;
  cost_per_token: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelWithProvider extends Model {
  provider_id: string;
  provider_name: string;
}

export interface ProviderModel {
  api_key: string;
  provider_id: string;
  provider_name: string;
  base_url: string | null;
  provider_description: string | null;
  requires_api_key: number;
  model_id: string;
  model_name: string;
  category: string | null;
  tool_support: number;
  max_tokens: number;
  cost_per_token: number;
  model_description: string | null;
}

// Singleton instance
export const modelDB = new ModelDatabase();
