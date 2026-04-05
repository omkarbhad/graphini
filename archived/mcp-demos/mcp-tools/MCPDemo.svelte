<script lang="ts">
  import { MCPTool } from './MCPTool.svelte';
  import { MCP_TOOL_NAMES } from './index.js';

  let demoTools = $state([
    {
      toolName: MCP_TOOL_NAMES.SEARCH_ICONS,
      state: 'output-available' as const,
      input: { query: 'database', provider: 'aws' },
      output: {
        type: 'icon-search-results',
        count: 3,
        icons: [
          {
            name: 'aws-rds',
            category: 'database',
            path: '/icons/aws/database/database-rds.svg',
            confidence: 0.95
          },
          {
            name: 'aws-dynamodb',
            category: 'database',
            path: '/icons/aws/database/database-dynamodb.svg',
            confidence: 0.92
          },
          {
            name: 'aws-aurora',
            category: 'database',
            path: '/icons/aws/database/database-aurora.svg',
            confidence: 0.88
          }
        ]
      }
    },
    {
      toolName: MCP_TOOL_NAMES.VALIDATE_ICON_REFERENCE,
      state: 'output-available' as const,
      input: { icon_name: 'aws-ec2', provider: 'aws' },
      output: {
        type: 'validation-result',
        valid: true,
        iconPath: '/icons/aws/compute/compute-ec2.svg'
      }
    },
    {
      toolName: MCP_TOOL_NAMES.SUGGEST_ICONS_FOR_CONTEXT,
      state: 'output-available' as const,
      input: { description: 'web application with database', diagramType: 'architecture' },
      output: {
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
          },
          {
            name: 'aws-s3',
            reason: 'Storage component',
            confidence: 0.85
          }
        ]
      }
    }
  ]);
</script>

<div class="space-y-6 p-6">
  <div class="mb-6">
    <h2 class="mb-2 text-2xl font-bold">MCP Tool Visualization Demo</h2>
    <p class="text-muted-foreground">
      This demonstrates how MCP (Model Context Protocol) tool operations will appear in the chat
      interface. These tools help the AI fetch and validate icons before creating diagrams.
    </p>
  </div>

  {#each demoTools as tool (tool.toolName)}
    <MCPTool toolName={tool.toolName} state={tool.state} input={tool.input} output={tool.output} />
  {/each}

  <div class="mt-8 rounded-lg bg-muted/50 p-4">
    <h3 class="mb-2 font-semibold">How This Works:</h3>
    <ol class="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
      <li>AI analyzes user request (e.g., "Create a web app with database")</li>
      <li>AI calls MCP tools to search for relevant icons</li>
      <li>Users see the icon search process in real-time</li>
      <li>AI validates that all icons exist before using them</li>
      <li>Final diagram is created with verified, hallucination-free icons</li>
    </ol>
  </div>
</div>
