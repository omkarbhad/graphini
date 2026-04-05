/**
 * Gemini Client Helper
 * Provides utility functions for working with Google's Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiModel {
  id: string;
  name: string;
  free: boolean;
  limited?: boolean;
  description?: string;
}

export const GEMINI_MODELS: Record<string, GeminiModel[]> = {
  free: [
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      free: true,
      description: 'Fastest and most cost-effective model with function calling'
    },
    {
      id: 'gemini-3-flash-preview',
      name: 'Gemini 3 Flash Preview',
      free: true,
      description: 'Balanced speed and intelligence with advanced function calling'
    }
  ],
  paid: [
    {
      id: 'gemini-3-pro-preview',
      name: 'Gemini 3 Pro Preview',
      free: false,
      description: 'Most powerful model for complex tasks'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      free: false,
      description: 'Advanced model with enhanced capabilities'
    }
  ]
};

export function createGeminiClient(apiKey: string) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }
  return new GoogleGenerativeAI(apiKey);
}

export function getGeminiModel(client: GoogleGenerativeAI, model: string) {
  return client.getGenerativeModel({
    model,
    // Configure for function calling
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });
}

export function isGeminiModel(modelId: string): boolean {
  return modelId.startsWith('gemini-');
}

export function getGeminiModelInfo(modelId: string): GeminiModel | null {
  const allModels = [...GEMINI_MODELS.free, ...GEMINI_MODELS.paid];
  return allModels.find((model) => model.id === modelId) || null;
}

export function isFreeGeminiModel(modelId: string): boolean {
  const modelInfo = getGeminiModelInfo(modelId);
  return modelInfo?.free ?? false;
}

export function getGeminiModelsByTier(tier: 'free' | 'paid' | 'all'): GeminiModel[] {
  if (tier === 'all') {
    return [...GEMINI_MODELS.free, ...GEMINI_MODELS.paid];
  }
  return GEMINI_MODELS[tier] || [];
}
