/**
 * Models Store - Fetches available models from API and manages selection
 */
interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  category: string;
  toolSupport: boolean;
  description: string;
  gemsPerMessage: number;
  isFree: boolean;
  isEnabled: boolean;
  maxTokens: number;
}

let models = $state<AvailableModel[]>([]);
let selectedModelId = $state<string>('');
let isLoading = $state(false);
let lastFetched = $state(0);

async function fetchModels(): Promise<void> {
  // Don't refetch if we fetched within the last 60 seconds
  if (Date.now() - lastFetched < 60000 && models.length > 0) return;

  isLoading = true;
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      models = data.data;
      lastFetched = Date.now();

      // Auto-select first model if none selected
      if (!selectedModelId && models.length > 0) {
        selectedModelId = models[0].id;
      }
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
  }
  isLoading = false;
}

function selectModel(id: string): void {
  selectedModelId = id;
  // Persist selection
  try {
    const kv = (globalThis as any).__kvStoreModule;
    if (kv) kv.kvSet('models', 'graphini_selected_model', id);
  } catch {}
}

function loadSavedSelection(): void {
  try {
    const kv = (globalThis as any).__kvStoreModule;
    if (kv) {
      const saved = kv.kvGet('models', 'graphini_selected_model');
      if (saved) selectedModelId = saved;
    }
  } catch {}
}

function getSelectedModel(): AvailableModel | undefined {
  return models.find((m) => m.id === selectedModelId);
}

export const modelsStore = {
  get models() {
    return models;
  },
  get selectedModelId() {
    return selectedModelId;
  },
  get selectedModel() {
    return getSelectedModel();
  },
  get isLoading() {
    return isLoading;
  },
  get freeModels() {
    return models.filter((m) => m.isFree);
  },
  get paidModels() {
    return models.filter((m) => !m.isFree);
  },
  fetch: fetchModels,
  select: selectModel,
  loadSaved: loadSavedSelection
};
