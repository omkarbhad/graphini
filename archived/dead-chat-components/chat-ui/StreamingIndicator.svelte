<script lang="ts">
  import { Loader2, Brain } from 'lucide-svelte';

  interface Props {
    message?: string;
    showIcon?: boolean;
    class?: string;
  }

  let { message = 'AI is thinking...', showIcon = true, class: className = '' }: Props = $props();

  let dots = $state('');

  // Animate dots
  $: if (dots.length >= 3) {
    dots = '';
  } else {
    dots += '.';
  }

  // Update dots every 500ms
  let interval: number;

  $effect(() => {
    interval = setInterval(() => {
      if (dots.length >= 3) {
        dots = '';
      } else {
        dots += '.';
      }
    }, 500);

    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<div class="streaming-indicator {className}">
  {#if showIcon}
    <div class="icon-container">
      <Brain class="brain-icon" />
      <Loader2 class="spinner-icon" />
    </div>
  {/if}

  <div class="message-container">
    <span class="message-text">{message}{dots}</span>
  </div>
</div>

<style>
  .streaming-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: hsl(var(--muted) / 50);
    border: 1px solid hsl(var(--border));
    border-radius: 0.75rem;
    margin: 0.5rem 0;
  }

  .icon-container {
    position: relative;
    width: 24px;
    height: 24px;
  }

  .brain-icon {
    width: 20px;
    height: 20px;
    color: hsl(var(--primary));
    position: absolute;
    top: 2px;
    left: 2px;
  }

  .spinner-icon {
    width: 16px;
    height: 16px;
    color: hsl(var(--primary));
    position: absolute;
    top: 4px;
    left: 4px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .message-container {
    flex: 1;
  }

  .message-text {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }
</style>
