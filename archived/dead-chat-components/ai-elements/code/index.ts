import { tv, type VariantProps } from 'tailwind-variants';
import Root from './code.svelte';
import CopyButton from './CodeCopyButton.svelte';
import Overflow from './CodeOverflow.svelte';
import type { CodeCopyButtonProps, CodeRootProps } from './types';

export const codeVariants = tv({
  base: 'not-prose relative h-full overflow-auto rounded-lg border',
  variants: {
    variant: {
      default: 'border-border bg-card',
      secondary: 'bg-secondary/50 border-transparent'
    }
  }
});

export type CodeVariant = VariantProps<typeof codeVariants>['variant'];

export {
  CopyButton,
  Overflow,
  Root,
  type CodeCopyButtonProps as CopyButtonProps,
  type CodeRootProps as RootProps
};
