<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Separator } from '$lib/components/ui/separator';
  import {
    AlertCircle,
    CheckCircle,
    Cpu,
    Edit2,
    Plus,
    Save,
    Server,
    Trash2,
    X,
    Zap
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Types
  interface Provider {
    id: string;
    label: string;
    baseUrl?: string;
    requiresApiKey: boolean;
    description?: string;
  }

  interface Model {
    id: string;
    label: string;
    category: string;
    toolSupport: boolean;
    description?: string;
    maxTokens?: number;
    costPerToken?: number;
    gemsPerMessage?: number;
    isFree?: boolean;
    isEnabled?: boolean;
    provider?: string;
  }

  // State
  let providers: Provider[] = [];
  let models: Model[] = [];
  let loading = false;
  let error = '';
  let success = '';

  // Dialog states
  let providerDialogOpen = false;
  let modelDialogOpen = false;
  let editingProvider: Provider | null = null;
  let editingModel: Model | null = null;
  let selectedProviderForModel = '';

  // Form states
  let providerForm: Partial<Provider> = {
    id: '',
    label: '',
    baseUrl: '',
    requiresApiKey: true,
    description: ''
  };

  let modelForm: Partial<Model> = {
    id: '',
    label: '',
    category: '',
    toolSupport: false,
    description: '',
    maxTokens: 4000,
    costPerToken: 0,
    gemsPerMessage: 2,
    isFree: false,
    isEnabled: true
  };

  // Load data
  async function loadProviders() {
    try {
      const res = await fetch('/api/admin?action=providers');
      const data = await res.json();
      if (data.success) {
        providers = data.data.map((p: any) => ({
          ...p.value,
          id: p.key
        }));
      }
    } catch (e) {
      error = 'Failed to load providers';
    }
  }

  async function loadModels() {
    try {
      const res = await fetch('/api/admin?action=models');
      const data = await res.json();
      if (data.success) {
        models = data.data.map((m: any) => ({
          ...m.value,
          id: m.key.split(':')[1],
          provider: m.key.split(':')[0]
        }));
      }
    } catch (e) {
      error = 'Failed to load models';
    }
  }

  async function loadData() {
    loading = true;
    error = '';
    await Promise.all([loadProviders(), loadModels()]);
    loading = false;
  }

  // Provider operations
  function openProviderDialog(provider?: Provider) {
    if (provider) {
      editingProvider = provider;
      providerForm = { ...provider };
    } else {
      editingProvider = null;
      providerForm = {
        id: '',
        label: '',
        baseUrl: '',
        requiresApiKey: true,
        description: ''
      };
    }
    providerDialogOpen = true;
  }

  async function saveProvider() {
    try {
      error = '';
      success = '';

      const providerData = {
        id: providerForm.id!,
        label: providerForm.label!,
        baseUrl: providerForm.baseUrl,
        requiresApiKey: providerForm.requiresApiKey!,
        description: providerForm.description
      };

      const action = editingProvider ? 'updateProvider' : 'createProvider';
      const body = editingProvider
        ? { action, providerId: editingProvider.id, providerData }
        : { action, providerId: providerData.id, providerData };

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        success = `Provider ${editingProvider ? 'updated' : 'created'} successfully`;
        providerDialogOpen = false;
        await loadProviders();
      } else {
        error = data.error || 'Failed to save provider';
      }
    } catch (e) {
      error = 'Failed to save provider';
    }
  }

  async function deleteProvider(provider: Provider) {
    if (
      !confirm(
        `Are you sure you want to delete provider "${provider.label}"? This will also delete all associated models.`
      )
    ) {
      return;
    }

    try {
      error = '';
      success = '';

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteProvider',
          providerId: provider.id
        })
      });

      const data = await res.json();
      if (data.success) {
        success = 'Provider deleted successfully';
        await loadProviders();
        await loadModels();
      } else {
        error = data.error || 'Failed to delete provider';
      }
    } catch (e) {
      error = 'Failed to delete provider';
    }
  }

  // Model operations
  function openModelDialog(model?: Model, provider?: string) {
    if (model) {
      editingModel = model;
      selectedProviderForModel = model.provider || '';
      modelForm = { ...model };
    } else {
      editingModel = null;
      selectedProviderForModel = provider || '';
      modelForm = {
        id: '',
        label: '',
        category: '',
        toolSupport: false,
        description: '',
        maxTokens: 4000,
        costPerToken: 0,
        gemsPerMessage: 2,
        isFree: false,
        isEnabled: true
      };
    }
    modelDialogOpen = true;
  }

  async function saveModel() {
    try {
      error = '';
      success = '';

      if (!selectedProviderForModel) {
        error = 'Please select a provider';
        return;
      }

      const modelData = {
        id: modelForm.id!,
        label: modelForm.label!,
        category: modelForm.category!,
        toolSupport: modelForm.toolSupport!,
        description: modelForm.description,
        maxTokens: modelForm.maxTokens,
        costPerToken: modelForm.costPerToken,
        gemsPerMessage: modelForm.gemsPerMessage ?? 2,
        isFree: modelForm.isFree ?? false,
        isEnabled: modelForm.isEnabled ?? true
      };

      const action = editingModel ? 'updateModel' : 'createModel';
      const body = editingModel
        ? { action, provider: selectedProviderForModel, modelId: editingModel.id, modelData }
        : { action, provider: selectedProviderForModel, modelData };

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        success = `Model ${editingModel ? 'updated' : 'created'} successfully`;
        modelDialogOpen = false;
        await loadModels();
      } else {
        error = data.error || 'Failed to save model';
      }
    } catch (e) {
      error = 'Failed to save model';
    }
  }

  async function deleteModel(model: Model) {
    if (!confirm(`Are you sure you want to delete model "${model.label}"?`)) {
      return;
    }

    try {
      error = '';
      success = '';

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteModel',
          provider: model.provider,
          modelId: model.id
        })
      });

      const data = await res.json();
      if (data.success) {
        success = 'Model deleted successfully';
        await loadModels();
      } else {
        error = data.error || 'Failed to delete model';
      }
    } catch (e) {
      error = 'Failed to delete model';
    }
  }

  function clearMessages() {
    error = '';
    success = '';
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold">Model Management</h3>
      <p class="text-sm text-muted-foreground">Manage AI providers and their models</p>
    </div>
    <div class="flex gap-2">
      <Button onclick={() => openProviderDialog()}>
        <Plus class="mr-2 h-4 w-4" />
        Add Provider
      </Button>
      <Button onclick={() => openModelDialog()} variant="outline">
        <Plus class="mr-2 h-4 w-4" />
        Add Model
      </Button>
    </div>
  </div>

  <!-- Messages -->
  {#if error}
    <div
      class="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
      <AlertCircle class="h-4 w-4" />
      <span class="text-sm">{error}</span>
      <Button size="sm" variant="ghost" onclick={clearMessages} class="ml-auto">
        <X class="h-4 w-4" />
      </Button>
    </div>
  {/if}

  {#if success}
    <div
      class="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
      <CheckCircle class="h-4 w-4" />
      <span class="text-sm">{success}</span>
      <Button size="sm" variant="ghost" onclick={clearMessages} class="ml-auto">
        <X class="h-4 w-4" />
      </Button>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
    </div>
  {:else}
    <!-- Providers Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <Server class="h-5 w-5 text-muted-foreground" />
        <h4 class="font-medium">Providers</h4>
        <Badge variant="secondary">{providers.length}</Badge>
      </div>

      {#if providers.length === 0}
        <div class="py-8 text-center text-muted-foreground">
          <Server class="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No providers configured</p>
          <Button onclick={() => openProviderDialog()} class="mt-2" size="sm">
            <Plus class="mr-2 h-4 w-4" />
            Add First Provider
          </Button>
        </div>
      {:else}
        <div class="grid gap-3">
          {#each providers as provider}
            <div class="rounded-lg border border-border bg-card p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-2">
                    <h5 class="font-medium">{provider.label}</h5>
                    <Badge variant="outline">{provider.id}</Badge>
                    {#if provider.requiresApiKey}
                      <Badge variant="secondary" class="text-xs">API Key Required</Badge>
                    {/if}
                  </div>
                  {#if provider.description}
                    <p class="mb-2 text-sm text-muted-foreground">{provider.description}</p>
                  {/if}
                  {#if provider.baseUrl}
                    <p class="font-mono text-xs text-muted-foreground">{provider.baseUrl}</p>
                  {/if}
                </div>
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => openModelDialog(undefined, provider.id)}>
                    <Plus class="mr-1 h-4 w-4" />
                    Model
                  </Button>
                  <Button size="sm" variant="ghost" onclick={() => openProviderDialog(provider)}>
                    <Edit2 class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onclick={() => deleteProvider(provider)}>
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <Separator />

    <!-- Models Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <Cpu class="h-5 w-5 text-muted-foreground" />
        <h4 class="font-medium">Models</h4>
        <Badge variant="secondary">{models.length}</Badge>
      </div>

      {#if models.length === 0}
        <div class="py-8 text-center text-muted-foreground">
          <Cpu class="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No models configured</p>
          <Button onclick={() => openModelDialog()} class="mt-2" size="sm">
            <Plus class="mr-2 h-4 w-4" />
            Add First Model
          </Button>
        </div>
      {:else}
        <div class="grid gap-3">
          {#each models as model}
            <div class="rounded-lg border border-border bg-card p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-2">
                    <h5 class="font-medium">{model.label}</h5>
                    <Badge variant="outline">{model.id}</Badge>
                    <Badge variant="secondary">{model.category}</Badge>
                    {#if model.toolSupport}
                      <Badge variant="default" class="text-xs">
                        <Zap class="mr-1 h-3 w-3" />
                        Tools
                      </Badge>
                    {/if}
                  </div>
                  {#if model.description}
                    <p class="mb-2 text-sm text-muted-foreground">{model.description}</p>
                  {/if}
                  <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <span
                      class="font-medium {model.isFree
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-purple-600 dark:text-purple-400'}">
                      {model.isFree
                        ? 'Free (2 gems/msg)'
                        : `${model.gemsPerMessage ?? '?'} gems/msg`}
                    </span>
                    {#if model.maxTokens}
                      <span>Max: {model.maxTokens.toLocaleString()}</span>
                    {/if}
                    <span>Provider: {model.provider}</span>
                    {#if model.isEnabled === false}
                      <Badge variant="destructive" class="text-[9px]">Disabled</Badge>
                    {/if}
                  </div>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" variant="ghost" onclick={() => openModelDialog(model)}>
                    <Edit2 class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onclick={() => deleteModel(model)}>
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Provider Dialog -->
<Dialog.Root bind:open={providerDialogOpen} onOpenChange={() => (providerDialogOpen = false)}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>
        {editingProvider ? 'Edit Provider' : 'Add Provider'}
      </Dialog.Title>
      <Dialog.Description>Configure an AI provider and its connection settings.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <label for="provider-id" class="text-sm font-medium">Provider ID</label>
        <Input
          id="provider-id"
          bind:value={providerForm.id}
          placeholder="e.g., openai, anthropic"
          disabled={!!editingProvider} />
      </div>

      <div class="space-y-2">
        <label for="provider-label" class="text-sm font-medium">Label</label>
        <Input
          id="provider-label"
          bind:value={providerForm.label}
          placeholder="e.g., OpenAI, Anthropic" />
      </div>

      <div class="space-y-2">
        <label for="provider-base-url" class="text-sm font-medium">Base URL (optional)</label>
        <Input
          id="provider-base-url"
          bind:value={providerForm.baseUrl}
          placeholder="https://api.openai.com/v1" />
      </div>

      <div class="space-y-2">
        <label for="provider-description" class="text-sm font-medium">Description (optional)</label>
        <Input
          id="provider-description"
          bind:value={providerForm.description}
          placeholder="Provider description" />
      </div>

      <label class="flex items-center space-x-2">
        <input type="checkbox" bind:checked={providerForm.requiresApiKey} class="rounded" />
        <span class="text-sm">Requires API Key</span>
      </label>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (providerDialogOpen = false)}>
        <X class="mr-2 h-4 w-4" />
        Cancel
      </Button>
      <Button onclick={saveProvider} disabled={!providerForm.id || !providerForm.label}>
        <Save class="mr-2 h-4 w-4" />
        {editingProvider ? 'Update' : 'Create'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Model Dialog -->
<Dialog.Root bind:open={modelDialogOpen} onOpenChange={() => (modelDialogOpen = false)}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>
        {editingModel ? 'Edit Model' : 'Add Model'}
      </Dialog.Title>
      <Dialog.Description>Configure an AI model and its capabilities.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <label for="model-provider" class="text-sm font-medium">Provider</label>
        <select
          id="model-provider"
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          bind:value={selectedProviderForModel}
          disabled={!!editingModel}>
          <option value="">Select a provider</option>
          {#each providers as provider}
            <option value={provider.id}>{provider.label}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-2">
        <label for="model-id" class="text-sm font-medium">Model ID</label>
        <Input
          id="model-id"
          bind:value={modelForm.id}
          placeholder="e.g., gpt-4, claude-3-sonnet"
          disabled={!!editingModel} />
      </div>

      <div class="space-y-2">
        <label for="model-label" class="text-sm font-medium">Label</label>
        <Input
          id="model-label"
          bind:value={modelForm.label}
          placeholder="e.g., GPT-4, Claude 3 Sonnet" />
      </div>

      <div class="space-y-2">
        <label for="model-category" class="text-sm font-medium">Category</label>
        <Input
          id="model-category"
          bind:value={modelForm.category}
          placeholder="e.g., GPT, Claude, Premium" />
      </div>

      <div class="space-y-2">
        <label for="model-description" class="text-sm font-medium">Description (optional)</label>
        <Input
          id="model-description"
          bind:value={modelForm.description}
          placeholder="Model description" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="model-max-tokens" class="text-sm font-medium">Max Tokens</label>
          <Input
            id="model-max-tokens"
            type="number"
            bind:value={modelForm.maxTokens}
            placeholder="4000" />
        </div>

        <div class="space-y-2">
          <label for="model-gems" class="text-sm font-medium">Gems per Message</label>
          <Input
            id="model-gems"
            type="number"
            min="0"
            bind:value={modelForm.gemsPerMessage}
            placeholder="2" />
        </div>
      </div>

      <div class="space-y-3">
        <label class="flex items-center space-x-2">
          <input type="checkbox" bind:checked={modelForm.isFree} class="rounded" />
          <span class="text-sm">Free Model (always costs 2 gems per message)</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="checkbox" bind:checked={modelForm.isEnabled} class="rounded" />
          <span class="text-sm">Enabled (available to users)</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="checkbox" bind:checked={modelForm.toolSupport} class="rounded" />
          <span class="text-sm">Supports Tool Calling</span>
        </label>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (modelDialogOpen = false)}>
        <X class="mr-2 h-4 w-4" />
        Cancel
      </Button>
      <Button
        onclick={saveModel}
        disabled={!selectedProviderForModel || !modelForm.id || !modelForm.label}>
        <Save class="mr-2 h-4 w-4" />
        {editingModel ? 'Update' : 'Create'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
