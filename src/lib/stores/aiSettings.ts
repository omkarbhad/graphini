/**
 * AI Settings Store
 * Manages AI model selection and configuration settings
 */

import { derived, writable } from 'svelte/store';

export type PromptMode = 'simple' | 'advanced' | 'visual';

export interface AISettings {
  selectedModelId: string;
  promptMode: PromptMode;
  temperature?: number;
  maxTokens?: number;
}

interface AISettingsStore {
  subscribe: (callback: (value: AISettings) => void) => () => void;
  setSelectedModelId: (id: string) => void;
  setPromptMode: (mode: PromptMode) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  reset: () => void;
}

const defaultSettings: AISettings = {
  selectedModelId: 'gpt-4',
  promptMode: 'simple',
  temperature: 0.7,
  maxTokens: 4000
};

function createAISettingsStore(): AISettingsStore {
  const { subscribe, set, update } = writable<AISettings>(defaultSettings);

  return {
    subscribe,

    setSelectedModelId: (id: string) => {
      update((settings) => ({ ...settings, selectedModelId: id }));
    },

    setPromptMode: (mode: PromptMode) => {
      update((settings) => ({ ...settings, promptMode: mode }));
    },

    setTemperature: (temp: number) => {
      update((settings) => ({ ...settings, temperature: temp }));
    },

    setMaxTokens: (tokens: number) => {
      update((settings) => ({ ...settings, maxTokens: tokens }));
    },

    reset: () => {
      set(defaultSettings);
    }
  };
}

export const aiSettingsStore = createAISettingsStore();

// Derived stores for convenience
export const selectedModelId = derived(
  aiSettingsStore,
  ($aiSettingsStore) => $aiSettingsStore.selectedModelId
);

export const promptMode = derived(
  aiSettingsStore,
  ($aiSettingsStore) => $aiSettingsStore.promptMode
);

export const temperature = derived(
  aiSettingsStore,
  ($aiSettingsStore) => $aiSettingsStore.temperature
);

export const maxTokens = derived(aiSettingsStore, ($aiSettingsStore) => $aiSettingsStore.maxTokens);
