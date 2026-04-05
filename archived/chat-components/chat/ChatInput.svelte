<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { ArrowUp, Loader2 } from 'lucide-svelte';

  interface Props {
    value: string;
    disabled?: boolean;
    loading?: boolean;
    onSubmit: (message: string) => void;
  }

  let { value = $bindable(''), disabled = false, loading = false, onSubmit }: Props = $props();

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSubmit(trimmed);
    value = '';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const form = (e.currentTarget as HTMLTextAreaElement).form;
      form?.requestSubmit();
    }
  }
</script>

<form onsubmit={handleSubmit} class="chat-input-form">
  <div class="input-wrapper">
    <textarea
      bind:value
      onkeydown={handleKeyDown}
      placeholder="Ask me to create or modify a diagram..."
      rows="3"
      {disabled}
      class="chat-textarea"></textarea>
    <Button
      type="submit"
      size="icon"
      disabled={disabled || loading || !value.trim()}
      class="submit-button">
      {#if loading}
        <Loader2 class="h-5 w-5 animate-spin" />
      {:else}
        <ArrowUp class="h-5 w-5" />
      {/if}
    </Button>
  </div>
</form>

<style>
  .chat-input-form {
    padding: 1rem;
    border-top: 1px solid hsl(var(--border));
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .chat-textarea {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    resize: none;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .chat-textarea:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1);
  }

  .chat-textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-button {
    flex-shrink: 0;
  }
</style>
