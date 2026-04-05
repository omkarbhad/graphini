<script lang="ts">
  import type { Message } from '$lib/stores/chat-store';
  import { Button } from '$lib/components/ui/button';
  import { Sparkles, Code2, Loader2 } from 'lucide-svelte';

  interface Props {
    message: Message;
    isExpanded?: boolean;
    onToggleExpanded?: (messageId: string) => void;
    onSyncDiagram?: (mermaidCode: string, messageId: string) => void;
  }

  let { message, isExpanded = false, onToggleExpanded, onSyncDiagram }: Props = $props();

  // Extract Mermaid code from message
  function extractMermaidCode(msg: Message): string | null {
    const text = msg.content || '';
    const match = text.match(/```mermaid\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  const mermaidCode = $derived(extractMermaidCode(message));
  const isUser = $derived(message.role === 'user');
  const isAssistant = $derived(message.role === 'assistant');

  function handleToggleExpanded(): void {
    onToggleExpanded?.(message.id);
  }

  function handleSyncDiagram(): void {
    if (mermaidCode) {
      onSyncDiagram?.(mermaidCode, message.id);
    }
  }
</script>

<div class="flex gap-3 {isUser ? 'justify-end' : 'justify-start'}">
  <!-- Avatar -->
  <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
    {#if isUser}
      <span class="text-xs font-medium">U</span>
    {:else}
      <Sparkles class="h-4 w-4 text-primary" />
    {/if}
  </div>

  <!-- Message Content -->
  <div class="max-w-[70%] space-y-2">
    <div class="rounded-lg border bg-card p-3">
      <div class="text-sm whitespace-pre-wrap">{message.content}</div>

      <!-- Mermaid Diagram Preview -->
      {#if mermaidCode}
        <div class="mt-2 rounded border bg-muted/50 p-2">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">Mermaid Diagram</span>
            <Button variant="ghost" size="sm" onclick={handleSyncDiagram} class="h-6 px-2 text-xs">
              <Code2 class="mr-1 h-3 w-3" />
              Use This
            </Button>
          </div>
          <pre class="overflow-x-auto text-xs">{mermaidCode}</pre>
        </div>
      {/if}
    </div>

    <!-- Message Actions -->
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
      {#if isAssistant}
        <Button variant="ghost" size="sm" onclick={handleToggleExpanded} class="h-6 px-2">
          {isExpanded ? 'Hide' : 'Show'} Code
        </Button>
      {/if}
    </div>
  </div>
</div>
