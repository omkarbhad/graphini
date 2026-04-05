<script lang="ts">
  import { cn } from '$lib/utils';
  import { CopyButton } from '../copy-button/index.js';
  import { useCodeCopyButton } from './code.svelte.js';
  import type { CodeCopyButtonProps } from './types';

  let { ref = $bindable(null), class: className, ...rest }: CodeCopyButtonProps = $props();

  const codeState = useCodeCopyButton();
</script>

<CopyButton
  bind:ref
  text={codeState.code}
  class={cn('absolute top-2 right-2 z-10', className)}
  {...rest} />
