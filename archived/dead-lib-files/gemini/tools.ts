/**
 * Gemini Tools Schema Converter
 * Converts OpenAI tool format to Gemini function declaration format
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

/**
 * Convert OpenAI tool format to Gemini function declaration format
 */
export function convertToGeminiTool(openaiTool: ChatCompletionTool): GeminiTool {
  if (openaiTool.type !== 'function') {
    throw new Error('Only function tools are supported by Gemini');
  }

  const functionDeclaration = convertFunctionDeclaration(openaiTool as any);

  return {
    functionDeclarations: [functionDeclaration]
  };
}

/**
 * Convert multiple OpenAI tools to Gemini format
 */
export function convertToGeminiTools(openaiTools: ChatCompletionTool[]): GeminiTool {
  const functionDeclarations = openaiTools
    .filter((tool) => tool.type === 'function')
    .map((tool) => convertFunctionDeclaration((tool as any).function));

  return {
    functionDeclarations
  };
}

/**
 * Convert OpenAI function declaration to Gemini function declaration
 */
function convertFunctionDeclaration(openaiFunction: any): GeminiFunctionDeclaration {
  return {
    name: openaiFunction.name,
    description: openaiFunction.description || '',
    parameters: openaiFunction.parameters
      ? {
          type: openaiFunction.parameters.type || 'object',
          properties: openaiFunction.parameters.properties || {},
          required: openaiFunction.parameters.required || []
        }
      : undefined
  };
}

/**
 * Convert Gemini function call result to OpenAI format
 */
export function convertGeminiFunctionCallToOpenAI(geminiFunctionCall: any): any {
  return {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'function',
    function: {
      name: geminiFunctionCall.name,
      arguments: JSON.stringify(geminiFunctionCall.args)
    }
  };
}

/**
 * Convert OpenAI function result to Gemini function response format
 */
export function convertOpenAIFunctionResultToGemini(toolName: string, result: any): any {
  return {
    functionResponse: {
      name: toolName,
      response: result
    }
  };
}

/**
 * Validate that a tool schema is compatible with Gemini
 */
export function validateGeminiToolSchema(tool: ChatCompletionTool): boolean {
  if (tool.type !== 'function') {
    return false;
  }

  const func = tool.function;

  // Check required fields
  if (!func.name || typeof func.name !== 'string') {
    return false;
  }

  // Check parameter schema if present
  if (func.parameters) {
    const params = func.parameters;

    // Gemini supports object type for parameters
    if (params.type && params.type !== 'object') {
      return false;
    }

    // Check properties are objects
    if (params.properties && typeof params.properties !== 'object') {
      return false;
    }

    // Check required is array
    if (params.required && !Array.isArray(params.required)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter and convert only valid tools for Gemini
 */
export function convertValidToolsToGemini(openaiTools: ChatCompletionTool[]): GeminiTool {
  const validTools = openaiTools.filter(validateGeminiToolSchema);
  return convertToGeminiTools(validTools);
}
