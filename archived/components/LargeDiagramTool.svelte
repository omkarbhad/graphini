<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Layers, Network, Settings, Zap } from 'lucide-svelte';

  export let onClose: () => void;
  export let onGenerate: (config: LargeDiagramConfig) => void;

  interface LargeDiagramConfig {
    prompt: string;
    diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt';
    complexity: 'medium' | 'large' | 'complex';
  }

  let prompt = '';
  let diagramType: LargeDiagramConfig['diagramType'] = 'flowchart';
  let complexity: LargeDiagramConfig['complexity'] = 'large';
  let isGenerating = false;

  const diagramTypes = [
    {
      value: 'flowchart',
      label: 'Flowchart',
      icon: Network,
      description: 'Process flows and workflows'
    },
    {
      value: 'sequence',
      label: 'Sequence',
      icon: Layers,
      description: 'Interactions between components'
    },
    {
      value: 'class',
      label: 'Class',
      icon: Settings,
      description: 'Class structures and relationships'
    },
    { value: 'state', label: 'State', icon: Zap, description: 'State machines and transitions' },
    { value: 'er', label: 'ER Diagram', icon: Network, description: 'Database relationships' },
    { value: 'gantt', label: 'Gantt', icon: Layers, description: 'Project timelines' }
  ];

  const complexityLevels = [
    {
      value: 'medium',
      label: 'Medium',
      description: '15-30 nodes',
      color: 'bg-blue-500'
    },
    {
      value: 'large',
      label: 'Large',
      description: '30-60 nodes',
      color: 'bg-purple-500'
    },
    {
      value: 'complex',
      label: 'Complex',
      description: '60+ nodes',
      color: 'bg-red-500'
    }
  ];

  const examplePrompts = [
    'Create a comprehensive AWS architecture with EC2, S3, RDS, Lambda, and API Gateway',
    'Design a microservices workflow with authentication, data processing, and reporting',
    'Build an enterprise system with load balancers, databases, caching, and monitoring',
    'Create a complex e-commerce flow with user journey, payment processing, and inventory'
  ];

  function handleGenerate() {
    if (!prompt.trim()) {
      alert('Please enter a description for your diagram');
      return;
    }

    isGenerating = true;
    const config: LargeDiagramConfig = {
      prompt: prompt.trim(),
      diagramType,
      complexity
    };

    onGenerate(config);

    // Reset after a delay
    setTimeout(() => {
      isGenerating = false;
    }, 2000);
  }

  function useExample(examplePrompt: string) {
    prompt = examplePrompt;
  }
</script>

<div class="flex h-full flex-col border-l bg-background shadow-lg">
  <!-- Header -->
  <div class="flex items-center justify-between border-b p-4">
    <div class="flex items-center gap-2">
      <Zap class="size-4 text-purple-500" />
      <h3 class="font-medium">Large Diagram Tool</h3>
    </div>
    <Button variant="ghost" size="icon" onclick={onClose}>
      <Settings class="size-4" />
    </Button>
  </div>

  <!-- Content -->
  <div class="flex-1 space-y-6 overflow-auto p-4">
    <!-- Description -->
    <div
      class="rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-4">
      <h4 class="mb-2 text-sm font-medium">Generate Complex Diagrams</h4>
      <p class="text-xs text-muted-foreground">
        Use this tool to create large, complex diagrams with 15+ nodes. The system will use advanced
        layout algorithms and automatic node positioning for optimal readability.
      </p>
    </div>

    <!-- Diagram Type Selection -->
    <div>
      <h4 class="mb-3 text-sm font-medium">Diagram Type</h4>
      <div class="grid grid-cols-2 gap-2">
        {#each diagramTypes as type}
          <button
            class="flex flex-col items-center rounded-lg border-2 p-3 transition-all hover:scale-105 {diagramType ===
            type.value
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
              : 'border-gray-200 hover:border-gray-300'}"
            onclick={() => (diagramType = type.value)}>
            <type.icon
              class="mb-1 size-5 {diagramType === type.value
                ? 'text-purple-600'
                : 'text-gray-600'}" />
            <span class="text-xs font-medium">{type.label}</span>
            <span class="mt-1 text-[10px] text-muted-foreground">{type.description}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Complexity Selection -->
    <div>
      <h4 class="mb-3 text-sm font-medium">Complexity Level</h4>
      <div class="space-y-2">
        {#each complexityLevels as level}
          <button
            class="flex w-full items-center justify-between rounded-lg border-2 p-3 transition-all {complexity ===
            level.value
              ? 'border-gray-400 bg-gray-50 dark:bg-gray-900'
              : 'border-gray-200 hover:border-gray-300'}"
            onclick={() => (complexity = level.value)}>
            <div class="flex items-center gap-3">
              <div class="h-3 w-3 rounded-full {level.color}"></div>
              <div class="text-left">
                <span class="text-sm font-medium">{level.label}</span>
                <span class="ml-2 text-xs text-muted-foreground">{level.description}</span>
              </div>
            </div>
            {#if complexity === level.value}
              <div class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                <div class="h-2 w-2 rounded-full bg-white"></div>
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Prompt Input -->
    <div>
      <h4 class="mb-3 text-sm font-medium">Diagram Description</h4>
      <textarea
        bind:value={prompt}
        placeholder="Describe what you want to create in detail..."
        class="h-24 w-full resize-none rounded-lg border bg-background p-3 text-sm"></textarea>

      <!-- Example Prompts -->
      <div class="mt-3">
        <p class="mb-2 text-xs text-muted-foreground">Example prompts:</p>
        <div class="space-y-1">
          {#each examplePrompts as example}
            <button
              class="w-full rounded bg-muted p-2 text-left text-xs transition-colors hover:bg-muted/80"
              onclick={() => useExample(example)}>
              {example}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Generate Button -->
    <div class="border-t pt-4">
      <Button
        class="w-full"
        size="lg"
        onclick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}>
        {#if isGenerating}
          <div class="flex items-center gap-2">
            <div
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent">
            </div>
            Generating Large Diagram...
          </div>
        {:else}
          <div class="flex items-center gap-2">
            <Zap class="size-4" />
            Generate Large Diagram
          </div>
        {/if}
      </Button>

      <p class="mt-2 text-center text-xs text-muted-foreground">
        This may take a few seconds for complex diagrams
      </p>
    </div>

    <!-- Info Section -->
    <div
      class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
      <h5 class="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">What happens next?</h5>
      <ul class="space-y-1 text-[10px] text-blue-600 dark:text-blue-400">
        <li>• Advanced layout algorithm optimizes node positioning</li>
        <li>• AWS icons automatically injected when applicable</li>
        <li>• Color palette applied for better visualization</li>
        <li>• Large diagrams render with zoom controls</li>
      </ul>
    </div>
  </div>
</div>
