import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export interface TaskProps extends CollapsiblePrimitive.RootProps {
  class?: string;
  children?: Snippet;
}

export interface TaskContentProps extends CollapsiblePrimitive.ContentProps {
  children?: Snippet;
  class?: string;
}

export interface TaskItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: Snippet;
  class?: string;
}

export interface TaskItemFileProps extends HTMLAttributes<HTMLDivElement> {
  children?: Snippet;
  class?: string;
}

export interface TaskTriggerProps extends CollapsiblePrimitive.TriggerProps {
  title: string;
  class?: string;
  children?: Snippet;
}

export interface TaskStatusProps extends HTMLAttributes<HTMLDivElement> {
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  class?: string;
}

export interface TaskProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  class?: string;
}
