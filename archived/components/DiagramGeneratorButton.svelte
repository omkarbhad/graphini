<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { generateDiagramStream, checkBackendHealth } from '$lib/util/diagramGenerator';
  import { updateCode } from '$lib/util/state';
  import { toast } from 'svelte-sonner';
  import { Loader2, Sparkles } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { errorToString } from '$lib/util/errorToString';

  let isOpen = $state(false);
  let isGenerating = $state(false);
  let backendAvailable = $state(false);
  let prompt = $state('');
  let diagramType = $state('flowchart');
  let complexity = $state<'simple' | 'medium' | 'complex' | 'large'>('medium');
  let generationStatus = $state<string>('');
  let generationProgress = $state<number>(0);
  let generatedMetadata = $state<{
    nodes?: number;
    edges?: number;
    subgraphs?: number;
    time?: number;
  } | null>(null);

  const diagramTypeOptions = [
    { value: 'flowchart', label: 'Flowchart' },
    { value: 'sequence', label: 'Sequence' },
    { value: 'class', label: 'Class' },
    { value: 'state', label: 'State' },
    { value: 'er', label: 'ER Diagram' },
    { value: 'gantt', label: 'Gantt' },
    { value: 'pie', label: 'Pie' },
    { value: 'journey', label: 'Journey' },
    { value: 'mindmap', label: 'Mindmap' }
  ];

  const complexityOptions: { value: typeof complexity; label: string }[] = [
    { value: 'simple', label: 'Simple (5-10 nodes)' },
    { value: 'medium', label: 'Medium (15-30 nodes)' },
    { value: 'complex', label: 'Complex (30-60 nodes)' },
    { value: 'large', label: 'Large (60+ nodes)' }
  ];

  // Check backend health when dialog opens
  async function checkHealth() {
    backendAvailable = await checkBackendHealth();
    if (!backendAvailable) {
      toast.error('Python backend is not available. Please start the backend server.');
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!backendAvailable) {
      toast.error('Python backend is not available');
      return;
    }

    isGenerating = true;
    generationProgress = 0;
    generationStatus = 'Preparing request...';
    generatedMetadata = null;

    try {
      // Step 1: Sending request
      generationProgress = 10;
      generationStatus = 'Sending request to backend...';
      await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay for UI update

      console.debug('Generating diagram with streaming', {
        prompt: prompt.trim(),
        diagramType,
        complexity
      });

      // Step 2: Streaming generation
      generationProgress = 30;
      generationStatus = 'AI is generating your diagram...';

      const startTime = Date.now();
      let accumulatedCode = '';

      const result = await generateDiagramStream(
        {
          prompt: prompt.trim(),
          diagramType: diagramType as
            | 'flowchart'
            | 'sequence'
            | 'class'
            | 'state'
            | 'er'
            | 'gantt'
            | 'pie'
            | 'journey'
            | 'mindmap',
          complexity
        },
        (chunk: string, complete: boolean) => {
          if (complete) {
            // Complete code received
            accumulatedCode = chunk;
            generationProgress = 95;
            generationStatus = 'Finalizing diagram...';
          } else {
            // Partial chunk received
            accumulatedCode += chunk;
            generationProgress = Math.min(90, generationProgress + 1);
            generationStatus = 'Streaming diagram code...';
          }

          // Update editor in real-time with accumulated code
          updateCode(accumulatedCode, { updateDiagram: true });
        }
      );

      // Step 3: Complete
      generationProgress = 100;
      generationStatus = 'Complete!';

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Store metadata for display
      if (result.metadata) {
        generatedMetadata = {
          nodes: result.metadata.node_count as number,
          edges: result.metadata.edge_count as number,
          subgraphs: result.metadata.subgraph_count as number,
          time: result.generation_time as number
        };
      }

      toast.success(`Diagram generated successfully in ${elapsedTime}s`);

      // Keep dialog open for 2 seconds to show success with metadata, then auto-close
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Close dialog and reset
      isOpen = false;
      prompt = '';
      isGenerating = false;
      generationStatus = '';
      generationProgress = 0;
      generatedMetadata = null;
    } catch (error) {
      console.error('Failed to generate diagram:', error);
      generationStatus = 'Generation failed';
      generationProgress = 0;
      const errorMessage = errorToString(error, 'Failed to generate diagram');
      toast.error(errorMessage);
      isGenerating = false;
    }
  }

  // Check health when dialog opens
  $effect(() => {
    if (isOpen) {
      checkHealth();
    }
  });
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger>
    <Button variant="outline" size="sm">
      <Sparkles class="mr-2 size-4" />
      Generate Large Diagram
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Generate Large Diagram</Dialog.Title>
      <Dialog.Description>
        Use AI to generate large, complex Mermaid diagrams via Python backend
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="prompt">Prompt</Label>
        <Input
          id="prompt"
          placeholder="e.g., Create a system architecture with microservices..."
          bind:value={prompt}
          disabled={isGenerating || !backendAvailable} />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="diagram-type">Diagram Type</Label>
          <select
            id="diagram-type"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            bind:value={diagramType}
            disabled={isGenerating || !backendAvailable}>
            {#each diagramTypeOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <Label for="complexity">Complexity</Label>
          <select
            id="complexity"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            bind:value={complexity}
            disabled={isGenerating || !backendAvailable}>
            {#each complexityOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if !backendAvailable && isOpen}
        <div class="rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
          ⚠️ Python backend is not available. Make sure the backend server is running.
        </div>
      {/if}

      {#if isGenerating}
        <div class="space-y-3 rounded-lg border bg-muted/50 p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{generationStatus}</span>
            <span class="text-xs text-muted-foreground">{generationProgress}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full bg-primary transition-all duration-300 ease-out"
              style="width: {generationProgress}%">
            </div>
          </div>
          {#if generatedMetadata}
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div class="text-center">
                <div class="font-semibold">{generatedMetadata.nodes ?? 0}</div>
                <div class="text-muted-foreground">Nodes</div>
              </div>
              <div class="text-center">
                <div class="font-semibold">{generatedMetadata.edges ?? 0}</div>
                <div class="text-muted-foreground">Edges</div>
              </div>
              <div class="text-center">
                <div class="font-semibold">{generatedMetadata.subgraphs ?? 0}</div>
                <div class="text-muted-foreground">Subgraphs</div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          if (!isGenerating) {
            isOpen = false;
            generationStatus = '';
            generationProgress = 0;
            generatedMetadata = null;
          }
        }}
        disabled={isGenerating}>
        {#if isGenerating}
          Cancel (disabled)
        {:else}
          Cancel
        {/if}
      </Button>
      <Button
        onclick={handleGenerate}
        disabled={isGenerating || !backendAvailable || !prompt.trim()}>
        {#if isGenerating}
          <Loader2 class="mr-2 size-4 animate-spin" />
          {generationStatus || 'Generating...'}
        {:else}
          <Sparkles class="mr-2 size-4" />
          Generate
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
