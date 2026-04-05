/**
 * Gemini Integration Index
 * Central exports for all Gemini-related utilities
 */

export {
  GEMINI_MODELS,
  createGeminiClient,
  getGeminiModel,
  getGeminiModelInfo,
  getGeminiModelsByTier,
  isFreeGeminiModel,
  isGeminiModel
} from './client';
export type { GeminiModel } from './client';

export {
  convertGeminiFunctionCallToOpenAI,
  convertOpenAIFunctionResultToGemini,
  convertToGeminiTool,
  convertToGeminiTools,
  convertValidToolsToGemini,
  validateGeminiToolSchema
} from './tools';
export type { GeminiFunctionDeclaration, GeminiTool } from './tools';

export {
  convertToGeminiMessages,
  geminiContinueWithFunctionResponse,
  geminiStreamResponse,
  getFreeTierErrorMessage,
  isFreeTierError
} from './streaming';
export type { ChatMessage, GeminiStreamingEvent } from './streaming';
