<script lang="ts">
  import { selectedElementStore } from '$/stores/selectedElement';
  import { inputStateStore } from '$/util/state';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import { Palette } from 'lucide-svelte';

  // Vercel color palette
  const vercelColors = [
    '#000000', // Black
    '#666666', // Gray
    '#0070F3', // Vercel blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#FFFFFF', // White
    '#F3F4F6' // Light gray
  ];

  let selectedColor = $state('#0070F3');
  let selectedNodeId = $state('');
  let selectedLinkIndex = $state('');
  let nodeIds = $state<string[]>([]);
  let linkCount = $state(0);
  let isOpen = $state(false);

  // Toggle popover open/close
  function togglePopover() {
    isOpen = !isOpen;
    if (isOpen) {
      parseCode();
    }
  }

  // Subscribe to selected element store
  $effect(() => {
    const selected = $selectedElementStore;
    if (selected.type === 'node' && selected.id) {
      selectedNodeId = selected.id;
      selectedLinkIndex = '';
    } else if (selected.type === 'edge' && selected.index !== null) {
      selectedLinkIndex = selected.index.toString();
      selectedNodeId = '';
    }
  });

  // Parse the current code to extract node IDs and link count
  function parseCode() {
    const currentCode = $inputStateStore.code;
    const lines = currentCode.split('\n');
    const foundNodes: string[] = [];
    let foundLinks = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Skip style definitions
      if (
        trimmed.startsWith('style ') ||
        trimmed.startsWith('linkStyle ') ||
        trimmed.startsWith('classDef ')
      ) {
        return;
      }

      // Extract node IDs - match patterns like A[text], B(text), C{text}, D((text)), E>text]
      const nodeMatches = trimmed.match(/\b([A-Za-z][A-Za-z0-9_]*)\s*[\[\(\{<>]/g);
      if (nodeMatches) {
        nodeMatches.forEach((match) => {
          const nodeId = match.replace(/[\[\(\{<>\s]/g, '');
          if (nodeId && !foundNodes.includes(nodeId)) {
            foundNodes.push(nodeId);
          }
        });
      }

      // Count links/edges
      if (
        trimmed.includes('-->') ||
        trimmed.includes('---') ||
        trimmed.includes('-.-') ||
        trimmed.includes('==>') ||
        trimmed.includes('-.->') ||
        trimmed.includes('--o') ||
        trimmed.includes('--x') ||
        trimmed.includes('<-->')
      ) {
        foundLinks++;
      }
    });

    nodeIds = foundNodes;
    linkCount = foundLinks;
  }

  // Apply color to a specific node
  function applyColorToNode(nodeId: string, color: string) {
    const currentCode = $inputStateStore.code;
    const lines = currentCode.split('\n');

    // Remove existing style for this node
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith(`style ${nodeId} `);
    });

    // Add new style at the end
    cleanedLines.push(`    style ${nodeId} fill:${color},stroke:${color},stroke-width:2px`);

    inputStateStore.update((state) => ({
      ...state,
      code: cleanedLines.join('\n'),
      updateDiagram: true
    }));
  }

  // Apply color to a specific link
  function applyColorToLink(linkIndex: number, color: string) {
    const currentCode = $inputStateStore.code;
    const lines = currentCode.split('\n');

    // Remove existing linkStyle for this index
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith(`linkStyle ${linkIndex} `);
    });

    // Add new linkStyle at the end
    cleanedLines.push(`    linkStyle ${linkIndex} stroke:${color},stroke-width:2px`);

    inputStateStore.update((state) => ({
      ...state,
      code: cleanedLines.join('\n'),
      updateDiagram: true
    }));
  }

  // Handle color selection - apply directly if element is selected
  function handleColorClick(color: string) {
    selectedColor = color;
    const selected = $selectedElementStore;
    if (selected.type === 'node' && selected.id) {
      applyColorToNode(selected.id, color);
      clearSelection();
    } else if (selected.type === 'edge' && selected.index !== null) {
      applyColorToLink(selected.index, color);
      clearSelection();
    }
  }

  // Insert style code snippet for user to customize
  function insertNodeStyle() {
    if (!selectedNodeId) return;
    applyColorToNode(selectedNodeId, selectedColor);
  }

  function insertLinkStyle() {
    const index = parseInt(selectedLinkIndex);
    if (isNaN(index) || index < 0) return;
    applyColorToLink(index, selectedColor);
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger onclick={togglePopover}>
    <Button variant="outline" size="sm" class="gap-2">
      <Palette class="size-4" />
      Colors
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-80 p-4" align="end" onInteractOutside={(e) => e.preventDefault()}>
    <div class="space-y-4">
      <div>
        <h4 class="mb-2 text-sm font-medium">Select Color</h4>
        <div class="grid grid-cols-6 gap-2">
          {#each vercelColors as color}
            <button
              class="h-8 w-8 rounded border-2 transition-colors {selectedColor === color
                ? 'border-blue-500 ring-2 ring-blue-300'
                : 'border-subtle hover:border-light'}"
              style="background-color: {color}"
              onclick={() => handleColorClick(color)}
              title={color} />
          {/each}
        </div>
      </div>

      <div>
        <label class="text-xs font-medium">Custom Color:</label>
        <div class="mt-1 flex gap-2">
          <input
            type="color"
            bind:value={selectedColor}
            class="border-subtle h-8 w-10 cursor-pointer rounded" />
          <input
            type="text"
            bind:value={selectedColor}
            placeholder="#000000"
            class="border-subtle flex-1 rounded px-2 py-1 text-xs" />
        </div>
      </div>

      {#if $selectedElementStore.type}
        <div
          class="border-subtle rounded border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950">
          <p class="text-xs font-medium text-blue-700 dark:text-blue-300">
            Selected: {$selectedElementStore.type === 'node'
              ? `Node "${$selectedElementStore.id}"`
              : `Edge ${$selectedElementStore.index}`}
          </p>
          <p class="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
            Click a color to apply, or click diagram background to deselect
          </p>
        </div>
      {/if}

      <div class="border-subtle border-t pt-3">
        <h4 class="mb-2 text-sm font-medium">Apply to Node</h4>
        <div class="flex gap-2">
          <select
            bind:value={selectedNodeId}
            class="border-subtle flex-1 rounded bg-background px-2 py-1.5 text-xs">
            <option value="">Select node...</option>
            {#each nodeIds as nodeId}
              <option value={nodeId}>{nodeId}</option>
            {/each}
          </select>
          <Button
            variant="outline"
            size="sm"
            onclick={insertNodeStyle}
            disabled={!selectedNodeId}
            class="text-xs">
            Apply
          </Button>
        </div>
        {#if nodeIds.length === 0}
          <p class="mt-1 text-xs text-muted-foreground">No nodes found in diagram</p>
        {/if}
      </div>

      <div class="border-subtle border-t pt-3">
        <h4 class="mb-2 text-sm font-medium">Apply to Edge</h4>
        <div class="flex gap-2">
          <select
            bind:value={selectedLinkIndex}
            class="border-subtle flex-1 rounded bg-background px-2 py-1.5 text-xs">
            <option value="">Select edge...</option>
            {#each Array.from({ length: linkCount }, (_, i) => i) as index}
              <option value={index.toString()}>Edge {index}</option>
            {/each}
          </select>
          <Button
            variant="outline"
            size="sm"
            onclick={insertLinkStyle}
            disabled={!selectedLinkIndex}
            class="text-xs">
            Apply
          </Button>
        </div>
        {#if linkCount === 0}
          <p class="mt-1 text-xs text-muted-foreground">No edges found in diagram</p>
        {:else}
          <p class="mt-1 text-xs text-muted-foreground">Found {linkCount} edge(s)</p>
        {/if}
      </div>

      <div class="border-t pt-3 text-xs text-muted-foreground">
        <p class="mb-1 font-medium">Manual Syntax:</p>
        <code class="block rounded bg-muted p-1 text-[10px]">style NodeId fill:#color</code>
        <code class="mt-1 block rounded bg-muted p-1 text-[10px]">linkStyle 0 stroke:#color</code>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>
