<script lang="ts">
  import {
    Loader2,
    Check,
    AlertCircle,
    Eye,
    Edit3,
    Sparkles,
    Trash2,
    GitBranch
  } from 'lucide-svelte';
  import type { DiagramEditorOperation, TaskStatus } from './types';
  import { getOperationIconColor } from './types';

  interface Props {
    operation: DiagramEditorOperation;
    status: TaskStatus;
    progress?: number;
    message?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    operation,
    status,
    progress = 0,
    message = '',
    showIcon = true,
    size = 'md'
  }: Props = $props();

  function getIcon(op: DiagramEditorOperation) {
    switch (op) {
      case 'read':
        return Eye;
      case 'create':
        return Sparkles;
      case 'update':
        return Edit3;
      case 'clear':
        return Trash2;
      case 'patch':
        return GitBranch;
      default:
        return Edit3;
    }
  }

  function getSizeClasses(s: 'sm' | 'md' | 'lg') {
    switch (s) {
      case 'sm':
        return { icon: 'size-3', text: 'text-xs', container: 'gap-1.5' };
      case 'md':
        return { icon: 'size-4', text: 'text-sm', container: 'gap-2' };
      case 'lg':
        return { icon: 'size-5', text: 'text-base', container: 'gap-2.5' };
    }
  }

  const IconComponent = $derived(getIcon(operation));
  const iconColor = $derived(getOperationIconColor(operation));
  const sizeClasses = $derived(getSizeClasses(size));
</script>

<div class="flex items-center {sizeClasses.container}">
  {#if showIcon}
    <div class="relative flex-shrink-0">
      {#if status === 'in-progress'}
        <div class="relative">
          <svelte:component
            this={IconComponent}
            class="{sizeClasses.icon} {iconColor} animate-pulse" />
          <div
            class="absolute inset-0 {sizeClasses.icon} rounded-full {iconColor.replace(
              'text-',
              'bg-'
            )}/20 animate-ping">
          </div>
        </div>
      {:else if status === 'complete'}
        <Check class="{sizeClasses.icon} text-green-500" />
      {:else if status === 'error'}
        <AlertCircle class="{sizeClasses.icon} text-red-500" />
      {:else}
        <svelte:component this={IconComponent} class="{sizeClasses.icon} text-muted-foreground" />
      {/if}
    </div>
  {/if}

  <div class="min-w-0 flex-1">
    {#if status === 'in-progress'}
      <div class="flex items-center gap-2">
        <Loader2 class="{sizeClasses.icon} animate-spin {iconColor}" />
        {#if message}
          <span class="{sizeClasses.text} animate-pulse truncate text-muted-foreground"
            >{message}</span>
        {/if}
        {#if progress > 0}
          <span class="{sizeClasses.text} text-muted-foreground tabular-nums">{progress}%</span>
        {/if}
      </div>
    {:else if status === 'complete'}
      <span class="{sizeClasses.text} text-green-600 dark:text-green-400">
        {message || 'Completed'}
      </span>
    {:else if status === 'error'}
      <span class="{sizeClasses.text} truncate text-red-600 dark:text-red-400">
        {message || 'Error occurred'}
      </span>
    {:else}
      <span class="{sizeClasses.text} text-muted-foreground">
        {message || 'Pending'}
      </span>
    {/if}
  </div>
</div>
