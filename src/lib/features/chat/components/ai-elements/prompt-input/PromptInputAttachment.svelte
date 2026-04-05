<script lang="ts">
  import { cn } from '$lib/util';
  import { getAttachmentsContext, type FileWithId } from './attachments-context.svelte.js';

  interface Props {
    data: FileWithId;
    class?: string;
  }

  let { data, class: className, ...props }: Props = $props();

  let attachments = getAttachmentsContext();

  let isImage = $derived(data.mediaType?.startsWith('image/') && data.url);
  let fileExt = $derived.by(() => {
    const name = data.filename || '';
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : '?';
  });

  // File type color mapping for extension badges
  let extColor = $derived.by(() => {
    const ext = fileExt.toLowerCase();
    if (ext === 'pdf')
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-500/20',
        icon: 'text-red-500'
      };
    if (['doc', 'docx', 'rtf'].includes(ext))
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
        icon: 'text-blue-500'
      };
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        icon: 'text-emerald-500'
      };
    if (['json', 'xml', 'yaml', 'yml', 'toml'].includes(ext))
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
        icon: 'text-amber-500'
      };
    if (['js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'cpp', 'c', 'h'].includes(ext))
      return {
        bg: 'bg-violet-500/15',
        text: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/20',
        icon: 'text-violet-500'
      };
    if (['md', 'txt', 'log'].includes(ext))
      return {
        bg: 'bg-slate-500/15',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-500/20',
        icon: 'text-slate-500'
      };
    if (['svg', 'html', 'css'].includes(ext))
      return {
        bg: 'bg-orange-500/15',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-500/20',
        icon: 'text-orange-500'
      };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext))
      return {
        bg: 'bg-violet-500/15',
        text: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/20',
        icon: 'text-violet-500'
      };
    return {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
      icon: 'text-muted-foreground'
    };
  });

  // File type SVG icon path
  let fileIconPath = $derived.by(() => {
    const ext = fileExt.toLowerCase();
    if (ext === 'pdf')
      return 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2zm5-16v4h4M9 13h6M9 17h4';
    if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
      return 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2zm5-16v4h4M9 13h6M9 17h6M9 9h1';
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2zm5-16v4h4M9 13l2 2 4-4';
    if (['json', 'xml', 'yaml', 'yml'].includes(ext))
      return 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2zm5-16v4h4M10 13l-2 2 2 2M14 13l2 2-2 2';
    return 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2zm5-16v4h4';
  });
</script>

{#if isImage}
  <!-- Image: thumbnail -->
  <div
    class={cn(
      'group relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl border border-border/60 transition-all duration-200 hover:border-border',
      className
    )}
    {...props}>
    <img alt={data.filename || 'attachment'} class="h-full w-full object-cover" src={data.url} />
    <div
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pt-3 pb-1">
      <span class="block truncate text-[9px] font-medium text-white/90"
        >{data.filename || 'Image'}</span>
    </div>
    <button
      aria-label="Remove attachment"
      class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all duration-150 group-hover:opacity-100 hover:scale-110 hover:bg-red-500"
      onclick={() => attachments.remove(data.id)}
      type="button">
      <svg
        class="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{:else}
  <!-- Document: square card matching image size -->
  <div
    class={cn(
      'group relative flex h-[72px] w-[72px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-border dark:bg-card/80',
      className
    )}
    {...props}>
    <!-- File type icon -->
    <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg {extColor.bg}">
      <svg
        class="h-4 w-4 {extColor.icon}"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d={fileIconPath} />
      </svg>
    </div>
    <!-- File name + ext -->
    <div class="w-full px-1.5 text-center">
      <span class="block truncate text-[8px] leading-tight font-semibold text-foreground/80"
        >{data.filename || 'File'}</span>
      <span
        class="mt-0.5 inline-flex rounded px-1 py-0 text-[7px] font-bold tracking-wide {extColor.bg} {extColor.text}"
        >{fileExt}</span>
    </div>
    <!-- Remove button -->
    <button
      aria-label="Remove attachment"
      class="absolute top-1 right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground opacity-0 transition-all duration-150 group-hover:opacity-100 hover:scale-110 hover:bg-red-500 hover:text-white"
      onclick={() => attachments.remove(data.id)}
      type="button">
      <svg class="h-2 w-2" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
