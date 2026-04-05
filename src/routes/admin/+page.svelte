<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Separator } from '$lib/components/ui/separator';
  import {
    Activity,
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Check,
    Cpu,
    Database,
    Download,
    Edit,
    EyeOff,
    Gem,
    Globe,
    GripVertical,
    HardDrive,
    MessageSquare,
    Power,
    RefreshCw,
    Search,
    Settings,
    Shield,
    Table,
    Trash2,
    UserCheck,
    UserX,
    Users,
    Zap
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Admin auth state
  let isAdminAuthed = $state(false);
  let adminUser = $state('');
  let adminPass = $state('');
  let adminAuthError = $state('');
  let adminLoading = $state(false);

  async function adminLogin() {
    adminAuthError = '';
    adminLoading = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminUser, password: adminPass })
      });
      const data = await res.json();
      if (!res.ok) {
        adminAuthError = data.error || 'Login failed';
        return;
      }
      // Check if user has admin role
      if (data.user?.role !== 'admin' && data.user?.role !== 'superadmin') {
        adminAuthError = 'Access denied. Admin privileges required.';
        // Logout the non-admin session
        await fetch('/api/auth/logout', { method: 'POST' });
        return;
      }
      isAdminAuthed = true;
      adminAuthError = '';
      loadDashboard();
    } catch (e) {
      adminAuthError = 'Login failed. Please try again.';
    } finally {
      adminLoading = false;
    }
  }

  async function adminLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    isAdminAuthed = false;
  }

  // State
  let stats = $state<any>(null);
  let conversations = $state<any[]>([]);
  let selectedConversation = $state<any>(null);
  let conversationMessages = $state<any[]>([]);
  let settingsData = $state<Record<string, any[]>>({});
  let errors = $state<any[]>([]);
  let cacheInfo = $state<any>(null);
  let recentActivity = $state<any[]>([]);
  let loading = $state(true);
  let activeTab = $state('overview');

  // Users state
  let users = $state<any[]>([]);
  let usersTotal = $state(0);
  let usersPage = $state(0);
  let selectedUser = $state<any>(null);
  let userDetails = $state<any>(null);
  let userSearchQuery = $state('');
  let addGemsDialogOpen = $state(false);
  let addGemsUserId = $state('');
  let addGemsAmount = $state(100);
  let addGemsDescription = $state('');
  let setGemsDialogOpen = $state(false);
  let setGemsUserId = $state('');
  let setGemsAmount = $state(0);

  // Enabled Models state (from DB)
  let enabledModels = $state<any[]>([]);
  let enabledModelsLoading = $state(false);
  let editModelDialogOpen = $state(false);
  let editModel = $state<any>(null);

  // OpenRouter state
  let openRouterModels = $state<any[]>([]);
  let openRouterLoading = $state(false);
  let openRouterSearch = $state('');
  let importingModel = $state<string | null>(null);
  let importDialogOpen = $state(false);
  let importModelData = $state<any>(null);
  let importGems = $state(2);
  let importCategory = $state('General');
  let importIsFree = $state(false);

  // DB Viewer state
  let dbTable = $state('users');
  let dbRows = $state<any[]>([]);
  let dbTotal = $state(0);
  let dbPage = $state(0);
  let dbLoading = $state(false);

  // Prompt Enhancer model setting
  let promptEnhancerModel = $state('google/gemini-2.0-flash-001');
  let promptEnhancerSaving = $state(false);

  async function loadPromptEnhancerSetting() {
    try {
      const data = await fetchData('settings', { category: 'prompt_enhancer' });
      if (Array.isArray(data)) {
        const modelSetting = data.find((s: any) => s.key === 'model');
        if (modelSetting?.value) promptEnhancerModel = modelSetting.value;
      }
    } catch {}
  }

  async function savePromptEnhancerModel() {
    promptEnhancerSaving = true;
    try {
      await postData({
        action: 'setSetting',
        category: 'prompt_enhancer',
        key: 'model',
        value: promptEnhancerModel,
        description: 'Model used for the prompt enhancer/improve prompt feature'
      });
    } catch {}
    promptEnhancerSaving = false;
  }

  // App Data (KV store) state
  let appData = $state<{ category: string; key: string; value: unknown }[]>([]);
  let appDataLoading = $state(false);
  let appDataFilter = $state('');

  async function loadAppData() {
    appDataLoading = true;
    try {
      const data = await fetchData('app_data');
      appData = data || [];
    } catch (e) {
      console.error('Failed to load app data:', e);
    }
    appDataLoading = false;
  }

  let filteredAppData = $derived.by(() => {
    if (!appDataFilter.trim()) return appData;
    const q = appDataFilter.toLowerCase();
    return appData.filter(
      (d: any) =>
        d.category?.toLowerCase().includes(q) ||
        d.key?.toLowerCase().includes(q) ||
        JSON.stringify(d.value).toLowerCase().includes(q)
    );
  });

  let appDataCategories = $derived.by(() => {
    const cats = new Set<string>();
    for (const d of appData) cats.add(d.category);
    return Array.from(cats).sort();
  });

  // Usage tracking state
  let usageStats = $state<any[]>([]);
  let usageSummary = $state<any>(null);

  async function loadUsage() {
    loading = true;
    try {
      const db = await fetchData('db_table', { table: 'usage_stats', limit: '200' });
      usageStats = db?.rows || [];
      // Compute summary: per-user totals
      const byUser: Record<string, { tokens: number; requests: number; models: Set<string> }> = {};
      const byModel: Record<string, { tokens: number; requests: number }> = {};
      let totalTokens = 0;
      let totalRequests = 0;
      for (const row of usageStats) {
        const uid = row.user_id || 'anonymous';
        const model = row.model || 'unknown';
        if (!byUser[uid]) byUser[uid] = { tokens: 0, requests: 0, models: new Set() };
        if (!byModel[model]) byModel[model] = { tokens: 0, requests: 0 };
        byUser[uid].tokens += row.total_tokens || 0;
        byUser[uid].requests++;
        byUser[uid].models.add(model);
        byModel[model].tokens += row.total_tokens || 0;
        byModel[model].requests++;
        totalTokens += row.total_tokens || 0;
        totalRequests++;
      }
      usageSummary = {
        totalTokens,
        totalRequests,
        byUser: Object.entries(byUser)
          .map(([id, d]) => ({ id, ...d, models: [...d.models] }))
          .sort((a, b) => b.tokens - a.tokens),
        byModel: Object.entries(byModel)
          .map(([model, d]) => ({ model, ...d }))
          .sort((a, b) => b.tokens - a.tokens)
      };
    } catch (e) {
      console.error('Failed to load usage:', e);
    }
    loading = false;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'models', label: 'Enabled Models', icon: Cpu },
    { id: 'openrouter', label: 'OpenRouter', icon: Globe },
    { id: 'appdata', label: 'App Data', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'database', label: 'Database', icon: Table },
    { id: 'errors', label: 'Errors', icon: AlertCircle },
    { id: 'cache', label: 'Cache', icon: Database },
    { id: 'usage', label: 'Usage', icon: Zap }
  ];

  const dbTables = [
    'users',
    'sessions',
    'workspaces',
    'credit_balances',
    'credit_transactions',
    'model_pricing',
    'enabled_models',
    'conversations',
    'messages',
    'usage_stats',
    'cache_entries',
    'app_settings'
  ];

  const categories = ['Free', 'General', 'Premium', 'Experimental'];

  // Fetch data
  async function fetchData(action: string, params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams({ action, ...params });
    const res = await fetch(`/api/admin?${searchParams}`);
    const data = await res.json();
    return data.success ? data.data : null;
  }

  async function postData(body: any) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  async function loadDashboard() {
    loading = true;
    try {
      const [statsData, activityData] = await Promise.all([
        fetchData('stats'),
        fetchData('activity', { limit: '20' })
      ]);
      stats = statsData;
      recentActivity = activityData || [];
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    }
    loading = false;
  }

  // ── Users ──
  async function loadUsers() {
    loading = true;
    try {
      const data = await fetchData('users', {
        limit: '50',
        offset: String(usersPage * 50),
        ...(userSearchQuery ? { search: userSearchQuery } : {})
      });
      if (data) {
        users = data.users || [];
        usersTotal = data.total || 0;
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
    loading = false;
  }

  async function loadUserDetails(userId: string) {
    loading = true;
    try {
      userDetails = await fetchData('user_details', { userId });
    } catch (e) {
      console.error('Failed to load user details:', e);
    }
    loading = false;
  }

  async function handleAddGems() {
    if (!addGemsUserId || addGemsAmount <= 0) return;
    const result = await postData({
      action: 'addGems',
      userId: addGemsUserId,
      amount: addGemsAmount,
      description: addGemsDescription || undefined
    });
    if (result.success) {
      addGemsDialogOpen = false;
      addGemsAmount = 100;
      addGemsDescription = '';
      await loadUsers();
    } else {
      alert(result.error || 'Failed to add gems');
    }
  }

  async function handleSetGems() {
    if (!setGemsUserId || setGemsAmount < 0) return;
    const result = await postData({
      action: 'setGems',
      userId: setGemsUserId,
      amount: setGemsAmount
    });
    if (result.success) {
      setGemsDialogOpen = false;
      setGemsAmount = 0;
      await loadUsers();
    } else {
      alert(result.error || 'Failed to set gems');
    }
  }

  async function handleUpdateRole(userId: string, role: string) {
    const result = await postData({ action: 'updateUserRole', userId, role });
    if (result.success) await loadUsers();
    else alert(result.error || 'Failed to update role');
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const result = await postData({ action: 'toggleUserActive', userId, isActive });
    if (result.success) await loadUsers();
    else alert(result.error || 'Failed to toggle user');
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (
      !confirm(
        `DELETE user "${email}"? This will permanently remove all their data (conversations, messages, credits, files). This cannot be undone.`
      )
    )
      return;
    if (!confirm(`Are you ABSOLUTELY sure? Type the action to confirm.`)) return;
    const result = await postData({ action: 'deleteUser', userId });
    if (result.success) {
      await loadUsers();
    } else {
      alert(result.error || 'Failed to delete user');
    }
  }

  // ── Enabled Models (DB) ──
  async function loadEnabledModels() {
    enabledModelsLoading = true;
    try {
      const data = await fetchData('models');
      enabledModels = data || [];
    } catch (e) {
      console.error('Failed to load enabled models:', e);
    }
    enabledModelsLoading = false;
  }

  async function handleToggleModel(modelId: string, isEnabled: boolean) {
    await postData({ action: 'toggleEnabledModel', modelId, isEnabled });
    await loadEnabledModels();
  }

  async function handleDeleteModel(modelId: string) {
    if (!confirm(`Delete model ${modelId}?`)) return;
    await postData({ action: 'deleteEnabledModel', modelId });
    await loadEnabledModels();
  }

  async function handleUpdateModel() {
    if (!editModel) return;
    await postData({ action: 'updateEnabledModel', modelData: editModel });
    editModelDialogOpen = false;
    editModel = null;
    await loadEnabledModels();
  }

  function openEditModel(model: any) {
    editModel = { ...model };
    editModelDialogOpen = true;
  }

  // Drag-to-reorder models
  let dragModelId = $state<string | null>(null);
  let dragOverModelId = $state<string | null>(null);

  function handleModelDragStart(e: DragEvent, modelId: string) {
    dragModelId = modelId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', modelId);
    }
  }
  function handleModelDragOver(e: DragEvent, modelId: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverModelId = modelId;
  }
  async function handleModelDrop(e: DragEvent, targetModelId: string) {
    e.preventDefault();
    if (!dragModelId || dragModelId === targetModelId) {
      dragModelId = null;
      dragOverModelId = null;
      return;
    }
    const order = enabledModels.map((m: any) => m.model_id);
    const fromIdx = order.indexOf(dragModelId);
    const toIdx = order.indexOf(targetModelId);
    if (fromIdx >= 0 && toIdx >= 0) {
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragModelId);
      // Update sort_order for all models
      const updates = order.map((id: string, i: number) => ({ model_id: id, sort_order: i + 1 }));
      await postData({ action: 'reorderModels', updates });
      await loadEnabledModels();
    }
    dragModelId = null;
    dragOverModelId = null;
  }
  function handleModelDragEnd() {
    dragModelId = null;
    dragOverModelId = null;
  }

  async function moveModel(modelId: string, direction: 'up' | 'down') {
    const order = enabledModels.map((m: any) => m.model_id);
    const idx = order.indexOf(modelId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    const updates = order.map((id: string, i: number) => ({ model_id: id, sort_order: i + 1 }));
    await postData({ action: 'reorderModels', updates });
    await loadEnabledModels();
  }

  // ── OpenRouter ──
  async function loadOpenRouterModels() {
    openRouterLoading = true;
    try {
      const data = await fetchData('openrouter_models');
      openRouterModels = data || [];
    } catch (e) {
      console.error('Failed to load OpenRouter models:', e);
    }
    openRouterLoading = false;
  }

  function openImportDialog(model: any) {
    const isFree = model.pricing?.prompt === '0' && model.pricing?.completion === '0';
    importModelData = model;
    importGems = isFree ? 0 : 2;
    importCategory = isFree ? 'Free' : 'General';
    importIsFree = isFree;
    importDialogOpen = true;
  }

  async function handleImportModel() {
    if (!importModelData) return;
    importingModel = importModelData.id;
    const modelId = `openrouter/${importModelData.id}`;
    const result = await postData({
      action: 'importOpenRouterModel',
      modelData: {
        model_id: modelId,
        model_name: importModelData.name || importModelData.id,
        provider: 'openrouter',
        category: importCategory,
        description: (importModelData.description || '').slice(0, 200),
        is_free: importIsFree,
        gems_per_message: importGems,
        max_tokens: importModelData.context_length || 4000,
        tool_support: true,
        sort_order: 0,
        metadata: {
          openrouter_id: importModelData.id,
          pricing: importModelData.pricing,
          architecture: importModelData.architecture
        }
      }
    });
    if (!result.success) {
      alert(result.error || 'Failed to import model');
    }
    importingModel = null;
    importDialogOpen = false;
    importModelData = null;
    await loadEnabledModels();
  }

  // Check if an OpenRouter model is already imported
  function isModelImported(orModelId: string): boolean {
    const fullId = `openrouter/${orModelId}`;
    return enabledModels.some((m: any) => m.model_id === fullId);
  }

  let filteredOpenRouterModels = $derived.by(() => {
    if (!openRouterSearch.trim()) return openRouterModels.slice(0, 100);
    const q = openRouterSearch.toLowerCase();
    return openRouterModels
      .filter(
        (m: any) =>
          (m.id || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q)
      )
      .slice(0, 100);
  });

  // ── Other tabs ──
  async function loadConversations() {
    loading = true;
    conversations = (await fetchData('conversations', { limit: '50' })) || [];
    loading = false;
  }

  async function loadConversationMessages(conversationId: string) {
    loading = true;
    conversationMessages = (await fetchData('conversation_messages', { conversationId })) || [];
    selectedConversation = conversations.find((c: any) => c.id === conversationId);
    loading = false;
  }

  async function loadSettings() {
    loading = true;
    settingsData = (await fetchData('settings')) || {};
    await loadPromptEnhancerSetting();
    loading = false;
  }

  async function loadErrors() {
    loading = true;
    errors = (await fetchData('errors', { limit: '50' })) || [];
    loading = false;
  }

  async function loadCache() {
    loading = true;
    cacheInfo = (await fetchData('cache')) || null;
    loading = false;
  }

  async function loadDbTable() {
    dbLoading = true;
    try {
      const data = await fetchData('db_table', {
        table: dbTable,
        limit: '50',
        offset: String(dbPage * 50)
      });
      if (data) {
        dbRows = data.rows || [];
        dbTotal = data.total || 0;
      }
    } catch (e) {
      console.error('Failed to load DB table:', e);
    }
    dbLoading = false;
  }

  async function clearCache(key?: string) {
    if (!confirm('Clear cache?')) return;
    await postData({ action: 'clearCache', key });
    await loadCache();
  }

  async function runCleanup() {
    if (!confirm('Run cleanup?')) return;
    const data = await postData({ action: 'cleanup' });
    if (data.success) {
      alert(`Cleanup done!`);
      await loadDashboard();
    }
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleString();
  }
  function formatNumber(num: number) {
    return new Intl.NumberFormat().format(num || 0);
  }
  function formatCost(cost: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost || 0);
  }

  // Tab change handler
  $effect(() => {
    if (activeTab === 'overview') loadDashboard();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'conversations') loadConversations();
    else if (activeTab === 'models') loadEnabledModels();
    else if (activeTab === 'settings') loadSettings();
    else if (activeTab === 'errors') loadErrors();
    else if (activeTab === 'cache') loadCache();
    else if (activeTab === 'openrouter') {
      loadOpenRouterModels();
      loadEnabledModels();
    } else if (activeTab === 'appdata') loadAppData();
    else if (activeTab === 'database') loadDbTable();
    else if (activeTab === 'usage') loadUsage();
  });

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superadmin')) {
        isAdminAuthed = true;
        loadDashboard();
      }
    } catch {}
  });
