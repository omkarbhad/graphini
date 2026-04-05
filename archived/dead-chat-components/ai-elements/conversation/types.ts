import type { ButtonProps } from '$lib/components/ui/button/index.js';
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

// Simple type helper for element refs
type WithElementRef<T> = T & { ref?: HTMLElement | null };

export interface ConversationProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  children?: Snippet;
  initial?: ScrollBehavior;
  resize?: ScrollBehavior;
}

export interface ConversationContentProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  children?: Snippet;
}

export interface ConversationEmptyStateProps
  extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
  title?: string;
  description?: string;
  icon?: Snippet;
  children?: Snippet;
}

export interface ConversationScrollButtonProps extends ButtonProps {}
