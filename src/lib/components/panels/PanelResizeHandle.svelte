<script lang="ts">
  interface Props {
    onResize: (deltaX: number) => void;
    position?: 'left' | 'right';
  }

  let { onResize, position = 'right' }: Props = $props();

  let isResizing = $state(false);
  let startX = 0;

  function handleMouseDown(e: MouseEvent) {
    isResizing = true;
    startX = e.clientX;
    e.preventDefault();

    // Add a full-screen overlay to prevent iframes/canvas from stealing mouse events
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:ew-resize;';
    document.body.appendChild(overlay);

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      startX = e.clientX;
      onResize(position === 'right' ? delta : -delta);
    };

    const handleMouseUp = () => {
      isResizing = false;
      overlay.remove();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="group absolute top-0 z-20 h-full w-2 cursor-ew-resize transition-colors hover:bg-primary/20 {isResizing
    ? 'bg-primary/30'
    : 'bg-transparent'} {position === 'right' ? '-right-1' : '-left-1'}"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panel"
  onmousedown={handleMouseDown}>
  <!-- Visible drag indicator on hover -->
  <div
    class="absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 {position ===
    'right'
      ? 'right-0'
      : 'left-0'}">
    <div class="flex h-8 w-1 items-center justify-center rounded-full bg-primary/60"></div>
  </div>
</div>
