/**
 * Stores Index
 * Central export for all application stores
 */

// Settings (Svelte 5 runes)
export {
  aiSettings,
  editorSettings,
  getSessionId,
  getUserId,
  setUserId,
  uiSettings,
  type AISettings,
  type EditorSettings,
  type UISettings
} from './settings.svelte';

// Model stores for AI model management
export {
  addToChatSelection,
  allModelsStore,
  favoriteModelsStore,
  getFavoriteModelsForProvider,
  getModelsForProvider,
  isFavoriteModel,
  loadModelsFromAPI,
  modelsLoadingStore,
  removeFromChatSelection,
  selectedChatModelsStore,
  toggleFavoriteModel,
  updateChatSelection,
  type ModelOption
} from './modelStore';

// Tools configuration store
export { TOOL_CATEGORIES, toolsStore, type ToolConfig } from './toolsStore';

