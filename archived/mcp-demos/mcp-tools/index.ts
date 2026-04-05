export { default as MCPIconResults } from './MCPIconResults.svelte';
export { default as MCPTool } from './MCPTool.svelte';

// MCP tool types and utilities
export interface MCPIconSearchResult {
  name: string;
  category: string;
  path: string;
  confidence?: number;
}

export interface MCPValidationResult {
  valid: boolean;
  iconPath?: string;
  suggestedAlternative?: string;
}

export interface MCPIconSuggestion {
  name: string;
  reason?: string;
  confidence?: number;
}

export interface MCPIconPackage {
  name: string;
  description: string;
  icons: string[];
  category: string;
}

// MCP tool names
export const MCP_TOOL_NAMES = {
  SEARCH_ICONS: 'mcp-search_icons',
  GET_AVAILABLE_ICONS: 'mcp-get_available_icons',
  VALIDATE_ICON_REFERENCE: 'mcp-validate_icon_reference',
  GET_ICON_PACKAGES: 'mcp-get_icon_packages',
  SUGGEST_ICONS_FOR_CONTEXT: 'mcp-suggest_icons_for_context'
} as const;

export type MCPToolName = (typeof MCP_TOOL_NAMES)[keyof typeof MCP_TOOL_NAMES];
