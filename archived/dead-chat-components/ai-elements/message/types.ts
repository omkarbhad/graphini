import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

// Simple type helper for element refs
type WithElementRef<T> = T & { ref?: HTMLElement | null };

export interface MessageProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  children?: Snippet;
  from?: 'user' | 'assistant';
}

export interface MessageContentProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  children?: Snippet;
}

export interface MessageAvatarProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  src?: string;
  name?: string;
  fallback?: string;
}
