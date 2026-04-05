import type { ToolUIPart } from 'ai';
import { MCP_TOOL_NAMES, type MCPToolName } from './index.js';

/**
 * Check if a tool name is an MCP tool
 */
export function isMCPTool(toolName: string): toolName is MCPToolName {
  return Object.values(MCP_TOOL_NAMES).includes(toolName as MCPToolName);
}

/**
 * Get MCP tool configuration
 */
export function getMCPToolConfig(toolName: MCPToolName) {
  const configs = {
    [MCP_TOOL_NAMES.SEARCH_ICONS]: {
      label: 'Icon Search',
      description: 'Searching for verified icons',
      color: 'blue',
      icon: '🔍'
    },
    [MCP_TOOL_NAMES.GET_AVAILABLE_ICONS]: {
      label: 'Available Icons',
      description: 'Loading available icons',
      color: 'green',
      icon: '📦'
    },
    [MCP_TOOL_NAMES.VALIDATE_ICON_REFERENCE]: {
      label: 'Validate Icon',
      description: 'Validating icon reference',
      color: 'purple',
      icon: '✅'
    },
    [MCP_TOOL_NAMES.GET_ICON_PACKAGES]: {
      label: 'Icon Packages',
      description: 'Loading icon packages',
      color: 'orange',
      icon: '📚'
    },
    [MCP_TOOL_NAMES.SUGGEST_ICONS_FOR_CONTEXT]: {
      label: 'Icon Suggestions',
      description: 'Getting icon suggestions',
      color: 'yellow',
      icon: '💡'
    }
  };

  return (
    configs[toolName] || {
      label: toolName,
      description: 'MCP Tool Operation',
      color: 'gray',
      icon: '⚙️'
    }
  );
}

/**
 * Format MCP tool state for display
 */
export function formatMCPToolState(
  state: string
): 'input-streaming' | 'input-available' | 'output-available' | 'output-error' {
  // Map various state formats to standard ToolUIPartState
  switch (state) {
    case 'executing':
    case 'running':
    case 'input-streaming':
      return 'input-streaming';
    case 'pending':
    case 'input-available':
      return 'input-available';
    case 'completed':
    case 'success':
    case 'output-available':
      return 'output-available';
    case 'error':
    case 'failed':
    case 'output-error':
      return 'output-error';
    default:
      return 'input-available';
  }
}

/**
 * Extract MCP tools from message parts
 */
export function extractMCPTools(message: any): ToolUIPart[] {
  if (!message.parts || !Array.isArray(message.parts)) {
    return [];
  }

  return message.parts.filter((part: any) => {
    return part.type === 'tool' && isMCPTool(part.toolName);
  });
}

/**
 * Create mock MCP tool data for testing
 */
export function createMockMCPTool(
  toolName: MCPToolName,
  state: string = 'output-available',
  input?: any,
  output?: any
) {
  return {
    type: `tool-${toolName}` as const,
    toolName,
    state: formatMCPToolState(state),
    input: input || {},
    output: output || {},
    toolCallId: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

/**
 * Mock MCP tool responses for development
 */
export const mockMCPResponses = {
  [MCP_TOOL_NAMES.SEARCH_ICONS]: {
    type: 'icon-search-results',
    count: 3,
    icons: [
      {
        name: 'aws-ec2',
        category: 'compute',
        path: '/icons/aws/compute/compute-ec2.svg',
        confidence: 0.95
      },
      {
        name: 'aws-lambda',
        category: 'compute',
        path: '/icons/aws/compute/lambda.svg',
        confidence: 0.9
      },
      {
        name: 'aws-rds',
        category: 'database',
        path: '/icons/aws/database/database-rds.svg',
        confidence: 0.88
      }
    ]
  },
  [MCP_TOOL_NAMES.GET_AVAILABLE_ICONS]: {
    type: 'available-icons',
    count: 156,
    categories: ['compute', 'storage', 'networking', 'database', 'analytics', 'security']
  },
  [MCP_TOOL_NAMES.VALIDATE_ICON_REFERENCE]: {
    type: 'validation-result',
    valid: true,
    iconPath: '/icons/aws/compute/compute-ec2.svg'
  },
  [MCP_TOOL_NAMES.GET_ICON_PACKAGES]: {
    type: 'icon-packages',
    packages: [
      {
        name: 'serverless-web-app',
        description: 'Serverless web application architecture',
        icons: ['api-gateway', 'lambda', 'dynamodb', 's3'],
        category: 'serverless'
      }
    ]
  },
  [MCP_TOOL_NAMES.SUGGEST_ICONS_FOR_CONTEXT]: {
    type: 'icon-suggestions',
    suggestions: [
      {
        name: 'aws-ec2',
        reason: 'Web server component',
        confidence: 0.92
      },
      {
        name: 'aws-rds',
        reason: 'Database component',
        confidence: 0.89
      }
    ]
  }
};
