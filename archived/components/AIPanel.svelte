<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Switch from '$lib/components/ui/switch/switch.svelte';
  import { aiSettingsStore, type PromptMode } from '$lib/stores/aiSettings';

  interface ModelOption {
    id: string;
    name: string;
  }

  const MODEL_OPTIONS: ModelOption[] = [{ id: 'gpt-5-nano', name: 'GPT-5 Nano' }];

  let memoryNote = $state('');
  let selectedModelId = $state('');
  let autoToolCalls = $state(true);
  let enableMemory = $state(true);

  $effect(() => {
    const s = $aiSettingsStore;
    if (selectedModelId !== s.selectedModelId) selectedModelId = s.selectedModelId;
    if (autoToolCalls !== s.autoToolCalls) autoToolCalls = s.autoToolCalls;
    if (enableMemory !== s.enableMemory) enableMemory = s.enableMemory;
  });

  $effect(() => {
    if (!selectedModelId) return;
    if (selectedModelId !== $aiSettingsStore.selectedModelId) {
      aiSettingsStore.setSelectedModelId(selectedModelId);
    }
  });

  $effect(() => {
    if (autoToolCalls !== $aiSettingsStore.autoToolCalls) {
      aiSettingsStore.setAutoToolCalls(autoToolCalls);
    }
  });

  $effect(() => {
    if (enableMemory !== $aiSettingsStore.enableMemory) {
      aiSettingsStore.setEnableMemory(enableMemory);
    }
  });

  function handlePromptModeChange(value: PromptMode) {
    aiSettingsStore.setPromptMode(value);
  }

  async function handleSaveMemoryNote() {
    if (!memoryNote.trim()) return;

    try {
      // TODO: Implement per-user memory persistence
      console.log('Saving memory note:', memoryNote);
      // Placeholder: in the next step we'll persist to per-user memory/embeddings
      // via the chat memory endpoints keyed by user email.
      memoryNote = '';
    } catch (error) {
      console.error('Failed to save memory note:', error);
    }
  }
</script>

<div class="flex h-full flex-col gap-4 p-3">
  <!-- Header -->
  <div class="border-b border-border pb-2">
    <div class="text-sm font-medium text-foreground">AI Settings</div>
  </div>

  <!-- Controls -->
  <div class="flex-1 space-y-4">
    <!-- Model -->
    <div class="space-y-2">
      <label for="model-select" class="text-xs font-medium text-muted-foreground">Model</label>
      <select
        id="model-select"
        class="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-primary/30 focus:outline-none"
        bind:value={selectedModelId}>
        {#each MODEL_OPTIONS as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
    </div>

    <!-- Mode -->
    <div class="space-y-2">
      <fieldset>
        <legend class="text-xs font-medium text-muted-foreground">Mode</legend>
        <div class="flex gap-1">
          <Button
            type="button"
            variant={$aiSettingsStore.promptMode === 'plan' ? 'default' : 'ghost'}
            size="sm"
            onclick={() => handlePromptModeChange('plan')}
            class="h-7 px-2 py-1 text-xs">
            Plan
          </Button>
          <Button
            type="button"
            variant={$aiSettingsStore.promptMode === 'create' ? 'default' : 'ghost'}
            size="sm"
            onclick={() => handlePromptModeChange('create')}
            class="h-7 px-2 py-1 text-xs">
            Create
          </Button>
        </div>
      </fieldset>
    </div>

    <!-- Options -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-foreground">Auto tool calls</span>
        <Switch bind:checked={autoToolCalls} />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-foreground">Memory</span>
        <Switch bind:checked={enableMemory} />
      </div>
    </div>

    <!-- Memory Note -->
    {#if enableMemory}
      <div class="space-y-2">
        <label for="memory-input" class="text-xs font-medium text-muted-foreground">Context</label>
        <Input
          id="memory-input"
          placeholder="Preferences for responses..."
          bind:value={memoryNote}
          class="h-8 text-xs" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onclick={handleSaveMemoryNote}
          disabled={!memoryNote.trim()}
          class="h-7 w-full text-xs">
          Save
        </Button>
      </div>
    {/if}
  </div>
</div>
