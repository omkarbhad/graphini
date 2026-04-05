/**
 * Stores Index
 * Central export for all application stores
 */

// Persistent stores with localStorage support
export {
  aiSettingsStore,
  allSettings,
  createPersistentStore,
  draftMessagesStore,
  editorSettingsStore,
  favoritesStore,
  getSessionId,
  getUserId,
  isDarkMode,
  recentConversationsStore,
  setUserId,
  storeActions,
  syncAllStores,
  uiSettingsStore,
  type AISettings,
  type EditorSettings,
  type PersistentStore,
  type RecentConversation,
  type StoreOptions,
  type SyncStatus,
  type UISettings
} from './persistentStore';

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

// Legacy AI settings store (for backward compatibility)
export {
  aiSettingsStore as legacyAiSettingsStore,
  maxTokens,
  promptMode,
  selectedModelId,
  temperature
} from './aiSettings';
