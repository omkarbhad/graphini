<script lang="ts">
  import type { ChatMessage } from '$lib/chat/types';
  import { chatService } from '$lib/chat/chat-service';
  import { updateCode } from '$lib/util/state';
  import { Button } from '$lib/components/ui/button';
  import { Copy, Code2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface Props {
    message: ChatMessage;
  }

  let { message }: Props = $props();

  let showCode = $state(false);
  let mermaidCode = $derived(chatService.extractMermaidCode(message.content));

  function toggleCode() {
    showCode = !showCode;
  }

  function applyToEditor() {
    if (mermaidCode) {
      updateCode(mermaidCode, { updateDiagram: true, resetPanZoom: false });
      toast.success('Diagram applied to editor');
    }
  }

  async function copyCode() {
    if (mermaidCode) {
      await navigator.clipboard.writeText(mermaidCode);
      toast.success('Code copied to clipboard');
    }
  }
</script>

<div
  class="message"
  class:user={message.role === 'user'}
  class:assistant={message.role === 'assistant'}>
  <div class="message-content">
    <div class="message-text">
      {message.content}
    </div>

    {#if message.role === 'assistant' && mermaidCode}
      <div class="message-actions">
        <Button variant="ghost" size="sm" onclick={toggleCode}>
          <Code2 class="mr-1 h-4 w-4" />
          {showCode ? 'Hide' : 'Show'} Code
        </Button>
        <Button variant="ghost" size="sm" onclick={applyToEditor}>Apply to Editor</Button>
        <Button variant="ghost" size="sm" onclick={copyCode}>
          <Copy class="mr-1 h-4 w-4" />
          Copy
        </Button>
      </div>

      {#if showCode}
        <pre class="code-block"><code>{mermaidCode}</code></pre>
      {/if}
    {/if}
  </div>
</div>

<style>
  .message {
    display: flex;
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .message.user {
    background-color: hsl(var(--primary) / 0.1);
    margin-left: 2rem;
  }

  .message.assistant {
    background-color: hsl(var(--muted));
    margin-right: 2rem;
  }

  .message-content {
    flex: 1;
  }

  .message-text {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .message-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .code-block {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background-color: hsl(var(--background));
    border-radius: 0.375rem;
    overflow-x: auto;
    font-size: 0.875rem;
  }
</style>
