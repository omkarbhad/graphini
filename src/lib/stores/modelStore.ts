import { derived, writable } from 'svelte/store';

// Model interface for the chat component
export interface ModelOption {
  id: string;
  name: string;
  icon: string;
  category?: string;
  toolSupport?: boolean;
  maxTokens?: number;
  costPerToken?: number;
  description?: string;
  provider?: string;
}

// Store for ALL available models from admin (source of truth)
export const allModelsStore = writable<Record<string, ModelOption[]>>({});

// Store for user's favorited/shortlisted models from settings
export const favoriteModelsStore = writable<string[]>([]);

// Store for user's selected chat models (max 10)
export const selectedChatModelsStore = writable<ModelOption[]>([]);

// Store for loading state
export const modelsLoadingStore = writable(false);

// Derived store to get models for a specific provider from admin
export function getModelsForProvider(provider: string) {
  return derived(allModelsStore, ($models) => $models[provider] || []);
}

// Derived store to get favorite models for current provider
export function getFavoriteModelsForProvider(provider: string) {
  return derived([allModelsStore, favoriteModelsStore], ([$models, $favorites]) => {
    const providerModels = $models[provider] || [];
    return providerModels.filter((model) => $favorites.includes(`${provider}:${model.id}`));
  });
}

// Function to load all models from admin API
export async function loadModelsFromAPI() {
  modelsLoadingStore.set(true);
  try {
    // Load providers
    const providersRes = await fetch('/api/admin?action=providers');
    if (!providersRes.ok) {
      // If the user lacks permission (e.g. 401/403), abort without spamming errors.
      console.warn(
        '[models] Skipping provider load because the server returned',
        providersRes.status,
        providersRes.statusText
      );
      return;
    }
    const providersData = await providersRes.json();

    // Load models
    const modelsRes = await fetch('/api/admin?action=models');
    if (!modelsRes.ok) {
      console.warn(
        '[models] Skipping model load because the server returned',
        modelsRes.status,
        modelsRes.statusText
      );
      return;
    }
    const modelsData = await modelsRes.json();

    const models: Record<string, ModelOption[]> = {};

    if (providersData.success && modelsData.success) {
      // Group models by provider
      modelsData.data.forEach((m: any) => {
        if (!m.key) return; // Skip models without a key
        const provider = m.key.split(':')[0];
        if (!models[provider]) {
          models[provider] = [];
        }

        // Find provider info
        const providerInfo = providersData.data.find((p: any) => p.key === provider);

        models[provider].push({
          id: m.value?.id ?? m.key,
          name: m.value?.label ?? m.key,
          icon: getModelIcon(provider),
          category: m.value?.category,
          toolSupport: m.value?.toolSupport,
          maxTokens: m.value?.maxTokens,
          costPerToken: m.value?.costPerToken,
          description: m.value?.description,
          provider: provider
        });
      });
    }

    allModelsStore.set(models);
  } catch (error) {
    console.error('Failed to load models from API:', error);
  } finally {
    modelsLoadingStore.set(false);
  }
}

// Function to toggle favorite model
export function toggleFavoriteModel(fullModelId: string) {
  favoriteModelsStore.update(($favorites) => {
    if ($favorites.includes(fullModelId)) {
      return $favorites.filter((id) => id !== fullModelId);
    } else {
      return [...$favorites, fullModelId];
    }
  });
}

// Function to check if model is favorite
export function isFavoriteModel(fullModelId: string) {
  return derived(favoriteModelsStore, ($favorites) => $favorites.includes(fullModelId));
}

// Function to add model to chat selection (max 10)
export function addToChatSelection(model: ModelOption) {
  selectedChatModelsStore.update(($selected) => {
    if ($selected.length >= 10) {
      throw new Error('Maximum 10 models allowed in chat selection');
    }
    if (!$selected.find((m) => m.id === model.id)) {
      return [...$selected, model];
    }
    return $selected;
  });
}

// Function to remove model from chat selection
export function removeFromChatSelection(modelId: string) {
  selectedChatModelsStore.update(($selected) => $selected.filter((m) => m.id !== modelId));
}

// Function to update chat selection (replace all)
export function updateChatSelection(models: ModelOption[]) {
  if (models.length > 10) {
    throw new Error('Maximum 10 models allowed in chat selection');
  }
  selectedChatModelsStore.set(models);
}

// Helper function to get icon for provider
function getModelIcon(provider: string): string {
  const icons: Record<string, string> = {
    openai: '🧠',
    anthropic: '🧬',
    openrouter: '🌐',
    kilo: '⚙️',
    gemini: '✨'
  };
  return icons[provider] || '🤖';
}

// Initialize models on import
loadModelsFromAPI();
