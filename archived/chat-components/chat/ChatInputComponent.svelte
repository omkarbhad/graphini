<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { ArrowUp, Loader2 } from 'lucide-svelte';

  interface Props {
    disabled?: boolean;
    streaming?: boolean;
    onSend?: (message: string) => void;
    onClear?: () => void;
  }

  let { disabled = false, streaming = false, onSend, onClear }: Props = $props();

  let messageText = $state('');
  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function handleSend(): void {
    if (messageText.trim() && !disabled && !streaming && onSend) {
      onSend(messageText.trim());
      messageText = '';
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  // Auto-resize textarea
  $effect(() => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = `${textareaRef.scrollHeight}px`;
    }
  });
</script>

<div class="border-t p-4">
  <div class="flex gap-2">
    <textarea
      bind:this={textareaRef}
      bind:value={messageText}
      onkeydown={handleKeydown}
      placeholder="Type your message..."
      disabled={disabled || streaming}
      class="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      rows="3" />

    <div class="flex flex-col gap-2">
      <Button
        onclick={handleSend}
        disabled={!messageText.trim() || disabled || streaming}
        size="sm"
        class="px-3">
        {#if streaming}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <ArrowUp class="h-4 w-4" />
        {/if}
      </Button>

      {#if onClear}
        <Button
          variant="outline"
          onclick={onClear}
          disabled={disabled || streaming}
          size="sm"
          class="px-3">
          Clear
        </Button>
      {/if}
    </div>
  </div>
</div>

<style>
  textarea {
    min-height: 3rem;
    max-height: 10rem;
    field-sizing: content;
  }
</style>