</script>

{#if !isAdminAuthed}
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
      <div class="flex flex-col items-center gap-2">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield class="h-6 w-6" />
        </div>
        <h1 class="text-lg font-semibold">Admin Panel</h1>
        <p class="text-sm text-muted-foreground">Enter credentials to continue</p>
      </div>
      {#if adminAuthError}
        <div class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {adminAuthError}
        </div>
      {/if}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          adminLogin();
        }}
        class="space-y-3">
        <Input type="email" placeholder="Admin email" bind:value={adminUser} />
        <Input type="password" placeholder="Password" bind:value={adminPass} />
        <Button type="submit" class="w-full" disabled={adminLoading}
          >{adminLoading ? 'Signing in...' : 'Sign In'}</Button>
      </form>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-background">
    <header
      class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield class="h-4 w-4" />
          </div>
          <div class="leading-tight">
            <div class="text-sm font-semibold">Admin Dashboard</div>
            <div class="text-xs text-muted-foreground">Graphini Management</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={runCleanup}>
            <Trash2 class="mr-1 h-3.5 w-3.5" /> Cleanup
          </Button>
          <Button
            size="sm"
            onclick={() => {
              if (activeTab === 'overview') loadDashboard();
            }}
            disabled={loading}>
            <RefreshCw class={loading ? 'mr-1 h-3.5 w-3.5 animate-spin' : 'mr-1 h-3.5 w-3.5'} /> Refresh
          </Button>
        </div>
      </div>
    </header>

    <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
      <nav class="rounded-lg border border-border bg-card p-2">
        <div class="px-2 pb-2">
          <div class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Navigation
          </div>
        </div>
        <div class="grid gap-0.5">
          {#each tabs as tab}
            {@const Icon = tab.icon}
            <button
              type="button"
              onclick={() => (activeTab = tab.id)}
              class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors
              {activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}">
              <Icon class="h-3.5 w-3.5" />
              <span class="truncate">{tab.label}</span>
            </button>
          {/each}
        </div>
      </nav>

      <main class="min-w-0">
        {#if loading && !['models', 'openrouter'].includes(activeTab)}
          <div class="flex items-center justify-center py-20">
            <RefreshCw class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>

          <!-- ═══ OVERVIEW ═══ -->
        {:else if activeTab === 'overview'}
          <div class="space-y-6">
            {#if stats}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {#each [{ label: 'Conversations', value: stats.totalConversations, today: stats.conversationsToday, icon: MessageSquare, color: 'blue' }, { label: 'Messages', value: stats.totalMessages, today: stats.messagesToday, icon: Activity, color: 'green' }, { label: 'Tokens Used', value: stats.totalTokensUsed, today: null, icon: Zap, color: 'purple', sub: `Cost: ${formatCost(stats.estimatedCostUsd)}` }, { label: 'Users', value: stats.totalUsers, today: null, icon: Users, color: 'orange', sub: `${formatNumber(stats.activeSessions)} active sessions` }] as card}
                  {@const CardIcon = card.icon}
                  <div class="rounded-lg border border-border bg-card p-5">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-xs text-muted-foreground">{card.label}</p>
                        <p class="text-2xl font-bold">{formatNumber(card.value)}</p>
                      </div>
                      <div
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-{card.color}-500/10 text-{card.color}-500">
                        <CardIcon class="h-5 w-5" />
                      </div>
                    </div>
                    <p class="mt-1 text-[10px] text-muted-foreground">
                      {card.today !== null ? `+${formatNumber(card.today)} today` : card.sub || ''}
                    </p>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="rounded-lg border border-border bg-card">
              <div class="border-b border-border px-4 py-3">
                <h3 class="text-sm font-semibold">Recent Activity</h3>
              </div>
              <div class="divide-y divide-border">
                {#if recentActivity.length === 0}
                  <p class="p-4 text-center text-sm text-muted-foreground">No recent activity</p>
                {:else}
                  {#each recentActivity.slice(0, 10) as act}
                    <div class="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <div class="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                        <Activity class="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-xs font-medium">{act.description}</p>
                        <p class="text-[10px] text-muted-foreground">{act.userId || 'Anonymous'}</p>
                      </div>
                      <span class="text-[10px] text-muted-foreground"
                        >{formatDate(act.createdAt)}</span>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </div>

          <!-- ═══ USERS ═══ -->
        {:else if activeTab === 'users'}
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div class="relative flex-1">
                <Search
                  class="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  class="pl-9"
                  bind:value={userSearchQuery}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      usersPage = 0;
                      loadUsers();
                    }
                  }} />
              </div>
              <Badge variant="outline">{usersTotal} total</Badge>
            </div>

            {#if selectedUser}
              <div class="rounded-lg border border-border bg-card">
                <div class="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => {
                      selectedUser = null;
                      userDetails = null;
                    }}>
                    <ArrowLeft class="h-4 w-4" />
                  </Button>
                  <h3 class="text-sm font-semibold">
                    {selectedUser.display_name || selectedUser.email}
                  </h3>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}
                    >{selectedUser.role}</Badge>
                </div>
                {#if userDetails}
                  <div class="space-y-4 p-4">
                    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p class="text-[10px] text-muted-foreground uppercase">Email</p>
                        <p class="text-sm font-medium">{userDetails.user.email}</p>
                      </div>
                      <div>
                        <p class="text-[10px] text-muted-foreground uppercase">Gems</p>
                        <p class="text-sm font-medium text-purple-600 dark:text-purple-400">
                          <Gem class="mr-1 inline h-3.5 w-3.5" />{userDetails.balance?.balance || 0}
                        </p>
                      </div>
                      <div>
                        <p class="text-[10px] text-muted-foreground uppercase">Lifetime Earned</p>
                        <p class="text-sm font-medium">
                          {userDetails.balance?.lifetime_earned || 0}
                        </p>
                      </div>
                      <div>
                        <p class="text-[10px] text-muted-foreground uppercase">Joined</p>
                        <p class="text-sm font-medium">{formatDate(userDetails.user.created_at)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 class="mb-2 text-xs font-semibold">Recent Transactions</h4>
                      <div class="max-h-48 space-y-1 overflow-y-auto">
                        {#each (userDetails.transactions || []).slice(0, 20) as tx}
                          <div
                            class="flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5 text-xs">
                            <span
                              class="font-medium {tx.amount > 0
                                ? 'text-green-600'
                                : 'text-red-500'}">{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                            <span class="text-muted-foreground">{tx.type}</span>
                            <span class="text-muted-foreground">{tx.description || '-'}</span>
                            <span class="text-muted-foreground">{formatDate(tx.created_at)}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="flex items-center justify-center py-8">
                    <RefreshCw class="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                {/if}
              </div>
            {:else}
              <div class="overflow-hidden rounded-lg border border-border bg-card">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium">User</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Role</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Gems</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Status</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Joined</th>
                        <th class="px-4 py-2 text-right text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                      {#each users as user}
                        <tr class="transition-colors hover:bg-accent/30">
                          <td class="px-4 py-2.5">
                            <button
                              type="button"
                              class="text-left"
                              onclick={() => {
                                selectedUser = user;
                                loadUserDetails(user.id);
                              }}>
                              <div class="text-xs font-medium">{user.display_name || '-'}</div>
                              <div class="text-[10px] text-muted-foreground">{user.email}</div>
                            </button>
                          </td>
                          <td class="px-4 py-2.5">
                            <select
                              class="rounded border border-border bg-background px-2 py-0.5 text-[11px]"
                              value={user.role}
                              onchange={(e) =>
                                handleUpdateRole(user.id, (e.target as HTMLSelectElement).value)}>
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                              <option value="superadmin">superadmin</option>
                            </select>
                          </td>
                          <td class="px-4 py-2.5">
                            <span
                              class="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                              <Gem class="h-3 w-3" />{user.credits || 0}
                            </span>
                          </td>
                          <td class="px-4 py-2.5">
                            {#if user.is_active}<Badge variant="default" class="text-[9px]"
                                >Active</Badge>
                            {:else}<Badge variant="destructive" class="text-[9px]">Inactive</Badge
                              >{/if}
                          </td>
                          <td class="px-4 py-2.5 text-[10px] text-muted-foreground"
                            >{formatDate(user.created_at)}</td>
                          <td class="px-4 py-2.5 text-right">
                            <div class="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                class="h-6 px-2 text-[10px]"
                                onclick={() => {
                                  addGemsUserId = user.id;
                                  addGemsDialogOpen = true;
                                }}>
                                <Gem class="mr-1 h-3 w-3" /> Add
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                class="h-6 px-2 text-[10px]"
                                onclick={() => {
                                  setGemsUserId = user.id;
                                  setGemsAmount = user.credits || 0;
                                  setGemsDialogOpen = true;
                                }}>
                                <Edit class="mr-1 h-3 w-3" /> Set
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                class="h-6 w-6 p-0"
                                onclick={() => handleToggleActive(user.id, !user.is_active)}
                                title={user.is_active ? 'Deactivate' : 'Activate'}>
                                {#if user.is_active}<UserX class="h-3 w-3" />{:else}<UserCheck
                                    class="h-3 w-3" />{/if}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                class="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onclick={() => handleDeleteUser(user.id, user.email)}
                                title="Delete user permanently">
                                <Trash2 class="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if usersTotal > 50}
                  <div class="flex items-center justify-between border-t border-border px-4 py-2">
                    <span class="text-[10px] text-muted-foreground"
                      >Page {usersPage + 1} of {Math.ceil(usersTotal / 50)}</span>
                    <div class="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-6 text-[10px]"
                        disabled={usersPage === 0}
                        onclick={() => {
                          usersPage--;
                          loadUsers();
                        }}>Prev</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-6 text-[10px]"
                        disabled={(usersPage + 1) * 50 >= usersTotal}
                        onclick={() => {
                          usersPage++;
                          loadUsers();
                        }}>Next</Button>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- ═══ CONVERSATIONS ═══ -->
        {:else if activeTab === 'conversations'}
          <div class="rounded-lg border border-border bg-card">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <div class="text-sm font-semibold">
                Conversations
                {#if selectedConversation}<span class="font-normal text-muted-foreground">
                    / {selectedConversation.title || 'Untitled'}</span
                  >{/if}
              </div>
              <div class="flex items-center gap-2">
                {#if selectedConversation}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs"
                    onclick={() => {
                      selectedConversation = null;
                      conversationMessages = [];
                    }}>
                    <ArrowLeft class="mr-1 h-3 w-3" /> Back
                  </Button>
                {/if}
                <Badge variant="outline">{conversations.length}</Badge>
              </div>
            </div>
            {#if selectedConversation}
              <div class="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                {#each conversationMessages as message}
                  <div
                    class="rounded-lg border border-border p-3 {message.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-950/20'
                      : 'bg-muted/30'}">
                    <div class="mb-1 flex items-center justify-between">
                      <Badge
                        variant={message.role === 'user' ? 'default' : 'secondary'}
                        class="text-[9px]">{message.role}</Badge>
                      <span class="text-[10px] text-muted-foreground"
                        >{message.created_at ? formatDate(message.created_at) : ''}</span>
                    </div>
                    <p class="text-xs whitespace-pre-wrap">
                      {(message.content || '').slice(0, 500)}{(message.content || '').length > 500
                        ? '...'
                        : ''}
                    </p>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium">Title</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Messages</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {#each conversations as c}
                      <tr
                        class="cursor-pointer hover:bg-accent/30"
                        onclick={() => loadConversationMessages(c.id)}>
                        <td class="px-4 py-2.5"
                          ><div class="text-xs font-medium">{c.title || 'Untitled'}</div></td>
                        <td class="px-4 py-2.5"
                          ><Badge variant="secondary" class="text-[9px]"
                            >{c.message_count || 0}</Badge
                          ></td>
                        <td class="px-4 py-2.5 text-[10px] text-muted-foreground"
                          >{c.updated_at ? formatDate(c.updated_at) : ''}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>

          <!-- ═══ ENABLED MODELS (DB) ═══ -->
        {:else if activeTab === 'models'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold">Enabled Models</h3>
                <p class="text-[10px] text-muted-foreground">
                  Models available to users. Manage via OpenRouter tab to add new ones.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="outline">{enabledModels.length} models</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  onclick={async () => {
                    for (const m of enabledModels.filter((m) => m.is_enabled)) {
                      await handleToggleModel(m.model_id, false);
                    }
                  }}>
                  <EyeOff class="mr-1 h-3 w-3" /> Disable All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  onclick={loadEnabledModels}
                  disabled={enabledModelsLoading}>
                  <RefreshCw
                    class={enabledModelsLoading ? 'mr-1 h-3 w-3 animate-spin' : 'mr-1 h-3 w-3'} /> Refresh
                </Button>
              </div>
            </div>

            {#if enabledModelsLoading}
              <div class="flex items-center justify-center py-12">
                <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else}
              <div class="overflow-hidden rounded-lg border border-border bg-card">
                <table class="w-full text-sm">
                  <thead class="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th class="w-10 px-2 py-2 text-center text-xs font-medium">#</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Model</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Category</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Gems</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Context</th>
                      <th class="px-4 py-2 text-left text-xs font-medium">Status</th>
                      <th class="px-4 py-2 text-right text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {#each enabledModels as model, mi}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <tr
                        class="transition-all hover:bg-accent/30 {!model.is_enabled
                          ? 'opacity-50'
                          : ''} {dragOverModelId === model.model_id &&
                        dragModelId !== model.model_id
                          ? 'ring-2 ring-primary/40'
                          : ''} {dragModelId === model.model_id ? 'opacity-30' : ''}"
                        draggable="true"
                        ondragstart={(e) => handleModelDragStart(e, model.model_id)}
                        ondragover={(e) => handleModelDragOver(e, model.model_id)}
                        ondrop={(e) => handleModelDrop(e, model.model_id)}
                        ondragend={handleModelDragEnd}>
                        <td class="px-2 py-2.5 text-center">
                          <div class="flex flex-col items-center gap-0.5">
                            <GripVertical
                              class="h-3.5 w-3.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground" />
                            <div class="flex gap-0.5">
                              <button
                                type="button"
                                class="text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
                                disabled={mi === 0}
                                onclick={() => moveModel(model.model_id, 'up')}
                                title="Move up">
                                <ArrowUp class="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                class="text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
                                disabled={mi === enabledModels.length - 1}
                                onclick={() => moveModel(model.model_id, 'down')}
                                title="Move down">
                                <ArrowDown class="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-2.5">
                          <div class="text-xs font-medium">{model.model_name}</div>
                          <div class="font-mono text-[10px] text-muted-foreground">
                            {model.model_id}
                          </div>
                        </td>
                        <td class="px-4 py-2.5">
                          <Badge variant="secondary" class="text-[9px]">{model.category}</Badge>
                          {#if model.is_free}<Badge variant="default" class="ml-1 text-[9px]"
                              >Free</Badge
                            >{/if}
                        </td>
                        <td class="px-4 py-2.5">
                          <span
                            class="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                            <Gem class="h-3 w-3" />{model.gems_per_message}
                          </span>
                        </td>
                        <td class="px-4 py-2.5 text-xs text-muted-foreground">
                          {model.max_tokens ? `${(model.max_tokens / 1000).toFixed(0)}k` : '-'}
                        </td>
                        <td class="px-4 py-2.5">
                          {#if model.is_enabled}<Badge variant="default" class="text-[9px]"
                              >Enabled</Badge>
                          {:else}<Badge variant="secondary" class="text-[9px]">Disabled</Badge>{/if}
                        </td>
                        <td class="px-4 py-2.5 text-right">
                          <div class="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-6 w-6 p-0"
                              title="Edit"
                              onclick={() => openEditModel(model)}>
                              <Edit class="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-6 w-6 p-0"
                              title={model.is_enabled ? 'Disable' : 'Enable'}
                              onclick={() => handleToggleModel(model.model_id, !model.is_enabled)}>
                              <Power
                                class="h-3 w-3 {model.is_enabled
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'}" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-6 w-6 p-0 text-red-500"
                              title="Delete"
                              onclick={() => handleDeleteModel(model.model_id)}>
                              <Trash2 class="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
                {#if enabledModels.length === 0}
                  <div class="p-8 text-center text-sm text-muted-foreground">
                    No models enabled. Go to the <button
                      type="button"
                      class="text-primary underline"
                      onclick={() => (activeTab = 'openrouter')}>OpenRouter</button> tab to import models.
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- ═══ OPENROUTER BROWSER ═══ -->
        {:else if activeTab === 'openrouter'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold">OpenRouter Model Browser</h3>
                <p class="text-[10px] text-muted-foreground">
                  Browse tool-capable models. Import to make available to users with custom gems
                  cost.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="outline">{openRouterModels.length} available</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  onclick={loadOpenRouterModels}
                  disabled={openRouterLoading}>
                  <RefreshCw
                    class={openRouterLoading ? 'mr-1 h-3 w-3 animate-spin' : 'mr-1 h-3 w-3'} /> Refresh
                </Button>
              </div>
            </div>

            <div class="relative">
              <Search
                class="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search models (e.g. llama, gemma, mistral, claude)..."
                class="pl-9"
                bind:value={openRouterSearch} />
            </div>

            {#if openRouterLoading}
              <div class="flex items-center justify-center py-12">
                <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else}
              <div class="overflow-hidden rounded-lg border border-border bg-card">
                <div class="max-h-[60vh] overflow-y-auto">
                  <table class="w-full text-sm">
                    <thead
                      class="sticky top-0 border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium">Model</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Context</th>
                        <th class="px-4 py-2 text-left text-xs font-medium">Pricing</th>
                        <th class="px-4 py-2 text-right text-xs font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                      {#each filteredOpenRouterModels as model}
                        {@const imported = isModelImported(model.id)}
                        {@const isFree =
                          model.pricing?.prompt === '0' && model.pricing?.completion === '0'}
                        <tr
                          class="hover:bg-accent/30 {imported
                            ? 'bg-green-50/50 dark:bg-green-950/10'
                            : ''}">
                          <td class="px-4 py-2.5">
                            <div class="flex items-center gap-2">
                              <div>
                                <div class="text-xs font-medium">{model.name || model.id}</div>
                                <div class="font-mono text-[10px] text-muted-foreground">
                                  {model.id}
                                </div>
                              </div>
                              {#if isFree}<Badge variant="default" class="text-[8px]">FREE</Badge
                                >{/if}
                            </div>
                          </td>
                          <td class="px-4 py-2.5 text-xs text-muted-foreground">
                            {model.context_length
                              ? `${(model.context_length / 1000).toFixed(0)}k`
                              : '-'}
                          </td>
                          <td class="px-4 py-2.5 text-xs text-muted-foreground">
                            {#if isFree}
                              <span class="font-medium text-green-600">Free</span>
                            {:else if model.pricing}
                              ${((parseFloat(model.pricing.prompt) || 0) * 1000000).toFixed(2)}/M in
                            {:else}
                              -
                            {/if}
                          </td>
                          <td class="px-4 py-2.5 text-right">
                            {#if imported}
                              <Badge variant="secondary" class="text-[9px]"
                                ><Check class="mr-1 h-3 w-3" /> Imported</Badge>
                            {:else}
                              <Button
                                size="sm"
                                variant="outline"
                                class="h-6 px-2 text-[10px]"
                                onclick={() => openImportDialog(model)}>
                                <Download class="mr-1 h-3 w-3" /> Import
                              </Button>
                            {/if}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </div>

          <!-- ═══ APP DATA (KV Store) ═══ -->
        {:else if activeTab === 'appdata'}
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div class="relative flex-1">
                <Search
                  class="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by category, key, or value..."
                  class="pl-9"
                  bind:value={appDataFilter} />
              </div>
              <Badge variant="outline">{filteredAppData.length} entries</Badge>
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-xs"
                onclick={loadAppData}
                disabled={appDataLoading}>
                <RefreshCw
                  class={appDataLoading ? 'mr-1 h-3.5 w-3.5 animate-spin' : 'mr-1 h-3.5 w-3.5'} /> Refresh
              </Button>
            </div>

            {#if appDataLoading}
              <div class="flex items-center justify-center py-12">
                <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else if filteredAppData.length === 0}
              <div class="rounded-lg border border-border bg-card p-8 text-center">
                <HardDrive class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">No app data found</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Data will appear here once users save settings via the KV store
                </p>
              </div>
            {:else}
              {#each appDataCategories as cat}
                {@const catEntries = filteredAppData.filter((d) => d.category === cat)}
                {#if catEntries.length > 0}
                  <div class="rounded-lg border border-border bg-card">
                    <div
                      class="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <div class="flex items-center gap-2">
                        <Badge variant="secondary" class="text-[10px]">{cat}</Badge>
                        <span class="text-xs text-muted-foreground"
                          >{catEntries.length} entries</span>
                      </div>
                    </div>
                    <div class="divide-y divide-border">
                      {#each catEntries as entry}
                        <div class="px-4 py-2.5">
                          <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0 flex-1">
                              <div class="text-xs font-medium text-foreground">{entry.key}</div>
                              <pre
                                class="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">{JSON.stringify(
                                  entry.value,
                                  null,
                                  2
                                )}</pre>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          <!-- ═══ SETTINGS ═══ -->
        {:else if activeTab === 'settings'}
          <div class="space-y-4">
            <!-- Prompt Enhancer Model -->
            <div class="rounded-lg border border-border bg-card">
              <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <Zap class="h-3.5 w-3.5 text-indigo-500" />
                <span class="text-xs font-semibold">Prompt Enhancer Model</span>
              </div>
              <div class="flex items-center gap-3 px-4 py-3">
                <div class="min-w-0 flex-1">
                  <p class="mb-1.5 text-[10px] text-muted-foreground">
                    Model used for the "Improve Prompt" feature. Use a fast, cheap model.
                  </p>
                  <Input
                    bind:value={promptEnhancerModel}
                    placeholder="e.g. google/gemini-2.0-flash-001"
                    class="h-8 text-xs" />
                </div>
                <Button
                  size="sm"
                  class="h-8 text-xs"
                  disabled={promptEnhancerSaving}
                  onclick={savePromptEnhancerModel}>
                  {#if promptEnhancerSaving}
                    <RefreshCw class="mr-1 h-3 w-3 animate-spin" />
                  {:else}
                    <Check class="mr-1 h-3 w-3" />
                  {/if}
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold">Application Settings</h3>
              <Badge variant="outline">{Object.keys(settingsData).length} categories</Badge>
            </div>
            {#if Object.keys(settingsData).length === 0}
              <div
                class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No settings configured
              </div>
            {:else}
              {#each Object.entries(settingsData) as [category, items]}
                <div class="rounded-lg border border-border bg-card">
                  <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <div class="flex items-center gap-2">
                      <Settings class="h-3.5 w-3.5 text-muted-foreground" />
                      <span class="text-xs font-semibold capitalize">{category}</span>
                    </div>
                    <Badge variant="secondary" class="text-[9px]">{items.length}</Badge>
                  </div>
                  <div class="divide-y divide-border">
                    {#each items as item}
                      <div class="flex items-center justify-between gap-4 px-4 py-2">
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-medium">{item.key}</div>
                          <div class="truncate text-[10px] text-muted-foreground">
                            {item.description || '-'}
                          </div>
                        </div>
                        <code
                          class="max-w-[200px] truncate rounded bg-muted px-2 py-0.5 text-[10px]">
                          {typeof item.value === 'object'
                            ? JSON.stringify(item.value).slice(0, 50)
                            : String(item.value).slice(0, 50)}
                        </code>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>

          <!-- ═══ DATABASE ═══ -->
        {:else if activeTab === 'database'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold">Database Viewer</h3>
              <Badge variant="outline">{dbTotal} rows</Badge>
            </div>
            <div class="flex flex-wrap gap-1">
              {#each dbTables as t}
                <Button
                  size="sm"
                  variant={dbTable === t ? 'default' : 'outline'}
                  class="h-7 text-[10px]"
                  onclick={() => {
                    dbTable = t;
                    dbPage = 0;
                    loadDbTable();
                  }}>{t}</Button>
              {/each}
            </div>
            {#if dbLoading}
              <div class="flex items-center justify-center py-12">
                <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            {:else}
              <div class="overflow-hidden rounded-lg border border-border bg-card">
                <div class="max-h-[60vh] overflow-auto">
                  {#if dbRows.length > 0}
                    <table class="w-full text-[11px]">
                      <thead
                        class="sticky top-0 border-b border-border bg-muted/30 text-muted-foreground">
                        <tr>
                          {#each Object.keys(dbRows[0]).slice(0, 8) as col}
                            <th class="px-3 py-1.5 text-left font-medium whitespace-nowrap"
                              >{col}</th>
                          {/each}
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border">
                        {#each dbRows as row}
                          <tr class="hover:bg-accent/30">
                            {#each Object.entries(row).slice(0, 8) as [key, val]}
                              <td class="max-w-[200px] truncate px-3 py-1.5 font-mono">
                                {#if val === null}<span class="text-muted-foreground italic"
                                    >null</span>
                                {:else if typeof val === 'object'}<span
                                    class="text-muted-foreground"
                                    >{JSON.stringify(val).slice(0, 40)}</span>
                                {:else if typeof val === 'boolean'}<Badge
                                    variant={val ? 'default' : 'secondary'}
                                    class="text-[8px]">{val}</Badge>
                                {:else}{String(val).slice(0, 40)}{/if}
                              </td>
                            {/each}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  {:else}
                    <div class="p-8 text-center text-sm text-muted-foreground">
                      No data in {dbTable}
                    </div>
                  {/if}
                </div>
                {#if dbTotal > 50}
                  <div class="flex items-center justify-between border-t border-border px-4 py-2">
                    <span class="text-[10px] text-muted-foreground"
                      >Page {dbPage + 1} of {Math.ceil(dbTotal / 50)}</span>
                    <div class="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-6 text-[10px]"
                        disabled={dbPage === 0}
                        onclick={() => {
                          dbPage--;
                          loadDbTable();
                        }}>Prev</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-6 text-[10px]"
                        disabled={(dbPage + 1) * 50 >= dbTotal}
                        onclick={() => {
                          dbPage++;
                          loadDbTable();
                        }}>Next</Button>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- ═══ ERRORS ═══ -->
        {:else if activeTab === 'errors'}
          <div class="rounded-lg border border-border bg-card">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 class="text-sm font-semibold">Errors</h3>
              <Badge variant="outline">{errors.length}</Badge>
            </div>
            <div class="divide-y divide-border">
              {#if errors.length === 0}
                <div class="p-8 text-center text-sm text-muted-foreground">No errors</div>
              {:else}
                {#each errors as err}
                  <div class="px-4 py-2.5">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium"
                        >{err.error_message || err.message || 'Error'}</span>
                      <Badge variant="destructive" class="text-[9px]">error</Badge>
                    </div>
                    <div class="mt-0.5 text-[10px] text-muted-foreground">
                      {err.created_at ? formatDate(err.created_at) : ''}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- ═══ CACHE ═══ -->
        {:else if activeTab === 'cache'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold">Cache</h3>
              <div class="flex gap-2">
                <Badge variant="outline">{cacheInfo?.entries?.length ?? 0} entries</Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  class="h-7 text-xs"
                  onclick={() => clearCache()}>
                  <Trash2 class="mr-1 h-3 w-3" /> Clear All
                </Button>
              </div>
            </div>
            {#if cacheInfo?.entries}
              <div class="overflow-hidden rounded-lg border border-border bg-card">
                <div class="max-h-[60vh] overflow-auto">
                  <table class="w-full text-[11px]">
                    <thead
                      class="sticky top-0 border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th class="px-3 py-1.5 text-left font-medium">Key</th>
                        <th class="px-3 py-1.5 text-left font-medium">Hits</th>
                        <th class="px-3 py-1.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                      {#each cacheInfo.entries as entry}
                        <tr class="hover:bg-accent/30">
                          <td class="max-w-[200px] truncate px-3 py-1.5 font-mono">{entry.key}</td>
                          <td class="px-3 py-1.5">{entry.hitCount}</td>
                          <td class="px-3 py-1.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-5 w-5 p-0"
                              onclick={() => clearCache(entry.key)}>
                              <Trash2 class="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {:else}
              <div
                class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No cache data
              </div>
            {/if}
          </div>

          <!-- ═══ USAGE ═══ -->
        {:else if activeTab === 'usage'}
          <div class="space-y-4">
            {#if usageSummary}
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-lg border border-border bg-card p-4">
                  <div
                    class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    Total Requests
                  </div>
                  <div class="mt-1 text-2xl font-bold">
                    {formatNumber(usageSummary.totalRequests)}
                  </div>
                </div>
                <div class="rounded-lg border border-border bg-card p-4">
                  <div
                    class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    Total Tokens
                  </div>
                  <div class="mt-1 text-2xl font-bold">
                    {formatNumber(usageSummary.totalTokens)}
                  </div>
                </div>
                <div class="rounded-lg border border-border bg-card p-4">
                  <div
                    class="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    Unique Users
                  </div>
                  <div class="mt-1 text-2xl font-bold">{usageSummary.byUser?.length || 0}</div>
                </div>
              </div>

              <!-- Per-User Usage -->
              <div class="rounded-lg border border-border bg-card">
                <div class="border-b border-border px-4 py-3">
                  <h3 class="text-sm font-semibold">Usage by User</h3>
                </div>
                <div class="max-h-[300px] overflow-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-muted/50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground"
                          >User ID</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Requests</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Tokens</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground"
                          >Models Used</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border/30">
                      {#each usageSummary.byUser as userUsage}
                        <tr class="hover:bg-muted/20">
                          <td class="px-3 py-1.5 font-mono text-[10px]"
                            >{userUsage.id.slice(0, 12)}...</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(userUsage.requests)}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(userUsage.tokens)}</td>
                          <td class="px-3 py-1.5">
                            <div class="flex flex-wrap gap-1">
                              {#each userUsage.models.slice(0, 3) as m}
                                <span class="rounded bg-muted px-1 py-0.5 text-[9px]"
                                  >{m.split('/').pop()}</span>
                              {/each}
                              {#if userUsage.models.length > 3}
                                <span class="text-[9px] text-muted-foreground"
                                  >+{userUsage.models.length - 3}</span>
                              {/if}
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Per-Model Usage -->
              <div class="rounded-lg border border-border bg-card">
                <div class="border-b border-border px-4 py-3">
                  <h3 class="text-sm font-semibold">Usage by Model</h3>
                </div>
                <div class="max-h-[300px] overflow-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-muted/50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Model</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Requests</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Tokens</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border/30">
                      {#each usageSummary.byModel as modelUsage}
                        <tr class="hover:bg-muted/20">
                          <td class="px-3 py-1.5 font-mono text-[10px]">{modelUsage.model}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(modelUsage.requests)}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(modelUsage.tokens)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Recent Usage Log -->
              <div class="rounded-lg border border-border bg-card">
                <div class="border-b border-border px-4 py-3">
                  <h3 class="text-sm font-semibold">Recent Requests ({usageStats.length})</h3>
                </div>
                <div class="max-h-[300px] overflow-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-muted/50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">User</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Model</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Prompt</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Completion</th>
                        <th class="px-3 py-2 text-right font-medium text-muted-foreground"
                          >Total</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border/30">
                      {#each usageStats.slice(0, 100) as row}
                        <tr class="hover:bg-muted/20">
                          <td class="px-3 py-1.5 text-[10px] text-muted-foreground"
                            >{formatDate(row.created_at)}</td>
                          <td class="px-3 py-1.5 font-mono text-[10px]"
                            >{(row.user_id || '').slice(0, 8)}</td>
                          <td class="px-3 py-1.5 font-mono text-[10px]"
                            >{(row.model || '').split('/').pop()}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(row.prompt_tokens || 0)}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums"
                            >{formatNumber(row.completion_tokens || 0)}</td>
                          <td class="px-3 py-1.5 text-right font-medium tabular-nums"
                            >{formatNumber(row.total_tokens || 0)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {:else}
              <div
                class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No usage data yet
              </div>
            {/if}
          </div>
        {/if}
      </main>
    </div>
  </div>

  <!-- Add Gems Dialog -->
  <Dialog.Root bind:open={addGemsDialogOpen}>
    <Dialog.Content class="sm:max-w-[400px]">
      <Dialog.Header>
        <Dialog.Title>Add Gems</Dialog.Title>
        <Dialog.Description>Add gems to user's balance</Dialog.Description>
      </Dialog.Header>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <label for="gems-amount" class="text-sm font-medium">Amount</label>
          <Input
            id="gems-amount"
            type="number"
            min="1"
            bind:value={addGemsAmount}
            placeholder="100" />
        </div>
        <div class="space-y-2">
          <label for="gems-desc" class="text-sm font-medium">Description (optional)</label>
          <Input id="gems-desc" bind:value={addGemsDescription} placeholder="Bonus gems" />
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => (addGemsDialogOpen = false)}>Cancel</Button>
        <Button onclick={handleAddGems} disabled={addGemsAmount <= 0}>
          <Gem class="mr-2 h-4 w-4" /> Add {addGemsAmount} Gems
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Set Gems Dialog -->
  <Dialog.Root bind:open={setGemsDialogOpen}>
    <Dialog.Content class="sm:max-w-[400px]">
      <Dialog.Header>
        <Dialog.Title>Set Gems</Dialog.Title>
        <Dialog.Description>Set user's gem balance to a specific amount</Dialog.Description>
      </Dialog.Header>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <label for="set-gems-amount" class="text-sm font-medium">New Balance</label>
          <Input
            id="set-gems-amount"
            type="number"
            min="0"
            bind:value={setGemsAmount}
            placeholder="0" />
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => (setGemsDialogOpen = false)}>Cancel</Button>
        <Button onclick={handleSetGems} disabled={setGemsAmount < 0}>
          <Gem class="mr-2 h-4 w-4" /> Set to {setGemsAmount}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Import Model Dialog -->
  <Dialog.Root bind:open={importDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
      <Dialog.Header>
        <Dialog.Title>Import Model</Dialog.Title>
        <Dialog.Description>Configure gems cost and category before importing</Dialog.Description>
      </Dialog.Header>
      {#if importModelData}
        <div class="space-y-4 py-4">
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-sm font-medium">{importModelData.name || importModelData.id}</div>
            <div class="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {importModelData.id}
            </div>
            {#if importModelData.description}
              <p class="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {importModelData.description.slice(0, 150)}
              </p>
            {/if}
            <div class="mt-2 flex gap-3 text-[10px] text-muted-foreground">
              <span
                >Context: {importModelData.context_length
                  ? `${(importModelData.context_length / 1000).toFixed(0)}k`
                  : '-'}</span>
              {#if importModelData.pricing}
                <span
                  >Prompt: ${((parseFloat(importModelData.pricing.prompt) || 0) * 1000000).toFixed(
                    2
                  )}/M</span>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="import-gems" class="text-sm font-medium">Gems per message</label>
              <Input id="import-gems" type="number" min="0" bind:value={importGems} />
              <p class="text-[10px] text-muted-foreground">How many gems each message costs</p>
            </div>
            <div class="space-y-2">
              <label for="import-category" class="text-sm font-medium">Category</label>
              <select
                id="import-category"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                bind:value={importCategory}>
                {#each categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="import-description" class="text-sm font-medium">Description</label>
              <span class="text-[10px] text-muted-foreground"
                >{(importModelData?.description?.length || 0) > 40 ? '40/' : ''}{(importModelData
                  ?.description?.length || 0) > 40
                  ? '40'
                  : importModelData?.description?.length || 0}/40 chars</span>
            </div>
            <Input
              id="import-description"
              bind:value={importModelData.description}
              maxlength={40}
              placeholder="Brief model description (max 40 chars)" />
            <p class="text-[10px] text-muted-foreground">
              Short description shown in model dropdown (max 40 characters)
            </p>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="import-free"
              bind:checked={importIsFree}
              class="rounded border-border" />
            <label for="import-free" class="text-sm">Mark as free model (no gems deducted)</label>
          </div>
        </div>
      {/if}
      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            importDialogOpen = false;
            importModelData = null;
          }}>Cancel</Button>
        <Button onclick={handleImportModel} disabled={importingModel !== null}>
          {#if importingModel}<RefreshCw class="mr-2 h-4 w-4 animate-spin" />{:else}<Download
              class="mr-2 h-4 w-4" />{/if}
          Import Model
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Edit Model Dialog -->
  <Dialog.Root bind:open={editModelDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
      <Dialog.Header>
        <Dialog.Title>Edit Model</Dialog.Title>
        <Dialog.Description>Update model settings</Dialog.Description>
      </Dialog.Header>
      {#if editModel}
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label for="edit-model-id" class="text-sm font-medium">Model ID</label>
            <Input id="edit-model-id" value={editModel.model_id} disabled class="bg-muted/50" />
          </div>
          <div class="space-y-2">
            <label for="edit-model-name" class="text-sm font-medium">Display Name</label>
            <Input id="edit-model-name" bind:value={editModel.model_name} />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="edit-gems" class="text-sm font-medium">Gems per message</label>
              <Input id="edit-gems" type="number" min="0" bind:value={editModel.gems_per_message} />
            </div>
            <div class="space-y-2">
              <label for="edit-category" class="text-sm font-medium">Category</label>
              <select
                id="edit-category"
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                bind:value={editModel.category}>
                {#each categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="edit-description" class="text-sm font-medium">Description</label>
              <span class="text-[10px] text-muted-foreground"
                >{editModel?.description?.length || 0}/40 chars</span>
            </div>
            <Input
              id="edit-description"
              bind:value={editModel.description}
              maxlength={40}
              placeholder="Brief model description (max 40 chars)" />
            <p class="text-[10px] text-muted-foreground">
              Short description shown in model dropdown (max 40 characters)
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="edit-max-tokens" class="text-sm font-medium">Max Tokens</label>
              <Input id="edit-max-tokens" type="number" bind:value={editModel.max_tokens} />
            </div>
            <div class="space-y-2">
              <label for="edit-sort-order" class="text-sm font-medium">Sort Order</label>
              <Input id="edit-sort-order" type="number" bind:value={editModel.sort_order} />
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-free"
                bind:checked={editModel.is_free}
                class="rounded border-border" />
              <label for="edit-free" class="text-sm">Free</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-tools"
                bind:checked={editModel.tool_support}
                class="rounded border-border" />
              <label for="edit-tools" class="text-sm">Tool Support</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-enabled"
                bind:checked={editModel.is_enabled}
                class="rounded border-border" />
              <label for="edit-enabled" class="text-sm">Enabled</label>
            </div>
          </div>
        </div>
      {/if}
      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            editModelDialogOpen = false;
            editModel = null;
          }}>Cancel</Button>
        <Button onclick={handleUpdateModel}>
          <Check class="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  @reference "../../app.css";
  :global(body) {
    @apply bg-background text-foreground;
  }
</style>
