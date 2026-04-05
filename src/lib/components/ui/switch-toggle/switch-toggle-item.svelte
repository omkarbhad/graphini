<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { getSwitchToggleContext } from './switch-toggle.svelte';

  interface Props {
    value: string;
    label?: string;
    disabled?: boolean;
    class?: string;
    icon?: import('svelte').Snippet;
  }

  let { value, label, disabled = false, class: className, icon }: Props = $props();

  const context = getSwitchToggleContext();
  const checked = $derived(value === context.value);
  const size = $derived(context.size);

  function handleClick() {
    if (!disabled) {
      context.setValue(value);
    }
  }
</script>

<button
  type="button"
  class={cn('flex h-full flex-1', disabled && 'pointer-events-none cursor-not-allowed')}
  onclick={handleClick}
  {disabled}>
  <span
    class={cn(
      'flex flex-1 cursor-pointer items-center justify-center rounded-md font-sans font-medium duration-150',
      checked ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
      disabled && 'text-muted-foreground/50',
      !icon && size === 'small' && 'px-3 text-sm',
      !icon && size === 'medium' && 'px-3 text-sm',
      !icon && size === 'large' && 'px-4 text-base',
      icon && size === 'small' && 'px-2 py-1',
      icon && size === 'medium' && 'px-3 py-2',
      icon && size === 'large' && 'p-3',
      className
    )}>
    {#if icon}
      <span class={cn(size === 'large' && 'scale-125')}>
        {@render icon()}
      </span>
    {:else}
      {label}
    {/if}
  </span>
</button>
