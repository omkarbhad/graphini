<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { MCPDemoSimple } from './index.js';

  let showDemo = $state(false);

  function triggerMCPTools() {
    // This would simulate MCP tool calls in a real scenario
    console.log('MCP Tools would be triggered here');
    showDemo = true;
  }
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <h1 class="mb-4 text-3xl font-bold">MCP Tool Testing</h1>
    <div class="space-y-4">
      <p class="text-muted-foreground">
        The MCP Tool visualization system is ready, but the current AI system needs to be configured
        to use MCP tools instead of the existing icon system.
      </p>

      <div
        class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <h3 class="mb-2 font-semibold text-blue-900 dark:text-blue-100">Current Status:</h3>
        <ul class="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>✅ MCP Tool components are built and working</li>
          <li>✅ Chat integration is ready</li>
          <li>⚠️ AI system needs MCP server configuration</li>
          <li>⚠️ Tool calls need to be routed through MCP</li>
        </ul>
      </div>

      <div
        class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <h3 class="mb-2 font-semibold text-green-900 dark:text-green-100">What's Working:</h3>
        <ul class="list-inside list-disc space-y-1 text-sm text-green-800 dark:text-green-200">
          <li>✅ MCPTool component displays tool operations</li>
          <li>✅ MCPIconResults shows icon search results</li>
          <li>✅ MCPOutput formats different tool outputs</li>
          <li>✅ Chat.svelte detects and displays MCP tools</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="space-y-6">
    <Button onclick={triggerMCPTools}>Show MCP Tool Demo</Button>

    {#if showDemo}
      <div class="border-t pt-6">
        <h2 class="mb-4 text-xl font-semibold">MCP Tool Visualization Demo</h2>
        <MCPDemoSimple />
      </div>
    {/if}
  </div>

  <div class="mt-8 rounded-lg bg-muted/50 p-4">
    <h3 class="mb-2 font-semibold">Next Steps to Enable MCP Tools:</h3>
    <ol class="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
      <li><strong>Configure MCP Server:</strong> Set up the MCP icon server in .vscode/mcp.json</li>
      <li>
        <strong>Update AI Prompts:</strong> Modify the AI system to call MCP tools before diagram creation
      </li>
      <li>
        <strong>Route Tool Calls:</strong> Ensure icon operations go through MCP instead of direct calls
      </li>
      <li>
        <strong>Test Integration:</strong> Verify MCP tools appear in chat during icon operations
      </li>
    </ol>
  </div>
</div>
