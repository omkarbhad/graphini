<script lang="ts" module>
  import { getContext, setContext } from 'svelte';

  const SWITCH_CONTEXT_KEY = Symbol('switch-toggle');

  export interface SwitchToggleContext {
    value: string;
    setValue: (value: string) => void;
    size: 'small' | 'medium' | 'large';
  }

  export function setSwitchToggleContext(context: SwitchToggleContext) {
    setContext(SWITCH_CONTEXT_KEY, context);
  }

  export function getSwitchToggleContext(): SwitchToggleContext {
    return getContext(SWITCH_CONTEXT_KEY);
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    value?: string;
    onValueChange?: (value: string) => void;
    size?: 'small' | 'medium' | 'large';
    class?: string;
    children?: import('svelte').Snippet;
  }

  let {
    value = $bindable(''),
    onValueChange,
    size = 'medium',
    class: className,
    children
  }: Props = $props();

  function handleValueChange(newValue: string) {
    value = newValue;
    onValueChange?.(newValue);
  }

  setSwitchToggleContext({
    get value() {
      return value;
    },
    setValue: handleValueChange,
    size
  });
</script>

<div
  class={cn(
    'flex items-stretch gap-0.5 border border-border bg-background p-0.5',
    size === 'small' && 'h-8 rounded-md',
    size === 'medium' && 'h-10 rounded-md',
    size === 'large' && 'h-12 rounded-lg',
    className
  )}>
  {@render children?.()}
</div>
