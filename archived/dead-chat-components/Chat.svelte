<script lang="ts">
  import CodeEditor from '$lib/components/ai-elements/CodeEditor.svelte';
  import { Response } from '$lib/components/ai-elements/response';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select/index.js';
  import DiagramReadTask from '$lib/features/chat/components/ai-elements/diagram-editor/DiagramReadTask.svelte';
  import type {
    DiagramEditorOperation,
    DiagramEditorTask
  } from '$lib/features/chat/components/ai-elements/diagram-editor/types';
  import { getOperationTitle } from '$lib/features/chat/components/ai-elements/diagram-editor/types';
  import { type ChatStatus as PromptInputStatus } from '$lib/features/chat/components/ai-elements/prompt-input';
  import ChatQuestionnaire from '$lib/features/chat/components/ai-elements/questionnaire/ChatQuestionnaire.svelte';
  import { Reasoning } from '$lib/features/chat/components/ai-elements/reasoning';
  import {
    ToolExecution,
    type ToolExecutionStatus,
    type ToolStep
  } from '$lib/features/chat/components/ai-elements/tool';
  import {
    createConversation,
    createMessage,
    deleteConversation,
    getConversation,
    listSnapshots,
    updateConversation
  } from '$lib/features/chat/services/api-client';
  import type { UIMessage } from '$lib/features/chat/services/chat-cache';
  import { cacheMessages, getCachedMessages } from '$lib/features/chat/services/chat-cache';
  import {
    contextEngine,
    type ConversationContext
  } from '$lib/features/chat/services/context-engine';
  import { MemoryManager } from '$lib/features/chat/services/memory-manager';
  import { aiSettingsStore, storeActions } from '$lib/stores';
  import { chatStore } from '$lib/stores/chat-store';
  import {
    allModelsStore,
    modelsLoadingStore,
    selectedChatModelsStore
  } from '$lib/stores/modelStore';
  import { supabase } from '$lib/supabase';
  import { errorToString } from '$lib/util/errorToString';
  import { loadState, stateStore, updateCode, updateCodeStore } from '$lib/util/state';
  import { ArrowUp, Bot, Check, Code2, Loader2, Sparkles, Trash2, X } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

  type PromptMode = 'ask' | 'create';

  // Type guards for editorTasks metadata to prevent runtime errors (fixed for null check)
  function hasPartialCode(
    task: DiagramEditorTask
  ): task is DiagramEditorTask & { metadata: { partialCode: string } } {
    return (
      'metadata' in task &&
      task.metadata !== null &&
      typeof task.metadata === 'object' &&
      'partialCode' in task.metadata &&
      typeof task.metadata.partialCode === 'string'
    );
  }

  function hasCode(
    task: DiagramEditorTask
  ): task is DiagramEditorTask & { metadata: { code: string } } {
    return (
      'metadata' in task &&
      task.metadata !== null &&
      typeof task.metadata === 'object' &&
      'code' in task.metadata &&
      typeof task.metadata.code === 'string'
    );
  }

  function hasDiagramType(
    task: DiagramEditorTask
  ): task is DiagramEditorTask & { metadata: { diagramType: string } } {
    return (
      'metadata' in task &&
      task.metadata !== null &&
      typeof task.metadata === 'object' &&
      'diagramType' in task.metadata &&
      typeof task.metadata.diagramType === 'string'
    );
  }

  function hasChanges(
    task: DiagramEditorTask
  ): task is DiagramEditorTask & { metadata: { changes: any } } {
    return (
      'metadata' in task &&
      task.metadata !== null &&
      typeof task.metadata === 'object' &&
      'changes' in task.metadata
    );
  }

  function hasStreamedChanges(
    task: DiagramEditorTask
  ): task is DiagramEditorTask & { metadata: { streamedChanges: any[] } } {
    return (
      'metadata' in task &&
      task.metadata !== null &&
      typeof task.metadata === 'object' &&
      'streamedChanges' in task.metadata &&
      Array.isArray(task.metadata.streamedChanges)
    );
  }

  // Helper function to generate a conversation title from the first message
  function generateConversationTitle(text: string): string {
    // Remove extra whitespace and truncate
    const trimmed = text.trim();

    // Extract first sentence or first 50 chars
    const firstSentence = trimmed.split(/[.!?]/)[0].trim();
    const title =
      firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;

    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Helper function to get current AI settings
  function getCurrentAISettings() {
    let current: any = {};
    const unsubscribe = aiSettingsStore.subscribe((s) => {
      current = s;
    });
    unsubscribe();
    return current;
  }

  // Optional callback prop for parent components to react when chat is cleared
  function getModelLabel(modelId: string): string {
    // This is a simplified version - in a real implementation you'd
    // want to import the PROVIDER_MODELS from the settings component
    // or create a shared model registry
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-5': 'GPT-5',
      'gpt-5-mini': 'GPT-5 Mini',
      'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-latest': 'Claude 3.5 Haiku',
      'openai/gpt-4o': 'GPT-4o',
      'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
      'liquid/lfm-2.5-1.2b-instruct:free': 'LFM-2.5',
      'arcee-ai/trinity-large-preview:free': 'Trinity Large',
      'upstage/solar-pro-3:free': 'Solar Pro 3',
      'kilo-default': 'Kilo Default'
    };

    return modelMap[modelId] || modelId;
  }

  // Helper function to switch to a specific model
  function switchToModel(modelId: string) {
    // Update the AI settings store with the new model
    const aiSettingsStoreWritable = aiSettingsStore as any;
    aiSettingsStoreWritable.update((s: any) => ({
      ...s,
      model: modelId,
      providerModel: modelId
    }));

    // Update local state to reflect the change immediately
    selectedModelId = modelId;
    const option = getModelOptions().find((item) => item.id === modelId);
    if (option) selectedModelName = option.name;
  }

  // Helper function to get favorite models
  function getFavoriteModels(): string[] {
    return storeActions.getFavoriteModels();
  }

  // Optional callback prop for parent components to react when chat is cleared
  interface Props {
    class?: string;
  }

  async function deleteCurrentConversation() {
    if (!currentConversationId) return;
    if (!confirm('Delete this conversation? This cannot be undone.')) return;

    const conversationIdToDelete = currentConversationId;

    // Clear UI immediately
    messageText = '';
    lastError = null;
    mermaidSnippetMap.clear();
    rawResponseMap = new SvelteMap();
    expandedCodeIds = new SvelteSet();
    expandedRawResponseIds = new SvelteSet();
    conversationContext = null;
    editorTasks = [];
    localStorage.removeItem('editorTasks');
    isReadInProgress = false;
    historicalMessages = [];
    sessionMessages = [];

    try {
      await deleteConversation(conversationIdToDelete);
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }

    // Always create a new conversation so the UI remains usable
    try {
      const response = await createConversation({ title: 'New Chat' });
      currentConversationId = response.conversation.id;
      currentConversationTitle = response.conversation.title;
      localStorage.setItem('currentConversationId', currentConversationId || '');
      lastTrackedCode = $stateStore.code;
      updateConversationContext();
    } catch (error) {
      console.error('Failed to create new conversation after delete:', error);
      currentConversationId = crypto.randomUUID();
      currentConversationTitle = 'New Chat';
      localStorage.setItem('currentConversationId', currentConversationId || '');
    }
  }

  function syncSnippetToEditor(snippet: string, messageId: string) {
    const trimmed = snippet.trim();
    if (!trimmed) return;
    if (lastSyncedMessageId === messageId && lastSyncedCode === trimmed) return;

    // Update code and enable diagram rendering
    updateCode(trimmed, { updateDiagram: true, resetPanZoom: false });
    lastSyncedMessageId = messageId;
    lastSyncedCode = trimmed;
  }
  let { class: className }: Props = $props();

  interface ModelOption {
    id: string;
    name: string;
    icon: string;
  }

  // Dynamic model options from user's selection (max 10) - using $derived for automatic cleanup
  let selectedChatModels = $derived($selectedChatModelsStore);
  let modelsLoading = $derived($modelsLoadingStore);
  let allModels = $derived($allModelsStore);

  // Get model options for current provider
  function getModelOptions() {
    const provider = aiSettings?.provider || 'openai';
    return allModels[provider] || [];
  }

  const statusMap: Record<'ready' | 'submitted' | 'streaming' | 'error', PromptInputStatus> = {
    ready: 'idle',
    submitted: 'submitted',
    streaming: 'streaming',
    error: 'error'
  };

  let selectedModelId = $state('');
  let selectedModelName = $state('');
  let selectedModel = $derived(() => getModelOptions().find((opt) => opt.id === selectedModelId));
  let promptMode = $state<PromptMode>('ask');
  let userEmail = $state<string | null>(null);

  const aiSettingsStoreWritable = aiSettingsStore as any;
  let aiSettings = $state({} as any);

  onMount(() => {
    const unsubscribe = aiSettingsStore.subscribe((v) => {
      aiSettings = v as any;
    });
    return () => unsubscribe();
  });

  // Track previous provider to detect actual changes
  let previousProvider = $state('');

  $effect(() => {
    // Update previous provider when aiSettings changes
    if (aiSettings?.provider) {
      previousProvider = aiSettings.provider;
    }
  });

  $effect(() => {
    // Sync from shared settings store (form-based AI panel)
    if (aiSettings.model && aiSettings.model !== selectedModelId) {
      selectedModelId = aiSettings.model;
      const option = getModelOptions().find((item) => item.id === selectedModelId);
      if (option) selectedModelName = option.name;
    }
    if (aiSettings.promptMode && aiSettings.promptMode !== promptMode) {
      promptMode = aiSettings.promptMode;
    }
  });

  // Reset selected model when provider changes (only when provider actually changes)
  $effect(() => {
    const provider = aiSettings?.provider;
    const currentModels = getModelOptions();
    if (provider && provider !== previousProvider && currentModels.length > 0) {
      previousProvider = provider;
      // Check if current model is valid for this provider
      const currentModelValid = currentModels.some((m) => m.id === selectedModelId);
      if (!currentModelValid || !selectedModelId) {
        // Select first model from user's selection
        selectedModelId = currentModels[0]?.id || '';
        selectedModelName = currentModels[0]?.name || '';
      }
    }
  });
  let lastError = $state<string | null>(null);
  let lastSyncedMessageId = $state<string | null>(null);
  let lastSyncedCode = $state<string | null>(null);
  let messageText = $state('');
  let fileInputRef = $state<HTMLInputElement | null>(null);
  let isRetrying = $state(false);
  let messagesContainerRef = $state<HTMLDivElement | null>(null);
  let snapshotMap = new SvelteMap<string, string>();
  let mermaidSnippetMap = $state(new SvelteMap<string, string>());
  let rawResponseMap = new SvelteMap<string, string>();

  // Track expanded state for "Show code" dropdown per message id
  let expandedCodeIds = new SvelteSet<string>();
  // Track expanded state for "Show raw response" per message id
  let expandedRawResponseIds = new SvelteSet<string>();
  let isStreamingMermaid = $state(false);
  let abortController = $state<AbortController | null>(null);
  let currentToolCall = $state<{ id: string; name: string; partialCode: string } | null>(null);

  // Centralized timeout tracking to prevent memory leaks
  let activeTimeoutId = $state<ReturnType<typeof setTimeout> | null>(null);

  // Throttling for message updates to prevent flickering
  let lastUpdateTime = 0;
  let periodicSyncInterval: ReturnType<typeof setInterval> | null = null;

  // Chain of Thought state for thinking tool calls
  let reasoningContent = $state('');
  let isReasoningStreaming = $state(false);

  // Tool start tracking for loading states
  let isPreparingQuestionnaire = $state(false);
  let isGeneratingDiagram = $state(false);
  let currentToolStart = $state<{ id: string; name: string; message: string } | null>(null);

  // Unified tool execution tracking for collapsible UI
  interface ToolExecutionState {
    id: string;
    name: string;
    status: ToolExecutionStatus;
    message: string;
    progress: number;
    steps: ToolStep[];
    streamingCode: string;
    error: string;
    isOpen: boolean;
    startTime: number;
  }
  let activeToolExecutions = $state<ToolExecutionState[]>([]);

  // Centralized tool state update function - handles all tool events immutably
  function updateToolState(event: any) {
    let updatedExecutions = [...activeToolExecutions];

    // Helper to find index by ID or create new entry
    const findOrCreateIndex = (
      id: string,
      name: string,
      defaults: Partial<ToolExecutionState> = {}
    ) => {
      let idx = updatedExecutions.findIndex((t) => t.id === id);
      if (idx === -1) {
        const newTool: ToolExecutionState = {
          id,
          name,
          status: 'starting',
          message: 'Initializing...',
          progress: 0,
          steps: [],
          streamingCode: '',
          error: '',
          isOpen: true,
          startTime: Date.now(),
          ...defaults
        };
        updatedExecutions.push(newTool);
        idx = updatedExecutions.length - 1;
      }
      return idx;
    };

    switch (event.type) {
      case 'tool_call_start':
      case 'diagram_editor': {
        const toolId = event.id || event.taskId || `${event.name || event.operation}-${Date.now()}`;
        const toolName =
          event.name === 'diagram_editor'
            ? `diagram_editor_${event.operation || 'unknown'}`
            : event.name || 'unknown';
        const message = event.message || 'Processing...';
        const idx = findOrCreateIndex(toolId, toolName, { message });

        // Set to in-progress after brief delay
        setTimeout(() => {
          activeToolExecutions = activeToolExecutions.map((t) =>
            t.id === toolId ? { ...t, status: 'in-progress' as ToolExecutionStatus } : t
          );
        }, 100);
        break;
      }

      case 'diagram_editor_progress':
      case 'diagram_editor_partial_code':
      case 'diagram_editor_change':
      case 'diagram_editor_patch_progress':
      case 'tool_progress':
      case 'tool_call_delta': {
        const progIdx = updatedExecutions.findIndex(
          (t) => t.id === (event.taskId || event.id || currentToolStart?.id)
        );
        if (progIdx !== -1) {
          const lineCount =
            (event.partialCode || event.partial_code || '')?.split('\n').length || 0;
          updatedExecutions[progIdx] = {
            ...updatedExecutions[progIdx],
            progress: event.progress ?? updatedExecutions[progIdx].progress,
            message:
              event.message ||
              (lineCount > 0
                ? `Generating code... (${lineCount} lines)`
                : updatedExecutions[progIdx].message),
            streamingCode:
              event.partialCode || event.partial_code || updatedExecutions[progIdx].streamingCode
          };
        }
        break;
      }

      case 'thinking_update':
      case 'thinking': {
        const thinkId = event.id || currentToolStart?.id || 'thinking-' + Date.now();
        const thinkIdx = findOrCreateIndex(thinkId, 'thinking');
        updatedExecutions[thinkIdx] = {
          ...updatedExecutions[thinkIdx],
          message: event.partial_thought || event.thought || 'Analyzing...',
          status: event.type === 'thinking' ? 'complete' : 'in-progress'
        };
        break;
      }

      case 'comprehensive-questionnaire-start':
      case 'comprehensive-questionnaire': {
        const qId = event.id || currentToolStart?.id || 'questionnaire-' + Date.now();
        const qIdx = findOrCreateIndex(qId, 'comprehensive_questionnaire', {
          message: event.message || 'Preparing questions...'
        });
        if (event.type === 'comprehensive-questionnaire') {
          updatedExecutions[qIdx] = {
            ...updatedExecutions[qIdx],
            status: 'complete',
            message: 'Questionnaire ready'
          };
        }
        break;
      }

      case 'tool_call_complete':
      case 'diagram_editor_complete':
      case 'comprehensive-questionnaire-complete': {
        const completeIdx = updatedExecutions.findIndex(
          (t) => t.id === (event.id || event.taskId || currentToolStart?.id)
        );
        if (completeIdx !== -1) {
          const completedId = updatedExecutions[completeIdx].id;
          updatedExecutions[completeIdx] = {
            ...updatedExecutions[completeIdx],
            status: 'complete',
            progress: 100,
            message: event.message || event.explanation || 'Complete',
            streamingCode:
              event.diagramCode ||
              event.mermaid_code ||
              updatedExecutions[completeIdx].streamingCode
          };
          // Auto-collapse after 2s
          setTimeout(() => {
            activeToolExecutions = activeToolExecutions.map((t) =>
              t.id === completedId ? { ...t, isOpen: false } : t
            );
          }, 2000);
        }
        break;
      }

      case 'error':
      case 'diagram_editor_error': {
        const errIdx = updatedExecutions.findIndex(
          (t) => t.id === (event.id || event.taskId || currentToolStart?.id)
        );
        if (errIdx !== -1) {
          updatedExecutions[errIdx] = {
            ...updatedExecutions[errIdx],
            status: 'error',
            error: event.message || event.error || 'An error occurred',
            message: 'Error occurred'
          };
        }
        break;
      }

      case 'done': {
        // Clear all executions after delay
        setTimeout(() => {
          activeToolExecutions = [];
        }, 3000);
        break;
      }

      default:
        // Unknown event type - log for debugging
        if (event.type && !['text', 'mermaid_code', 'mermaid_code_delta'].includes(event.type)) {
          console.debug('Unhandled tool event:', event.type);
        }
    }

    // Trigger reactivity with new array reference
    activeToolExecutions = updatedExecutions;
  }

  // Consolidated diagram operation state
  interface DiagramOpState {
    isValidating: boolean;
    isSyntaxChecking: boolean;
    isTypeDetecting: boolean;
    isCodeGenerating: boolean;
    isEnhancing: boolean;
    validationStatus: 'pending' | 'valid' | 'error';
    syntaxStatus: 'pending' | 'valid' | 'error';
    detectedType: string;
    validationMessage: string;
    syntaxMessage: string;
    codeGenProgress: number;
    codeGenMessage: string;
    enhancementMessage: string;
  }
  const defaultDiagramOpState: DiagramOpState = {
    isValidating: false,
    isSyntaxChecking: false,
    isTypeDetecting: false,
    isCodeGenerating: false,
    isEnhancing: false,
    validationStatus: 'pending',
    syntaxStatus: 'pending',
    detectedType: '',
    validationMessage: '',
    syntaxMessage: '',
    codeGenProgress: 0,
    codeGenMessage: '',
    enhancementMessage: ''
  };
  let diagramOp = $state<DiagramOpState>({ ...defaultDiagramOpState });

  function resetDiagramOpState() {
    diagramOp = { ...defaultDiagramOpState };
  }

  // Diagram diff tracking for code changes visualization - now per-message
  let previousDiagramMap = $state(new SvelteMap<string, string>());
  let showDiffMap = $state(new SvelteMap<string, boolean>());
  let currentDiffMap = $state(new SvelteMap<string, string>());

  // Unified throttle utility - creates a throttled function with configurable interval
  function createThrottle<T>(applyFn: (value: T) => void, intervalMs: number) {
    let pending: T | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastTime = 0;

    const throttled = (value: T) => {
      pending = value;
      const now = Date.now();
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (now - lastTime > intervalMs) {
        applyFn(pending);
        pending = null;
        lastTime = now;
      } else {
        timeout = setTimeout(() => {
          if (pending !== null) {
            applyFn(pending);
            pending = null;
            lastTime = Date.now();
          }
          timeout = null;
        }, intervalMs / 2);
      }
    };

    const flush = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (pending !== null) {
        applyFn(pending);
        pending = null;
      }
    };

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    return { throttled, flush, cleanup };
  }

  // Message update state
  let pendingAssistantText = '';
  let pendingMessageId = '';

  function doMessageUpdate(id: string, text: string) {
    console.log(
      `Updating message ${id}: ${text?.substring(0, 100) + (text?.length > 100 ? '...' : '')}`
    );
    sessionMessages = sessionMessages.map((msg) =>
      msg.id === id
        ? {
            ...msg,
            parts: msg.parts?.map((p) => (p.type === 'text' ? { ...p, text } : p)) || [
              { type: 'text' as const, text }
            ]
          }
        : msg
    ) as typeof sessionMessages;
  }

  // Create throttled updaters
  const editorTasksThrottle = createThrottle<DiagramEditorTask[]>((tasks) => {
    editorTasks = tasks;
  }, 200);
  const throttledEditorTasksUpdate = editorTasksThrottle.throttled;
  const flushEditorTasksUpdate = editorTasksThrottle.flush;

  function throttledMessageUpdate(id: string, text: string) {
    pendingAssistantText = text;
    pendingMessageId = id;
    const now = Date.now();
    if (now - lastUpdateTime > 100) {
      doMessageUpdate(id, text);
      lastUpdateTime = now;
    } else {
      setTimeout(() => {
        if (pendingMessageId && pendingAssistantText) {
          doMessageUpdate(pendingMessageId, pendingAssistantText);
          lastUpdateTime = Date.now();
        }
      }, 50);
    }
  }

  function flushMessageUpdate(id: string, text: string) {
    doMessageUpdate(id, text);
  }

  function generateDiffHighlight(oldCode: string, newCode: string): string {
    if (!oldCode)
      return `<div class="diff-line diff-added"><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(newCode)}</span></div>`;
    if (!newCode)
      return `<div class="diff-line diff-removed"><span class="diff-marker">-</span><span class="diff-content">${escapeHtml(oldCode)}</span></div>`;

    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    let diffHtml = '';
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldIndex >= oldLines.length) {
        // Only new lines remain (added)
        diffHtml += `<div class="diff-line diff-added"><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(newLine || '')}</span></div>`;
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines remain (removed)
        diffHtml += `<div class="diff-line diff-removed"><span class="diff-marker">-</span><span class="diff-content">${escapeHtml(oldLine || '')}</span></div>`;
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are identical (unchanged)
        diffHtml += `<div class="diff-line diff-unchanged"><span class="diff-marker"> </span><span class="diff-content">${escapeHtml(oldLine)}</span></div>`;
        oldIndex++;
        newIndex++;
      } else {
        // Lines differ - show as remove + add
        diffHtml += `<div class="diff-line diff-removed"><span class="diff-marker">-</span><span class="diff-content">${escapeHtml(oldLine)}</span></div>`;
        diffHtml += `<div class="diff-line diff-added"><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(newLine)}</span></div>`;
        oldIndex++;
        newIndex++;
      }
    }

    return diffHtml;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Loading placeholder state
  let loadingTextIndex = $state(0);
  let loadingTexts = [
    'Thinking...',
    'Crafting...',
    'Designing...',
    'Graphing...',
    'Building...',
    'Creating...'
  ];
  let loadingText = $derived.by(() => loadingTexts[loadingTextIndex]);

  // Timer for cycling loading text
  let loadingTimer: ReturnType<typeof setInterval> | null = null;

  // Function to start cycling loading text
  function startLoadingTextCycle() {
    // Clear any existing timer
    if (loadingTimer) {
      clearInterval(loadingTimer);
    }

    // Reset index and start cycling
    loadingTextIndex = 0;
    loadingTimer = setInterval(() => {
      loadingTextIndex = (loadingTextIndex + 1) % loadingTexts.length;
    }, 1000); // Change every 1 second
  }

  // Function to stop cycling loading text
  function stopLoadingTextCycle() {
    if (loadingTimer) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
  }

  // Task state for editor operations - using full DiagramEditorTask objects
  let editorTasks = $state<DiagramEditorTask[]>([]);

  // Track if read operation is already in progress to prevent duplicates
  let isReadInProgress = $state(false);

  // Track if code changes are in progress
  let isCodeChanging = $state(false);

  // Cache for parsed semantic content to avoid expensive re-parsing
  let parsedContentCache = $state(new Map<string, any[]>());

  function getParsedContent(text: string, messageId: string) {
    // Always re-parse during streaming to get latest content
    // Also re-parse if content has changed significantly (length difference > 50 chars)
    const cached = parsedContentCache.get(messageId);
    const shouldReparse =
      isStreaming ||
      !cached ||
      (cached && Math.abs(text.length - (cached[0]?.content?.length || 0)) > 50);

    if (shouldReparse) {
      console.log(
        `Re-parsing content for ${messageId}: streaming=${isStreaming}, cached=${!!cached}, text.length=${text.length}`
      );
      parsedContentCache.set(messageId, parseSemanticContent(text));
    }
    return parsedContentCache.get(messageId);
  }

  // Sync all current session messages to server
  let isSyncingMessages = $state(false);
  let pendingSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  function getMessageText(msg: UIMessage): string {
    return (
      msg.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n\n') || ''
    );
  }

  async function syncMessagesToServer() {
    if (!currentConversationId) return;
    if (isSyncingMessages) return;

    isSyncingMessages = true;

    try {
      // Get all messages that need to be synced (dedupe by id + basic content match)
      const historicalById = new Set(
        historicalMessages.map((m) => m.id).filter(Boolean) as string[]
      );

      const messagesToSync = sessionMessages.filter((msg) => {
        if (msg.id && historicalById.has(msg.id)) return false;

        const msgText = getMessageText(msg);
        if (!msgText) return false;

        // If server/history already has same role+content, skip
        return !historicalMessages.some(
          (hm) => hm.role === msg.role && getMessageText(hm) === msgText
        );
      });

      if (messagesToSync.length === 0) {
        // Still update cache with current state even if nothing to sync
        await cacheMessages(
          currentConversationId,
          [...historicalMessages, ...sessionMessages],
          currentConversationTitle || 'Chat',
          true
        );
        return;
      }

      // Save each message to server
      for (const message of messagesToSync) {
        const content = getMessageText(message);
        if (!content) continue;

        await createMessage(currentConversationId, {
          role: message.role as 'user' | 'assistant' | 'system' | 'tool',
          content,
          parts: message.parts || []
        });
      }

      // After a successful sync, treat session messages as historical for dedupe purposes
      historicalMessages = [...historicalMessages, ...messagesToSync];
      sessionMessages = sessionMessages.filter(
        (msg) => !messagesToSync.some((synced) => synced.id && msg.id === synced.id)
      );

      // Update cache with synced messages
      await cacheMessages(
        currentConversationId,
        historicalMessages,
        currentConversationTitle || 'Chat',
        true
      );
    } catch (error) {
      console.error('Failed to sync messages to server:', error);
      // Still cache locally even if server sync fails
      if (currentConversationId) {
        await cacheMessages(
          currentConversationId,
          [...historicalMessages, ...sessionMessages],
          currentConversationTitle || 'Chat',
          false
        );
      }
    } finally {
      isSyncingMessages = false;
    }
  }

  function scheduleSyncMessagesToServer(delayMs = 1000) {
    if (pendingSyncTimeout) clearTimeout(pendingSyncTimeout);
    pendingSyncTimeout = setTimeout(() => {
      pendingSyncTimeout = null;
      syncMessagesToServer();
    }, delayMs);
  }

  // Load conversation from server and sync all data
  async function loadConversationFromServer(conversationId: string) {
    try {
      initializing = true;
      console.log('Starting to load conversation:', conversationId);

      // Try to load from cache first for instant display
      const cachedMessages = await getCachedMessages(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('Loading', cachedMessages.length, 'messages from cache');
        historicalMessages = cachedMessages;
        sessionMessages = [];
        currentConversationId = conversationId;
        localStorage.setItem('currentConversationId', conversationId);

        // Extract Mermaid snippets from cached messages
        for (const msg of cachedMessages) {
          if (msg.role === 'assistant') {
            const snippet = extractMermaidFromMessage(msg as UIMessage);
            if (snippet) {
              mermaidSnippetMap.set(msg.id ?? crypto.randomUUID(), snippet);
            }
          }
        }

        // Initialize context immediately
        lastTrackedCode = $stateStore.code;
        updateConversationContext();

        // Set initializing to false so UI shows cached content
        initializing = false;
      }

      // Load from server (in background if cache was available)
      const response = await getConversation(conversationId, {
        includeMessages: true,
        limit: 1000
      });

      console.log('Server response:', {
        conversationId: response.conversation.id,
        title: response.conversation.title,
        messageCount: response.messages?.length || 0
      });

      currentConversationId = response.conversation.id;
      currentConversationTitle = response.conversation.title;
      localStorage.setItem('currentConversationId', currentConversationId || '');

      // Clear current session messages
      sessionMessages = [];

      // Load historical messages from server
      if (response.messages && response.messages.length > 0) {
        console.log('Loading', response.messages.length, 'historical messages from server');
        historicalMessages = response.messages;

        // Cache the messages for next time
        await cacheMessages(conversationId, response.messages, response.conversation.title, true);

        // Extract Mermaid snippets and raw responses
        for (const msg of response.messages) {
          if (msg.role === 'assistant') {
            const snippet = extractMermaidFromMessage(msg);
            if (snippet) {
              mermaidSnippetMap.set(msg.id ?? crypto.randomUUID(), snippet);
            }

            const rawText =
              msg.parts
                ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
                .map((part) => part.text)
                .join('\n\n') || '';
            if (rawText && msg.id) {
              rawResponseMap = new SvelteMap(rawResponseMap).set(msg.id, rawText);
            }
          }
        }
      } else {
        // No messages on server, cache empty state
        await cacheMessages(conversationId, [], response.conversation.title, true);
      }

      // Initialize context for loaded conversation
      lastTrackedCode = $stateStore.code;
      updateConversationContext();

      return response;
    } catch (error) {
      console.error('Failed to load conversation from server:', error);
      throw error;
    } finally {
      initializing = false;
    }
  }

  // Track if editor tasks have been loaded from localStorage
  let editorTasksLoaded = $state(false);

  // Load editor tasks from localStorage on mount - only keep in-progress tasks
  $effect(() => {
    // Only load once on initial mount
    if (editorTasksLoaded) return;

    const saved = localStorage.getItem('editorTasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore all tasks (including completed) so cards remain visible after stream completes
        editorTasks = parsed.filter(
          (t: any) =>
            t &&
            typeof t === 'object' &&
            'status' in t &&
            (t.status === 'in-progress' || t.status === 'complete')
        );
        // If no tasks, clear localStorage
        if (editorTasks.length === 0) {
          localStorage.removeItem('editorTasks');
        }
      } catch (e) {
        console.warn('Failed to load editor tasks from localStorage:', e);
        localStorage.removeItem('editorTasks');
      }
    }

    // Mark as loaded to prevent future runs
    editorTasksLoaded = true;
  });

  // Save editor tasks to localStorage whenever they change (keep in-progress and completed)
  $effect(() => {
    const persistentTasks = editorTasks.filter(
      (t: any) =>
        t &&
        typeof t === 'object' &&
        'status' in t &&
        (t.status === 'in-progress' || t.status === 'complete')
    );
    if (persistentTasks.length > 0) {
      localStorage.setItem('editorTasks', JSON.stringify(persistentTasks));
    } else {
      localStorage.removeItem('editorTasks');
    }
  });

  function toggleCode(id: string) {
    console.log('toggleCode called with id:', id);
    console.log('expandedCodeIds before:', expandedCodeIds);
    if (expandedCodeIds.has(id)) {
      expandedCodeIds.delete(id);
      console.log('removing id from expanded');
    } else {
      expandedCodeIds.add(id);
      console.log('adding id to expanded');
    }
    // Trigger reactivity by creating a new reference
    expandedCodeIds = new SvelteSet(expandedCodeIds);
    console.log('expandedCodeIds after:', expandedCodeIds);
  }
  function isCodeExpanded(id: string) {
    return expandedCodeIds.has(id);
  }
  function toggleRawResponse(id: string) {
    const next = new SvelteSet(expandedRawResponseIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedRawResponseIds = next;
  }
  function isRawResponseExpanded(id: string) {
    return expandedRawResponseIds.has(id);
  }

  // Helper function to get status badge variant
  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'complete':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  // Detect if a text block contains Mermaid code
  function isMermaidContent(text: string): boolean {
    if (!text) return false;
    const t = text.trim();
    return (
      t.includes('```mermaid') ||
      t.startsWith('graph ') ||
      t.startsWith('flowchart ') ||
      t.startsWith('sequenceDiagram') ||
      t.startsWith('classDiagram') ||
      t.startsWith('stateDiagram') ||
      t.startsWith('erDiagram') ||
      t.startsWith('gantt') ||
      t.startsWith('pie ') ||
      t.startsWith('journey')
    );
  }

  // Parse semantic markup from streaming response
  type ParsedContent = {
    type:
      | 'text'
      | 'thinking'
      | 'clarification'
      | 'comprehensive-questionnaire'
      | 'tool-call'
      | 'diagram-read'
      | 'diagram-cleared'
      | 'diagram-complete'
      | 'diff-view'
      | 'error';
    content: string;
    data?: Record<string, unknown>;
  };

  function parseSemanticContent(text: string): ParsedContent[] {
    const parts: ParsedContent[] = [];
    const tags = [
      'comprehensive-questionnaire',
      'tool-call',
      'thinking',
      'clarification',
      'diagram-read',
      'diagram-cleared',
      'diagram-complete',
      'diff-view',
      'error'
    ] as const;
    let cursor = 0;

    const findNextTag = (input: string, start: number) => {
      let nextIndex = -1;
      let nextTag: (typeof tags)[number] | null = null;
      for (const tag of tags) {
        const idx = input.indexOf(`<${tag}`, start);
        if (idx !== -1 && (nextIndex === -1 || idx < nextIndex)) {
          nextIndex = idx;
          nextTag = tag;
        }
      }
      return { nextIndex, nextTag };
    };

    while (cursor < text.length) {
      const { nextIndex, nextTag } = findNextTag(text, cursor);
      if (nextIndex === -1 || !nextTag) {
        const remainingText = text.slice(cursor).trim();
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText });
        }
        break;
      }

      if (nextIndex > cursor) {
        const before = text.slice(cursor, nextIndex).trim();
        if (before) {
          parts.push({ type: 'text', content: before });
        }
      }

      const closeTag = `</${nextTag}>`;
      const closeIndex = text.indexOf(closeTag, nextIndex);
      if (closeIndex === -1) {
        const remainingText = text.slice(nextIndex).trim();
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText });
        }
        break;
      }

      const fullTag = text.slice(nextIndex, closeIndex + closeTag.length);
      cursor = closeIndex + closeTag.length;

      if (nextTag === 'comprehensive-questionnaire') {
        const inner =
          fullTag.match(
            /<comprehensive-questionnaire>([\s\S]*?)<\/comprehensive-questionnaire>/
          )?.[1] || '';
        const context = inner.match(/<context>([^<]*)<\/context>/)?.[1] || '';
        const completionTime =
          inner.match(/<completion-time>([^<]*)<\/completion-time>/)?.[1] || '';
        const questionsMatch = inner.match(/<questions>([\s\S]*?)<\/questions>/)?.[1] || '';
        const questions: Array<{
          id: string;
          question: string;
          type: string;
          required: boolean;
          context?: string;
          options?: Array<{ id: string; label: string; description: string }>;
        }> = [];
        const qRegex =
          /<question id="([^"]+)" required="([^"]*)" type="([^"]+)">([\s\S]*?)<\/question>/g;
        let qMatch;
        while ((qMatch = qRegex.exec(questionsMatch)) !== null) {
          const questionContent = qMatch[4];
          const questionText = questionContent.match(/<prompt>([^<]*)<\/prompt>/)?.[1] || '';
          const questionContext = questionContent.match(/<context>([^<]*)<\/context>/)?.[1] || '';
          const optionsMatch = questionContent.match(/<options>([\s\S]*?)<\/options>/)?.[1] || '';
          const options: Array<{ id: string; label: string; description: string }> = [];
          const optRegex = /<option id="([^"]+)" label="([^"]+)">([\s\S]*?)<\/option>/g;
          let optMatch;
          while ((optMatch = optRegex.exec(optionsMatch)) !== null) {
            options.push({ id: optMatch[1], label: optMatch[2], description: optMatch[3] });
          }
          questions.push({
            id: qMatch[1],
            question: questionText,
            type: qMatch[3],
            required: qMatch[2] === 'true',
            context: questionContext || undefined,
            options: options.length > 0 ? options : undefined
          });
        }

        const questionnaireData = { context, questions, estimated_completion_time: completionTime };
        console.log('Parsed questionnaire data:', questionnaireData);

        parts.push({
          type: 'comprehensive-questionnaire',
          content: '',
          data: questionnaireData
        });
      } else if (nextTag === 'tool-call') {
        const toolMatch = fullTag.match(
          /<tool-call type="([^"]+)"(?:\s+operation="([^"]*)")?\s+status="([^"]+)">([\s\S]*?)<\/tool-call>/
        );
        if (toolMatch) {
          parts.push({
            type: 'tool-call',
            content: toolMatch[4],
            data: { toolType: toolMatch[1], operation: toolMatch[2] || '', status: toolMatch[3] }
          });
        }
      } else if (nextTag === 'thinking') {
        const thinkMatch = fullTag.match(/<thinking step="([^"]+)">([\s\S]*?)<\/thinking>/);
        if (thinkMatch) {
          parts.push({ type: 'thinking', content: thinkMatch[2], data: { step: thinkMatch[1] } });
        }
      } else if (nextTag === 'clarification') {
        const inner = fullTag.match(/<clarification>([\s\S]*?)<\/clarification>/)?.[1] || '';
        const question = inner.match(/<question>([^<]*)<\/question>/)?.[1] || '';
        const context = inner.match(/<context>([^<]*)<\/context>/)?.[1] || '';
        const optionsMatch = inner.match(/<options>([\s\S]*?)<\/options>/)?.[1] || '';
        const options: Array<{ id: string; label: string; description: string }> = [];
        const optRegex = /<option id="([^"]+)" label="([^"]+)">([\s\S]*?)<\/option>/g;
        let optMatch;
        while ((optMatch = optRegex.exec(optionsMatch)) !== null) {
          options.push({ id: optMatch[1], label: optMatch[2], description: optMatch[3] });
        }
        parts.push({ type: 'clarification', content: question, data: { context, options } });
      } else if (nextTag === 'diagram-read') {
        const inner = fullTag.match(/<diagram-read>([\s\S]*?)<\/diagram-read>/)?.[1] || '';
        const code = inner.match(/<code>([^<]*)<\/code>/)?.[1] || '';
        const metadataMatch = inner.match(/<metadata>([^<]*)<\/metadata>/)?.[1] || '';
        parts.push({ type: 'diagram-read', content: code, data: { metadata: metadataMatch } });
      } else if (nextTag === 'diagram-cleared') {
        const inner = fullTag.match(/<diagram-cleared>([\s\S]*?)<\/diagram-cleared>/)?.[1] || '';
        const confirmation = inner.match(/<confirmation>([^<]*)<\/confirmation>/)?.[1] || '';
        parts.push({ type: 'diagram-cleared', content: '', data: { confirmation } });
      } else if (nextTag === 'diagram-complete') {
        // Parse diagram-complete tag with operation, title, explanation, and code
        const attrMatch = fullTag.match(
          /<diagram-complete operation="([^"]*)" title="([^"]*)" explanation="([^"]*)">/
        );
        const inner =
          fullTag.match(/<diagram-complete[^>]*>([\s\S]*?)<\/diagram-complete>/)?.[1] || '';
        const code = inner.match(/<code>([\s\S]*?)<\/code>/)?.[1] || '';
        parts.push({
          type: 'diagram-complete',
          content: code,
          data: {
            operation: attrMatch?.[1] || 'update',
            title: attrMatch?.[2] || '',
            explanation: attrMatch?.[3] || '',
            code
          }
        });
      } else if (nextTag === 'diff-view') {
        // Parse diff-view tag with operation attribute and diff content
        const attrMatch = fullTag.match(/<diff-view operation="([^"]*)">/);
        const inner = fullTag.match(/<diff-view[^>]*>([\s\S]*?)<\/diff-view>/)?.[1] || '';
        parts.push({
          type: 'diff-view',
          content: inner,
          data: {
            operation: attrMatch?.[1] || 'update'
          }
        });
      } else if (nextTag === 'error') {
        const errMatch = fullTag.match(/<error type="([^"]*)">([\s\S]*?)<\/error>/);
        if (errMatch) {
          let errorContent = errMatch[2];
          let retryData: { toolCallId: string; toolCallName: string; originalArgs: string } | null =
            null;

          // Extract retry tool information if present
          // Use a more permissive pattern that handles encoded quotes in originalArgs
          const retryMatch = errorContent.match(
            /<retry-tool toolCallId="([^"]*)" toolCallName="([^"]*)" originalArgs="([\s\S]*?)"><\/retry-tool>/
          );
          if (retryMatch) {
            // Decode HTML entities in originalArgs
            const decodedArgs = retryMatch[3]
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            retryData = {
              toolCallId: retryMatch[1],
              toolCallName: retryMatch[2],
              originalArgs: decodedArgs
            };
            // Remove the retry-tool tag from the displayed content
            errorContent = errorContent.replace(/<retry-tool[\s\S]*?><\/retry-tool>/, '').trim();
          }

          parts.push({
            type: 'error',
            content: errorContent,
            data: { errorType: errMatch[1], retryData }
          });
        } else {
          // Fallback for old error format without type
          const fallbackMatch = fullTag.match(/<error>([\s\S]*?)<\/error>/);
          if (fallbackMatch) {
            parts.push({
              type: 'error',
              content: fallbackMatch[1],
              data: { errorType: 'general' }
            });
          }
        }
      }
    }

    return parts;
  }

  // State for selected clarification option
  let selectedClarificationOption = $state<string | null>(null);

  // State for questionnaire responses
  let questionnaireResponses = $state<Record<string, string>>({});
  // Store current questionnaire data to include full questions in submission
  let currentQuestionnaire = $state<{
    context?: string;
    questions?: Array<{
      id: string;
      question: string;
      type: string;
      required: boolean;
      context?: string;
      options?: Array<{ id: string; label: string; description: string }>;
    }>;
    estimated_completion_time?: string;
  } | null>(null);

  function handleClarificationSelect(optionId: string, optionLabel: string) {
    selectedClarificationOption = optionId;
    messageText = optionLabel;
  }

  function handleQuestionnaireResponse(questionId: string, response: string) {
    questionnaireResponses = {
      ...questionnaireResponses,
      [questionId]: response
    };
  }

  async function handleQuestionnaireSubmit() {
    console.log('Questionnaire submit clicked');
    console.log('Current responses:', questionnaireResponses);
    console.log('Current questionnaire data:', currentQuestionnaire);

    // Only proceed if we have questionnaire data stored
    if (!currentQuestionnaire) {
      console.error('No questionnaire data available');
      toast.error('Questionnaire data not available. Please try again.');
      return;
    }

    // Build comprehensive response text with full questions and answers
    let responseText = '';

    if (currentQuestionnaire.context) {
      responseText += `Context: ${currentQuestionnaire.context}\n\n`;
    }

    responseText += 'Questionnaire Responses:\n';

    if (currentQuestionnaire.questions) {
      for (const question of currentQuestionnaire.questions) {
        const answer = questionnaireResponses[question.id];
        if (answer) {
          responseText += `Q: ${question.question}\n`;
          responseText += `A: ${answer}\n\n`;
        }
      }
    } else {
      // This should not happen since we check for currentQuestionnaire above
      console.error('No questions found in questionnaire data');
      toast.error('Questionnaire data is incomplete. Please try again.');
      return;
    }

    if (responseText.trim()) {
      await sendChatRequest(responseText);
      // Don't clear questionnaire immediately - let it stay until AI responds
      // The questionnaire will be cleared when a new request starts or when AI responds
    }
  }

  async function handleRetry(toolCallId: string, toolCallName: string, originalArgs: string) {
    if (!currentConversationId) {
      toast.error('No conversation available');
      return;
    }

    // Find the last user message
    const lastUserMessage = sessionMessages.filter((msg) => msg.role === 'user').pop();

    if (!lastUserMessage) {
      toast.error('No user message found to retry');
      return;
    }

    // Add retry metadata to the last user message
    const retryMessage = {
      ...lastUserMessage,
      parts: lastUserMessage.parts?.map((part) =>
        part.type === 'text'
          ? {
              ...part,
              // Add retry data as metadata
              _retry: {
                toolCallId,
                toolCallName,
                originalArgs
              }
            }
          : part
      )
    };

    requestStatus = 'streaming';

    // Start cycling loading text for any streaming response
    startLoadingTextCycle();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: retryMessage,
          conversationId: currentConversationId,
          currentDiagram: $stateStore.code,
          mode: promptMode,
          model: selectedModelId
        }),
        signal: abortController?.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.message === 'string' ? err.message : res.statusText);
      }

      // Handle the retry response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantMessageId = `msg_${Date.now() + 1}`;

      // Add assistant message immediately
      const assistantMessage: UIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }]
      };
      sessionMessages = [...sessionMessages, assistantMessage];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'text') {
                  assistantText += data.content;
                } else if (data.type === 'done') {
                  // Flush any pending updates before setting idle
                  if (pendingMessageId && pendingAssistantText) {
                    flushMessageUpdate(pendingMessageId, pendingAssistantText);
                  }
                  flushEditorTasksUpdate();
                  requestStatus = 'idle';
                  // Clear input field when stream completes
                  messageText = '';
                  break;
                } else if (data.type === 'error') {
                  assistantText += `\n\n<error type="general">${data.message}</error>\n`;
                  break;
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            }
          }

          // Update assistant message with throttling to prevent flickering
          throttledMessageUpdate(assistantMessageId, assistantText);
        }
      }

      // Final immediate update before setting idle
      flushMessageUpdate(assistantMessageId, assistantText);

      requestStatus = 'idle';
    } catch (error) {
      console.error('Retry failed:', error);
      toast.error('Retry failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      requestStatus = 'error';
    }
  }

  // Format text naturally without forcing bullet points
  function formatAsBulletPoints(text: string): string {
    if (!text) return '';

    // Return text as-is without forcing bullet points
    return text.trim();
  }

  // Split AI response into 3 sections: Thinking/Plan, Diagram, Conclude
  function parseThreeSectionResponse(text: string): {
    thinking: string;
    diagram: string;
    conclude: string;
  } {
    const cleanText = sanitizeModelText(text);
    // Try exact heading match first
    const thinkingMatch = cleanText.match(
      /\*\*Thinking\/Plan\*\*([\s\S]*?)(?=\*\*Diagram\*\*|\*\*Conclude\*\*|$)/i
    );
    const diagramMatch = cleanText.match(
      /\*\*Diagram\*\*([\s\S]*?)(?=\*\*Thinking\/Plan\*\*|\*\*Conclude\*\*|$)/i
    );
    const concludeMatch = cleanText.match(
      /\*\*Conclude\*\*([\s\S]*?)(?=\*\*Thinking\/Plan\*\*|\*\*Diagram\*\*|$)/i
    );

    const thinking = thinkingMatch?.[1]?.trim() || '';
    const diagram = diagramMatch?.[1]?.trim() || '';
    const conclude = concludeMatch?.[1]?.trim() || '';

    // If we got all three sections, return them
    if (thinking && diagram && conclude) {
      return { thinking, diagram, conclude };
    }

    // Fallback: try to split by common patterns if exact match fails
    const lines = cleanText.split('\n');
    const sections: { thinking: string[]; diagram: string[]; conclude: string[] } = {
      thinking: [],
      diagram: [],
      conclude: []
    };

    let currentSection: keyof typeof sections = 'thinking';
    let hasDiagramSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/\*\*thinking\/plan\*\*/i)) {
        currentSection = 'thinking';
        continue;
      }
      if (trimmed.match(/\*\*diagram\*\*/i)) {
        currentSection = 'diagram';
        hasDiagramSection = true;
        continue;
      }
      if (trimmed.match(/\*\*conclude\*\*/i)) {
        currentSection = 'conclude';
        continue;
      }

      sections[currentSection].push(line);
    }

    // If no clear sections were found, treat everything as thinking with embedded diagram
    if (!hasDiagramSection && !thinking && !conclude) {
      const mermaidMatch = cleanText.match(/```mermaid\n?([\s\S]*?)```/);
      if (mermaidMatch) {
        const beforeDiagram = cleanText.substring(0, mermaidMatch.index).trim();
        const afterDiagram = cleanText
          .substring(mermaidMatch.index! + mermaidMatch[0].length)
          .trim();
        return {
          thinking: beforeDiagram,
          diagram: mermaidMatch[1],
          conclude: afterDiagram
        };
      }
      // Last resort: everything is thinking, no diagram/conclude
      return { thinking: cleanText, diagram: '', conclude: '' };
    }

    return {
      thinking: sections.thinking.join('\n').trim(),
      diagram: sections.diagram.join('\n').trim(),
      conclude: sections.conclude.join('\n').trim()
    };
  }

  function extractMermaidFromThreeSectionResponse(text: string): string | null {
    const parsed = parseThreeSectionResponse(text);
    // Extract Mermaid only from the Diagram section
    if (parsed.diagram) {
      const match = parsed.diagram.match(/```mermaid\n?([\s\S]*?)```/);
      if (match && match[1]) {
        return match[1].trim();
      }
      // If no fenced block but content looks like Mermaid
      const trimmed = parsed.diagram.trim();
      if (
        trimmed.startsWith('graph ') ||
        trimmed.startsWith('flowchart ') ||
        trimmed.startsWith('sequenceDiagram') ||
        trimmed.startsWith('classDiagram') ||
        trimmed.startsWith('stateDiagram') ||
        trimmed.startsWith('erDiagram') ||
        trimmed.startsWith('gantt') ||
        trimmed.startsWith('pie ') ||
        trimmed.startsWith('journey')
      ) {
        return trimmed;
      }
    }
    return null;
  }

  function extractMermaidSnippet(text: string): string | null {
    if (!text) return null;
    const match = text.match(/```mermaid\n?([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('graph ') ||
      trimmed.startsWith('flowchart ') ||
      trimmed.startsWith('sequenceDiagram') ||
      trimmed.startsWith('classDiagram') ||
      trimmed.startsWith('stateDiagram') ||
      trimmed.startsWith('erDiagram') ||
      trimmed.startsWith('gantt') ||
      trimmed.startsWith('pie ') ||
      trimmed.startsWith('journey')
    ) {
      return trimmed;
    }
    return null;
  }

  function extractMermaidFromMessage(message: UIMessage): string | null {
    const text =
      message.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n\n') ||
      (typeof (message as unknown as { content?: unknown }).content === 'string'
        ? (message as unknown as { content: string }).content
        : '');
    return extractMermaidSnippet(text);
  }

  function formatFileLabel(part: unknown): string {
    if (typeof part !== 'object' || part === null) return 'File';
    const obj = part as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    if (name) return name;
    const filename = typeof obj.filename === 'string' ? obj.filename : undefined;
    if (filename) return filename;
    const url = typeof obj.url === 'string' ? obj.url : undefined;
    if (url) {
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop();
        return last || 'File';
      } catch {
        return 'File';
      }
    }
    return 'File';
  }

  // Sanitize model artifacts (e.g., safety tags from providers)
  function sanitizeModelText(text: string): string {
    if (!text) return text;
    return text.replaceAll('[/s]', '').replaceAll('[s]', '');
  }

  // Conversation state management
  let currentConversationId = $state<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let currentConversationTitle = $state<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let initializing = $state(false);

  // Historical messages (loaded from DB, for display only)
  let historicalMessages = $state<UIMessage[]>([]);

  // Session messages (current browser session only)
  let sessionMessages = $state<UIMessage[]>([]);

  // Define derived messages (deduped and sorted by timestamp)
  let allMessages = $derived.by(() => {
    const merged = [...historicalMessages, ...sessionMessages];
    const seen = new Set<string>();
    const result: UIMessage[] = [];

    for (const msg of merged) {
      // Use ID for deduplication when available
      if (typeof msg.id === 'string' && msg.id.length > 0) {
        if (seen.has(msg.id)) continue;
        seen.add(msg.id);
        result.push(msg);
        continue;
      }

      // For messages without IDs, use content-based key only if there's actual content
      const text = getMessageText(msg);
      if (!text || text.length === 0) {
        // Include messages with no content (e.g., streaming placeholders)
        result.push(msg);
        continue;
      }

      const contentKey = `c:${msg.role}:${text}`;
      if (seen.has(contentKey)) continue;
      seen.add(contentKey);
      result.push(msg);
    }

    // Sort messages by timestamp (oldest first)
    return result.sort((a, b) => {
      const aTime = (a as any).timestamp ? new Date((a as any).timestamp).getTime() : 0;
      const bTime = (b as any).timestamp ? new Date((b as any).timestamp).getTime() : 0;
      return aTime - bTime;
    });
  });

  type RequestStatus = 'idle' | 'submitted' | 'streaming' | 'error';
  let requestStatus = $state<RequestStatus>('idle');

  // Context engine state
  let conversationContext = $state<ConversationContext | null>(null);
  let lastTrackedCode = $state<string>('');

  function appendMermaidSnippet(base: string, snippet: string): string {
    // Ensure base has trailing newline if not empty
    const normalizedBase = base.length === 0 ? base : base.endsWith('\n') ? base : `${base}\n`;

    // Clean up the snippet - remove any leading/trailing whitespace but preserve internal structure
    const cleanSnippet = snippet.trim();

    // If snippet is empty after trimming, return base unchanged
    if (!cleanSnippet) {
      return base;
    }

    // Append with proper newline handling
    return `${normalizedBase}${cleanSnippet}\n`;
  }

  // Combine historical and current session messages for display

  function updateConversationContext() {
    if (!currentConversationId) return;

    const currentState = $stateStore;
    conversationContext = contextEngine.buildConversationContext(
      currentConversationId,
      allMessages as any[],
      currentState
    );

    // Track diagram changes
    if (lastTrackedCode !== currentState.code) {
      contextEngine.trackDiagramChange(currentConversationId, lastTrackedCode, currentState.code);
      lastTrackedCode = currentState.code;
    }
  }

  onMount(() => {
    let authCleanup: (() => void) | null = null;

    // Initialize asynchronously
    (async () => {
      try {
        // Don't set initializing to true immediately - let UI render first
        // initializing = true;

        // Resolve signed-in user email (used as per-user key for memory/embeddings)
        try {
          const {
            data: { session }
          } = await supabase.auth.getSession();
          userEmail = session?.user?.email ?? null;

          const {
            data: { subscription }
          } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            userEmail = nextSession?.user?.email ?? null;
          });

          // Store cleanup function for proper unsubscription
          authCleanup = () => subscription.unsubscribe();
        } catch (error) {
          console.warn('Failed to read Supabase session:', error);
        }

        // Try to load existing conversation from localStorage and server
        const storedConversationId = localStorage.getItem('currentConversationId');
        console.log('Stored conversation ID:', storedConversationId);

        if (storedConversationId) {
          // Load conversation from server with proper error handling
          try {
            console.log('Loading conversation from server:', storedConversationId);
            await loadConversationFromServer(storedConversationId);
            console.log('Conversation loaded successfully');
          } catch (error) {
            console.warn('Failed to load conversation from server, creating new one:', error);
            // If server loading fails, create a new conversation
            const response = await createConversation({
              title: 'New Chat'
            });
            currentConversationId = response.conversation.id;
            currentConversationTitle = response.conversation.title;
            localStorage.setItem('currentConversationId', currentConversationId || '');
            console.log('Created new conversation:', currentConversationId);
          }
        } else {
          // Create new conversation immediately if none exists
          console.log('No stored conversation ID, creating new conversation');
          const response = await createConversation({
            title: 'New Chat'
          });
          currentConversationId = response.conversation.id;
          currentConversationTitle = response.conversation.title;
          localStorage.setItem('currentConversationId', currentConversationId || '');
          console.log('Created new conversation:', currentConversationId);
        }

        // Sync snapshot map
        await syncSnapshotMap();

        // Initialize context engine
        if (currentConversationId) {
          lastTrackedCode = $stateStore.code;
          updateConversationContext();
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to initialize chat');
      }
    })();

    // Set up periodic sync (low frequency; we also debounce on new messages)
    const syncInterval = setInterval(() => {
      scheduleSyncMessagesToServer(0);
    }, 120000);

    // Sync on page visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        scheduleSyncMessagesToServer(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Register cleanup for component destruction
    onDestroy(() => {
      if (authCleanup) {
        authCleanup();
      }
      // Note: Model subscriptions now use $derived, no manual cleanup needed
      // Clean up loading timer
      if (loadingTimer) {
        clearInterval(loadingTimer);
        loadingTimer = null;
      }
      // Clean up abort controller
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      // Clean up active request timeout
      if (activeTimeoutId) {
        clearTimeout(activeTimeoutId);
        activeTimeoutId = null;
      }
      // Sync messages before unmount
      scheduleSyncMessagesToServer(0);
      // Clean up periodic sync
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pendingSyncTimeout) clearTimeout(pendingSyncTimeout);
    });
  });

  async function syncSnapshotMap() {
    if (!currentConversationId) return;
    try {
      const response = await listSnapshots(currentConversationId);
      const nextSnapshotMap = new SvelteMap<string, string>();
      for (const snapshot of response.snapshots) {
        if (snapshot.message_id) {
          nextSnapshotMap.set(snapshot.message_id, snapshot.message_id);
        }
      }
      snapshotMap = nextSnapshotMap;
    } catch (error) {
      console.error('Failed to sync snapshot map:', error);
      toast.error('Failed to sync snapshot map');
    }
  }

  // Streaming performance tracking
  let streamingStartTime = $state<number>(0);
  let streamingCharCount = $state<number>(0);

  // Track streaming performance window
  $effect(() => {
    if (requestStatus === 'streaming') {
      streamingStartTime = Date.now();
      streamingCharCount = 0;
    } else if (streamingStartTime > 0) {
      streamingStartTime = 0;
      streamingCharCount = 0;
    }
  });

  // Safety mechanism: reset request status if stuck in streaming state
  let streamingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    // Clear any existing timeout first
    if (streamingTimeoutId !== null) {
      clearTimeout(streamingTimeoutId);
      streamingTimeoutId = null;
    }

    if (requestStatus === 'streaming' && streamingStartTime > 0) {
      streamingTimeoutId = setTimeout(() => {
        if (requestStatus === 'streaming') {
          console.warn('Request status stuck in streaming state, resetting to idle');
          // Flush any pending updates before resetting
          if (pendingMessageId && pendingAssistantText) {
            flushMessageUpdate(pendingMessageId, pendingAssistantText);
          }
          flushEditorTasksUpdate();
          requestStatus = 'idle';
          isStreamingMermaid = false;
          currentToolCall = null;
          abortController = null;
        }
        streamingTimeoutId = null;
      }, 30000); // 30 second safety timeout
    }

    return () => {
      if (streamingTimeoutId !== null) {
        clearTimeout(streamingTimeoutId);
        streamingTimeoutId = null;
      }
    };
  });

  let promptStatus = $derived(statusMap[requestStatus] ?? 'idle');
  let isStreaming = $derived(requestStatus === 'streaming');
  let isSubmitting = $derived(requestStatus === 'submitted');
  let isThinking = $derived(requestStatus === 'streaming' || requestStatus === 'submitted');

  // Protocol switched: no streaming updates

  // Auto-scroll to bottom when messages change

  $effect(() => {
    const messageCount = sessionMessages.length;
    if (messageCount > 0 && messagesContainerRef) {
      const timeoutId = setTimeout(() => {
        messagesContainerRef?.scrollTo({
          top: messagesContainerRef.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  });

  // Error status is handled inline in request function

  async function sendChatRequest(text: string) {
    // Prevent multiple simultaneous requests
    if (isStreaming || isSubmitting) {
      console.log('Request already in progress, ignoring');
      return;
    }

    if (!currentConversationId) {
      throw new Error('No conversation ID available. Please try again.');
    }

    // Set status to submitted first, then streaming
    requestStatus = 'submitted';

    // Check if this is the first message (no prior messages in session or history)
    const isFirstMessage = sessionMessages.length === 0 && historicalMessages.length === 0;

    // If first message, generate and update title based on the message content
    if (isFirstMessage && currentConversationId) {
      const generatedTitle = generateConversationTitle(text);
      currentConversationTitle = generatedTitle;

      // Update conversation title in both API and local store
      const updatePromise = updateConversation(currentConversationId, { title: generatedTitle });

      // Also update local chat store for immediate UI updates
      chatStore.entities.updateConversation(currentConversationId, {
        title: generatedTitle,
        updatedAt: new Date().toISOString()
      });

      updatePromise.catch((error) => {
        console.warn('Failed to update conversation title on server:', error);
      });
    }

    // Clear any existing questionnaire data when starting a new request
    // But preserve if there's an active questionnaire being displayed
    if (!currentQuestionnaire || Object.keys(questionnaireResponses).length === 0) {
      currentQuestionnaire = null;
      questionnaireResponses = {};
    }

    // Reset code changing state when starting a new request
    isCodeChanging = false;

    const userMessage: UIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text }]
    };

    sessionMessages = [...sessionMessages, userMessage];
    scheduleSyncMessagesToServer();

    // Persist user message immediately for better reload persistence
    try {
      await createMessage(currentConversationId, {
        role: 'user',
        content: text,
        parts: [{ type: 'text', text }]
      });
    } catch (error) {
      console.warn('Failed to save user message (will retry on sync):', error);
    }

    // Set to streaming state after message is saved
    requestStatus = 'streaming';
    lastError = null;

    // Start cycling loading text for any streaming response
    startLoadingTextCycle();

    // Create AbortController for timeout and cancellation
    // Clean up any existing timeout first to prevent memory leaks
    if (activeTimeoutId) {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = null;
    }
    abortController = new AbortController();
    activeTimeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }
    }, 180000); // 3 minute timeout (increased for slower free models)

    try {
      const requestBody = {
        conversationId: currentConversationId,
        currentDiagram: $stateStore.code,
        message: text,
        mode: promptMode,
        model: selectedModelId,
        userId: userEmail ?? MemoryManager.getOrCreateUserId()
      };

      console.log('Sending chat request:', requestBody);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      // Clear the timeout since request completed - use centralized tracking
      if (activeTimeoutId) {
        clearTimeout(activeTimeoutId);
        activeTimeoutId = null;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.message === 'string' ? err.message : res.statusText);
      }

      // Handle SSE-style streaming response
      if (res.headers.get('content-type')?.includes('text/plain')) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        const assistantMessageId = `msg_${Date.now() + 1}`;

        // Create assistant message immediately for streaming
        const assistantMessage: UIMessage = {
          id: assistantMessageId,
          role: 'assistant',
          parts: [{ type: 'text', text: '' }]
        };

        sessionMessages = [...sessionMessages, assistantMessage];

        if (reader) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              // Parse SSE events from buffer
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || ''; // Keep incomplete event in buffer

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                try {
                  const event = JSON.parse(line.slice(6));

                  // Debug: log all events
                  if (event.type !== 'text') {
                    console.log('SSE Event received:', event.type, event);
                  }

                  switch (event.type) {
                    case 'text':
                    case 'text-delta':
                      // Regular text content (text-delta is AI SDK v6 format)
                      const textContent = event.content || event.delta || '';
                      console.log(
                        'Text event received:',
                        textContent?.substring(0, 100) + (textContent?.length > 100 ? '...' : '')
                      );
                      assistantText += textContent;
                      streamingCharCount += textContent.length;
                      // Force immediate UI update for text content
                      throttledMessageUpdate(assistantMessageId, assistantText);
                      break;

                    case 'text-start':
                      // AI SDK v6 text start event - just log it
                      console.log('Text stream started:', event.id);
                      break;

                    case 'tool-input-start':
                      // AI SDK v6 tool call started
                      console.log('Tool input start:', event.toolName, event.toolCallId);
                      break;

                    case 'tool-input-delta':
                      // AI SDK v6 tool input streaming - accumulate input
                      console.log('Tool input delta:', event.toolName, event.inputTextDelta);
                      break;

                    case 'tool-input-available':
                      // AI SDK v6 tool input complete
                      console.log('Tool input available:', event.toolName, event.input);
                      break;

                    case 'tool-result':
                      // AI SDK v6 tool execution result
                      console.log('Tool result:', event.toolName, event.result);
                      break;

                    case 'tool-call-start':
                      // Use centralized tool state handler
                      updateToolState(event);

                      // Legacy state updates (to be removed in Phase 4)
                      currentToolStart = {
                        id: event.id,
                        name: event.name,
                        message: event.message || 'Processing...'
                      };

                      if (event.name === 'create_diagram') {
                        isStreamingMermaid = true;
                        isGeneratingDiagram = true;
                        currentToolCall = { id: event.id, name: event.name, partialCode: '' };
                        previousDiagramMap.set(assistantMessage.id || '', $stateStore.code || '');
                      } else if (event.name === 'thinking') {
                        isReasoningStreaming = true;
                        reasoningContent = '';
                      } else if (event.name === 'comprehensive_questionnaire') {
                        isPreparingQuestionnaire = true;
                      } else if (event.name === 'diagram_editor') {
                        isGeneratingDiagram = true;
                        previousDiagramMap.set(assistantMessage.id || '', $stateStore.code || '');
                      }
                      break;

                    case 'thinking_update':
                      // Use centralized tool state handler
                      updateToolState(event);

                      // Real-time thinking content update (legacy - to be removed)
                      const existingThinkingCall = assistantText.match(
                        /<tool-call type="thinking"[^>]*>.*?<\/tool-call>/
                      );
                      if (existingThinkingCall) {
                        assistantText = assistantText.replace(
                          /<tool-call type="thinking"[^>]*>.*?<\/tool-call>/g,
                          ''
                        );
                      }
                      if (!isReasoningStreaming) {
                        isReasoningStreaming = true;
                        reasoningContent = '';
                      }
                      reasoningContent = event.partial_thought + ' ';
                      assistantText += `\n\n<tool-call type="thinking" status="running">Thinking: ${event.partial_thought}...</tool-call>\n`;
                      break;

                    case 'comprehensive-questionnaire-start':
                      // Use centralized tool state handler
                      updateToolState(event);
                      assistantText += `\n\n<tool-call type="comprehensive-questionnaire" status="running">${event.message}</tool-call>\n`;
                      break;

                    case 'comprehensive-questionnaire-complete':
                      // Use centralized tool state handler
                      updateToolState(event);
                      // Questionnaire completed successfully - remove loading state only, keep the questionnaire
                      assistantText = assistantText.replace(
                        /<tool-call type="comprehensive-questionnaire"[^>]*>.*?<\/tool-call>/g,
                        ''
                      );
                      break;

                    case 'comprehensive-questionnaire':
                      // Use centralized tool state handler
                      updateToolState(event);
                      // Multi-question questionnaire - render as comprehensive form
                      assistantText = assistantText.replace(
                        /<tool-call type="comprehensive-questionnaire"[^>]*>.*?<\/tool-call>/g,
                        ''
                      );

                      // Store questionnaire data for submission
                      currentQuestionnaire = {
                        context: event.context,
                        questions: event.questions,
                        estimated_completion_time: event.estimated_completion_time
                      };

                      console.log('Questionnaire data stored:', currentQuestionnaire);

                      // Add questionnaire HTML for parsing (but don't render here)
                      let questionnaireHtml = `\n\n<comprehensive-questionnaire>\n`;
                      if (event.context) {
                        questionnaireHtml += `<context>${event.context}</context>\n`;
                      }
                      if (event.estimated_completion_time) {
                        questionnaireHtml += `<completion-time>${event.estimated_completion_time}</completion-time>\n`;
                      }
                      questionnaireHtml += `<questions>\n`;
                      for (const q of event.questions || []) {
                        questionnaireHtml += `<question id="${q.id}" required="${q.required}" type="${q.type}">\n`;
                        questionnaireHtml += `<prompt>${q.question}</prompt>\n`;
                        if (q.context) {
                          questionnaireHtml += `<context>${q.context}</context>\n`;
                        }
                        if (q.type === 'multiple_choice' && q.options) {
                          questionnaireHtml += `<options>\n`;
                          for (const opt of q.options) {
                            questionnaireHtml += `<option id="${opt.id}" label="${opt.label}">${opt.description || ''}</option>\n`;
                          }
                          questionnaireHtml += `</options>\n`;
                        }
                        questionnaireHtml += `</question>\n`;
                      }
                      questionnaireHtml += `</questions>\n</comprehensive-questionnaire>\n`;
                      assistantText += questionnaireHtml;

                      // Note: Don't stop streaming here - let the server control when to end
                      // Flush the updated assistantText with questionnaire content
                      flushMessageUpdate(assistantMessageId, assistantText);
                      flushEditorTasksUpdate();
                      // Keep streaming state active to allow continued text content
                      isReasoningStreaming = false;
                      break;

                    case 'diagram_editor':
                    case 'diagram_editor_start':
                      // New unified diagram_editor start event
                      console.log('Received diagram_editor event:', event);
                      const deTaskId = event.taskId || `${event.operation}-${Date.now()}`;

                      // Prevent multiple read operations
                      if (
                        typeof event === 'object' &&
                        'operation' in event &&
                        event.operation === 'read' &&
                        isReadInProgress
                      ) {
                        console.log('Skipping duplicate read operation');
                        break;
                      }

                      // Clear existing tasks of the same operation to prevent duplicates
                      editorTasks = editorTasks.filter(
                        (task: any) =>
                          task &&
                          typeof task === 'object' &&
                          'operation' in task &&
                          task.operation !== (event as any).operation
                      );

                      if (
                        typeof event === 'object' &&
                        'operation' in event &&
                        ['read'].includes(event.operation as string)
                      ) {
                        isReadInProgress = true;
                      }

                      // Track code changes for operations that modify the diagram
                      if (
                        typeof event === 'object' &&
                        'operation' in event &&
                        ['create', 'update', 'patch', 'clear'].includes(event.operation as string)
                      ) {
                        isCodeChanging = true;
                      }

                      const newTask = {
                        id: deTaskId,
                        operation: (event as any).operation as DiagramEditorOperation,
                        title: getOperationTitle(
                          (event as any).operation as DiagramEditorOperation
                        ),
                        status: 'in_progress' as const,
                        progress: 0,
                        details: (event as any).message || 'Processing...',
                        startTime: Date.now(),
                        estimatedDuration: (event as any).estimatedDuration,
                        metadata: {
                          diagramType: (event as any).diagramType
                        }
                      } as any; // Cast to any since it doesn't match the union type exactly

                      editorTasks = [...editorTasks, newTask];
                      assistantText += `\n\n<tool-call type="diagram_editor" operation="${event.operation}" status="running">${event.message}</tool-call>\n`;
                      break;

                    case 'diagram_editor_progress':
                      // Update task progress with throttling to prevent flickering
                      throttledEditorTasksUpdate(
                        editorTasks.map((task) =>
                          (task as any).id === event.taskId
                            ? {
                                ...(task as any),
                                progress: event.progress,
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  currentStep: event.currentStep,
                                  stepDetails: event.stepDetails
                                }
                              }
                            : task
                        )
                      );

                      // Update unified tool execution tracking with progress
                      if (currentToolStart) {
                        activeToolExecutions = activeToolExecutions.map((t) =>
                          t.id === currentToolStart!.id
                            ? {
                                ...t,
                                progress: event.progress || 0,
                                message: event.message || t.message
                              }
                            : t
                        );
                      }
                      break;

                    case 'diagram_editor_task':
                      // Update task with Task UI data
                      throttledEditorTasksUpdate(
                        editorTasks.map((task) =>
                          (task as any).id === event.taskId
                            ? {
                                ...(task as any),
                                title: event.task?.title || (task as any).title,
                                status: event.task?.status || (task as any).status,
                                progress: event.task?.progress || (task as any).progress,
                                details: event.task?.details || (task as any).details,
                                metadata: {
                                  ...(task as any).metadata,
                                  taskData: event.task
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_partial_code':
                      // Use centralized tool state handler for streaming code
                      updateToolState(event);

                      // Update task with partial code and sync to editor - throttled to prevent flickering
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  partialCode: event.partialCode,
                                  lineCount: event.lineCount,
                                  isComplete: event.isComplete
                                }
                              }
                            : task
                        )
                      );

                      // Sync partial code to editor for live preview
                      if (
                        event.partialCode &&
                        (event.operation === 'create' ||
                          event.operation === 'update' ||
                          event.operation === 'patch')
                      ) {
                        syncSnippetToEditor(event.partialCode, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.partialCode);
                      }
                      break;

                    case 'diagram_editor_change':
                      // Handle individual change streaming
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              metadata: {
                                ...(task as any).metadata,
                                changes: {
                                  additions: event.additions,
                                  removals: event.removals,
                                  total: event.totalChanges,
                                  currentChange: event.currentChange
                                },
                                streamedChanges: [
                                  ...((task as any).metadata?.streamedChanges || []),
                                  event.change
                                ]
                              }
                            }
                          : task
                      );
                      break;

                    case 'diagram_editor_complete':
                      // Complete the task and sync final code to editor
                      console.log('Received diagram_editor_complete event:', event);
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              status: 'completed' as const,
                              progress: 100,
                              details: event.explanation || 'Completed successfully',
                              metadata: {
                                ...(task as any).metadata,
                                ...event.metadata,
                                code: event.diagramCode,
                                diagramType: event.diagramType || event.metadata?.diagramType,
                                changesMade: event.explanation,
                                lineCount: event.metadata?.lineCount,
                                isValid: event.metadata?.isValid,
                                validation: event.metadata?.validation,
                                validationErrors: event.metadata?.validationErrors
                              }
                            }
                          : task
                      );

                      // Reset read state when read operation completes
                      if (event.operation === 'read') {
                        isReadInProgress = false;
                      }

                      // Reset code changing state when modify operations complete
                      if (
                        ['create', 'update', 'patch', 'clear'].includes(event.operation as string)
                      ) {
                        isCodeChanging = false;
                      }

                      // Don't remove the tool-call placeholder - let it be naturally replaced by semantic content

                      // Sync final code to editor
                      if (event.diagramCode !== undefined) {
                        syncSnippetToEditor(event.diagramCode, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.diagramCode);

                        // Generate diff if we have a previous diagram (for create/update/patch operations)
                        const prevDiagram = previousDiagramMap.get(assistantMessageId);
                        if (
                          (event.operation === 'create' ||
                            event.operation === 'update' ||
                            event.operation === 'patch') &&
                          prevDiagram
                        ) {
                          const diff = generateDiffHighlight(prevDiagram, event.diagramCode);
                          currentDiffMap.set(assistantMessageId, diff);
                          showDiffMap.set(assistantMessageId, true);

                          // Add diff view to assistant text
                          assistantText += `\n\n<diff-view operation="${event.operation}">\n${diff}\n</diff-view>\n`;
                        }

                        // Update previousDiagram for next comparison
                        previousDiagramMap.set(assistantMessageId, event.diagramCode);

                        // Add semantic content for the completed operation
                        if (event.operation === 'read') {
                          assistantText += `\n\n<diagram-read>\n`;
                          assistantText += `<code>${event.diagramCode}</code>\n`;
                          if (event.metadata) {
                            assistantText += `<metadata>${JSON.stringify(event.metadata)}</metadata>\n`;
                          }
                          assistantText += `</diagram-read>\n`;
                        } else if (event.operation === 'create' || event.operation === 'update') {
                          // Add completion message with diff toggle
                          assistantText += `\n\n<diagram-complete operation="${event.operation}" title="${event.title || ''}" explanation="${event.explanation || ''}">\n`;
                          assistantText += `<code>${event.diagramCode}</code>\n`;
                          assistantText += `</diagram-complete>\n`;
                        } else if (event.operation === 'clear') {
                          assistantText += `\n\n<diagram-cleared>\n`;
                          assistantText += `<confirmation>${event.explanation || 'Diagram cleared'}</confirmation>\n`;
                          assistantText += `</diagram-cleared>\n`;
                          // Reset diff state when clearing
                          previousDiagramMap.set(assistantMessageId, '');
                          showDiffMap.set(assistantMessageId, false);
                          currentDiffMap.set(assistantMessageId, '');
                        } else if (event.operation === 'patch') {
                          // Add completion message with diff toggle
                          assistantText += `\n\n<diagram-complete operation="patch" title="${event.title || 'Diagram patched'}" explanation="${event.explanation || ''}">\n`;
                          assistantText += `<code>${event.diagramCode}</code>\n`;
                          assistantText += `</diagram-complete>\n`;
                        }
                      }
                      break;

                    case 'diagram_editor_error':
                      // Handle error
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              status: 'error' as const,
                              details: event.error,
                              metadata: {
                                ...(task as any).metadata,
                                errorType: event.errorType,
                                suggestions: event.suggestions,
                                canRetry: event.canRetry,
                                retryCount: event.retryCount
                              }
                            }
                          : task
                      );

                      // Reset read state when read operation errors
                      if (event.operation === 'read') {
                        isReadInProgress = false;
                      }

                      // Reset code changing state when modify operations error
                      if (
                        ['create', 'update', 'patch', 'clear'].includes(event.operation as string)
                      ) {
                        isCodeChanging = false;
                      }

                      // Don't remove the tool-call placeholder - let it be naturally replaced by semantic content
                      assistantText += `\n\n<error type="diagram_editor">${event.error}</error>\n`;
                      break;

                    case 'diagram_editor_patch_start':
                      // Patch operation started
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              details: event.message,
                              metadata: {
                                ...(task as any).metadata,
                                totalPatches: event.patchCount
                              }
                            }
                          : task
                      );
                      break;

                    case 'diagram_editor_patch_progress':
                      // Update patch progress - throttled to prevent flickering
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                progress: Math.round(
                                  ((event.patchIndex + 1) / event.totalPatches) * 100
                                ),
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  patchIndex: event.patchIndex,
                                  totalPatches: event.totalPatches,
                                  currentPatch: event.currentPatch
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_patch_error':
                      // Handle patch error
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              metadata: {
                                ...(task as any).metadata,
                                patchErrors: [
                                  ...((task as any).metadata?.patchErrors || []),
                                  {
                                    patch: event.patch,
                                    error: event.error,
                                    canContinue: event.canContinue,
                                    retryCount: event.retryCount
                                  }
                                ]
                              }
                            }
                          : task
                      );
                      break;

                    case 'diagram_editor_patch_complete':
                      // Patch operation completed
                      editorTasks = editorTasks.map((task: any) =>
                        typeof task === 'object' && 'id' in task && task.id === event.taskId
                          ? {
                              ...(task as any),
                              metadata: {
                                ...(task as any).metadata,
                                appliedCount: event.appliedCount,
                                failedCount: event.failedCount,
                                code: event.finalCode
                              }
                            }
                          : task
                      );

                      // Sync final patched code to editor
                      if (event.finalCode) {
                        syncSnippetToEditor(event.finalCode, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.finalCode);
                      }
                      break;

                    // Enhanced validation events
                    case 'diagram_editor_validation_start':
                      diagramOp = {
                        ...diagramOp,
                        isValidating: true,
                        validationStatus: 'pending',
                        validationMessage: event.message || 'Validating diagram code...'
                      };

                      // Update task with validation status
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  validation: {
                                    status: 'validating',
                                    message: event.message,
                                    code: event.code
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_validation_complete':
                      diagramOp = {
                        ...diagramOp,
                        isValidating: false,
                        validationStatus: event.valid ? 'valid' : 'error',
                        validationMessage: event.message || 'Validation complete'
                      };

                      // Update task with validation result
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  validation: {
                                    status: event.valid ? 'valid' : 'error',
                                    message: event.message,
                                    result: event.valid
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_validation_error':
                      diagramOp = {
                        ...diagramOp,
                        isValidating: false,
                        validationStatus: 'error',
                        validationMessage: event.message || 'Validation failed'
                      };

                      // Update task with validation error
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  validation: {
                                    status: 'error',
                                    message: event.message,
                                    error: event.error
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    // Enhanced syntax checking events
                    case 'diagram_editor_syntax_check_start':
                      diagramOp = {
                        ...diagramOp,
                        isSyntaxChecking: true,
                        syntaxStatus: 'pending',
                        syntaxMessage: event.message || 'Checking diagram syntax...'
                      };

                      // Update task with syntax check status
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  syntaxCheck: {
                                    status: 'checking',
                                    message: event.message,
                                    code: event.code
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_syntax_check_complete':
                      diagramOp = {
                        ...diagramOp,
                        isSyntaxChecking: false,
                        syntaxStatus: event.valid ? 'valid' : 'error',
                        syntaxMessage: event.message || 'Syntax check complete'
                      };

                      // Update task with syntax check result
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  syntaxCheck: {
                                    status: event.valid ? 'valid' : 'error',
                                    message: event.message,
                                    result: event.valid
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_syntax_error':
                      diagramOp = {
                        ...diagramOp,
                        isSyntaxChecking: false,
                        syntaxStatus: 'error',
                        syntaxMessage: event.message || 'Syntax error detected'
                      };

                      // Update task with syntax error
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  syntaxCheck: {
                                    status: 'error',
                                    message: event.message,
                                    error: event.error,
                                    line: event.line,
                                    column: event.column
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    // Type detection events
                    case 'diagram_editor_type_detected':
                      diagramOp = {
                        ...diagramOp,
                        isTypeDetecting: false,
                        detectedType: event.detectedType || ''
                      };

                      // Update task with detected type
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  diagramType: event.detectedType,
                                  typeDetection: {
                                    detected: event.detectedType,
                                    message: event.message
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_type_detection_failed':
                      diagramOp = { ...diagramOp, isTypeDetecting: false, detectedType: '' };

                      // Update task with type detection failure
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  typeDetection: {
                                    detected: 'unknown',
                                    message: event.message,
                                    error: event.error
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    // Code generation events
                    case 'diagram_editor_code_generation_start':
                      diagramOp = {
                        ...diagramOp,
                        isCodeGenerating: true,
                        codeGenProgress: 0,
                        codeGenMessage: event.message || 'Generating diagram code...'
                      };

                      // Update task with code generation status
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  codeGeneration: {
                                    status: 'generating',
                                    message: event.message,
                                    progress: 0
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_code_generation_progress':
                      diagramOp = {
                        ...diagramOp,
                        codeGenProgress: event.progress || 0,
                        codeGenMessage: event.message || 'Processing diagram code...'
                      };

                      // Update task with code generation progress
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                progress: event.progress,
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  codeGeneration: {
                                    status: 'generating',
                                    message: event.message,
                                    progress: event.progress
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_code_generation_complete':
                      diagramOp = {
                        ...diagramOp,
                        isCodeGenerating: false,
                        codeGenProgress: 100,
                        codeGenMessage: event.message || 'Code generation complete'
                      };

                      // Update task with code generation completion
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  codeGeneration: {
                                    status: 'complete',
                                    message: event.message,
                                    progress: 100
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    // Enhancement events
                    case 'diagram_editor_enhancement_start':
                      diagramOp = {
                        ...diagramOp,
                        isEnhancing: true,
                        enhancementMessage: event.message || 'Enhancing diagram...'
                      };

                      // Update task with enhancement status
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                details: event.message,
                                metadata: {
                                  ...(task as any).metadata,
                                  enhancement: {
                                    status: 'enhancing',
                                    message: event.message
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'diagram_editor_enhancement_complete':
                      diagramOp = {
                        ...diagramOp,
                        isEnhancing: false,
                        enhancementMessage: event.message || 'Enhancement complete'
                      };

                      // Update task with enhancement completion
                      throttledEditorTasksUpdate(
                        editorTasks.map((task: any) =>
                          typeof task === 'object' && 'id' in task && task.id === event.taskId
                            ? {
                                ...(task as any),
                                metadata: {
                                  ...(task as any).metadata,
                                  enhancement: {
                                    status: 'complete',
                                    message: event.message
                                  }
                                }
                              }
                            : task
                        )
                      );
                      break;

                    case 'tool_call_delta':
                      // Use centralized tool state handler for streaming code
                      updateToolState(event);

                      // Partial mermaid code - update live preview (legacy support)
                      if (currentToolCall && event.partial_code) {
                        currentToolCall.partialCode = event.partial_code;
                        syncSnippetToEditor(event.partial_code, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.partial_code);
                      }
                      break;

                    case 'thinking':
                      // Thinking step complete
                      assistantText = assistantText.replace(
                        /<tool-call type="thinking"[^>]*>.*?<\/tool-call>/g,
                        ''
                      );
                      if (!isReasoningStreaming) {
                        isReasoningStreaming = true;
                        reasoningContent = '';
                      }
                      reasoningContent = event.thought + ' ';
                      assistantText += `\n\n<thinking step="${event.step}">${event.thought}</thinking>\n`;
                      break;

                    case 'tool_call_complete':
                      // Use centralized tool state handler
                      updateToolState(event);

                      // Legacy state resets (to be removed in Phase 4)
                      isStreamingMermaid = false;
                      currentToolCall = null;

                      if (currentToolStart?.name === 'comprehensive_questionnaire') {
                        isPreparingQuestionnaire = false;
                      }
                      if (
                        currentToolStart?.name === 'diagram_editor' ||
                        currentToolStart?.name === 'create_diagram'
                      ) {
                        isGeneratingDiagram = false;
                      }

                      // Reset enhanced diagram states
                      resetDiagramOpState();

                      currentToolStart = null;

                      // Remove the running indicator
                      assistantText = assistantText.replace(
                        /<tool-call type="diagram"[^>]*>.*?<\/tool-call>/g,
                        ''
                      );

                      // Just sync the code, no diagram-written tag
                      // The on-stream UI will handle the visual feedback

                      // Sync final code to editor
                      syncSnippetToEditor(event.mermaid_code, assistantMessageId);
                      mermaidSnippetMap.set(assistantMessageId, event.mermaid_code);

                      // Clear input field after diagram generation completes
                      messageText = '';
                      break;

                    case 'tool_retry':
                      // Tool retry notification
                      assistantText += `\n\n<tool-call type="retry" status="running">${event.message}</tool-call>\n`;
                      break;

                    case 'error':
                      // Enhanced error handling with specific questionnaire error handling
                      let errorMessage = event.message;
                      let errorType = 'general';
                      let retryData: {
                        toolCallId: string;
                        toolCallName: string;
                        originalArgs: string;
                      } | null = null;

                      // Check for questionnaire-specific errors
                      if (event.code) {
                        switch (event.code) {
                          case 'INVALID_QUESTIONNAIRE':
                            errorMessage =
                              'Unable to create questionnaire: missing required questions.';
                            errorType = 'questionnaire';
                            break;
                          case 'INVALID_QUESTION_COUNT':
                            errorMessage = 'Questionnaire error: must have between 3-5 questions.';
                            errorType = 'questionnaire';
                            break;
                          case 'INVALID_QUESTION_FORMAT':
                            errorMessage =
                              'Questionnaire error: one or more questions have invalid format.';
                            errorType = 'questionnaire';
                            break;
                          case 'INVALID_QUESTION_TYPE':
                            errorMessage =
                              'Questionnaire error: contains unsupported question types.';
                            errorType = 'questionnaire';
                            break;
                          case 'INVALID_MULTIPLE_CHOICE':
                            errorMessage =
                              'Questionnaire error: multiple choice questions need at least 2 options.';
                            errorType = 'questionnaire';
                            break;
                          case 'MAX_ROUNDS_EXCEEDED':
                            errorMessage =
                              'Conversation became too complex. Please start a new conversation with a simpler request.';
                            errorType = 'system';
                            break;
                          case 'STREAM_TIMEOUT':
                            errorMessage = 'Request timed out. Please try again.';
                            errorType = 'system';
                            break;
                          case 'API_ERROR':
                          case 'API_CONNECTION_ERROR':
                            errorMessage =
                              event.message ||
                              'API connection failed. Please check your configuration.';
                            errorType = 'system';
                            break;
                          case 'STREAMING_ERROR':
                            errorMessage =
                              event.message || 'Streaming error occurred. Please try again.';
                            errorType = 'system';
                            break;
                          case 'INVALID_TOOL_ARGS':
                            errorMessage =
                              'There was an issue creating the diagram. The system encountered invalid parameters.';
                            errorType = 'retryable';
                            if (event.retryable && event.retryAction === 'retry_tool_call') {
                              retryData = {
                                toolCallId: String(event.toolCallId || ''),
                                toolCallName: String(event.toolCallName || ''),
                                originalArgs: String(event.originalArgs || '')
                              };
                            }
                            break;
                          case 'RETRY_FAILED':
                            errorMessage = 'Retry failed: ' + event.message;
                            errorType = 'retryable';
                            if (event.retryable && event.retryAction === 'retry_tool_call') {
                              retryData = {
                                toolCallId: String(event.toolCallId || ''),
                                toolCallName: String(event.toolCallName || ''),
                                originalArgs: String(event.originalArgs || '')
                              };
                            }
                            break;
                        }
                      }

                      // Remove any loading states for questionnaire
                      if (errorType === 'questionnaire') {
                        assistantText = assistantText.replace(
                          /<tool-call type="comprehensive-questionnaire"[^>]*>.*?<\/tool-call>/g,
                          ''
                        );
                      }

                      // Add retry information if available
                      let errorContent = errorMessage;
                      if (retryData) {
                        errorContent += `\n<retry-tool toolCallId="${retryData.toolCallId}" toolCallName="${retryData.toolCallName}" originalArgs="${retryData.originalArgs.replace(/"/g, '&quot;')}"></retry-tool>`;
                      }

                      assistantText += `\n\n<error type="${errorType}">${errorContent}</error>\n`;
                      break;

                    case 'diagram-read':
                      // Handle diagram read event from Cursor-style agent
                      if (event.content) {
                        assistantText += `\n\n<diagram-read>\n`;
                        assistantText += `<code>${event.content}</code>\n`;
                        assistantText += `</diagram-read>\n`;

                        // Update the editor with the diagram content
                        syncSnippetToEditor(event.content, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.content);
                      }
                      break;

                    case 'diagram-update':
                      // Handle diagram update event from Cursor-style agent (patch/write/delete)
                      if (event.content !== undefined) {
                        // Store previous diagram for diff
                        const currentDiagram = $stateStore.code;
                        previousDiagramMap.set(assistantMessageId, currentDiagram);

                        // Update the editor with new diagram content
                        syncSnippetToEditor(event.content, assistantMessageId);
                        mermaidSnippetMap.set(assistantMessageId, event.content);

                        // Add completion message
                        assistantText += `\n\n<diagram-complete operation="update" title="Diagram Updated" explanation="The diagram has been updated successfully.">\n`;
                        assistantText += `<code>${event.content}</code>\n`;
                        assistantText += `</diagram-complete>\n`;
                      }
                      break;

                    case 'done':
                      // Use centralized tool state handler
                      updateToolState(event);

                      // Stream complete - will reset status at the very end after all processing
                      messageText = '';
                      isReasoningStreaming = false;
                      stopLoadingTextCycle();

                      // Clear questionnaire if the response wasn't a questionnaire submission
                      // Check if the assistant text contains questionnaire content
                      const hasQuestionnaire = assistantText.includes(
                        '<comprehensive-questionnaire>'
                      );
                      if (!hasQuestionnaire && currentQuestionnaire) {
                        currentQuestionnaire = null;
                        questionnaireResponses = {};
                      }

                      break;
                  }

                  // Update UI with throttling to prevent flickering
                  throttledMessageUpdate(assistantMessageId, assistantText);
                } catch (e) {
                  // Not valid JSON, might be partial - ignore
                }
              }

              // Yield to the event loop so the UI can repaint
              await new Promise((resolve) => requestAnimationFrame(resolve));
            }
          } finally {
            reader.releaseLock();
          }
        }

        // Reset mermaid streaming state
        isStreamingMermaid = false;

        // Final immediate update to ensure content is preserved (before resetting status)
        flushMessageUpdate(assistantMessageId, assistantText);
        flushEditorTasksUpdate();

        // Now reset request status to idle after all processing is complete
        requestStatus = 'idle';

        // Extract Mermaid snippet and raw response after streaming is complete
        if (assistantText && assistantMessage.id) {
          const snippet = extractMermaidSnippet(assistantText);
          if (snippet) {
            mermaidSnippetMap.set(assistantMessage.id, snippet);
            syncSnippetToEditor(snippet, assistantMessage.id);
          }
          rawResponseMap.set(assistantMessage.id, assistantText);

          // Persist the complete message to database
          try {
            await createMessage(currentConversationId!, {
              role: 'assistant',
              content: assistantText,
              parts: [{ type: 'text', text: assistantText }]
            });
          } catch (error) {
            console.error('Failed to save assistant message:', error);
          }
        }
      } else {
        // Fallback to JSON response for backward compatibility
        const data = (await res.json()) as { assistant?: UIMessage };
        if (data?.assistant) {
          sessionMessages = [...sessionMessages, data.assistant];

          const assistantTextParts = data.assistant.parts?.filter(
            (part): part is { type: 'text'; text: string } =>
              part?.type === 'text' && typeof part.text === 'string'
          );
          const assistantText = assistantTextParts?.map((part) => part.text).join('\n\n') || '';
          if (assistantText && data.assistant.id) {
            const snippet = extractMermaidSnippet(assistantText);
            if (snippet) {
              mermaidSnippetMap.set(data.assistant.id, snippet);
              syncSnippetToEditor(snippet, data.assistant.id);
            }
            rawResponseMap.set(data.assistant.id, assistantText);
          }
        }
      }
      requestStatus = 'idle';
      abortController = null; // Clean up abort controller
    } catch (error) {
      // Clean up timeout on error - use centralized tracking
      if (activeTimeoutId) {
        clearTimeout(activeTimeoutId);
        activeTimeoutId = null;
      }
      abortController = null; // Clean up abort controller

      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the request - don't treat as an error
        console.log('Request was cancelled by user');
        return; // Exit gracefully without throwing error
      }

      throw error;
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      await sendChatRequest(trimmed);
      messageText = '';
    } catch (error) {
      console.error('Chat request failed', error);
      let errorMessage = errorToString(error, 'An error occurred');

      if (errorMessage.includes('model')) {
        errorMessage = 'Model configuration error. Please check your settings.';
      } else if (
        errorMessage.toLowerCase().includes('api key') ||
        errorMessage.toLowerCase().includes('api_key')
      ) {
        errorMessage = 'API authentication error. Please check your API key.';
      }

      lastError = errorMessage;
      requestStatus = 'error';
      toast.error(`Chat request failed: ${errorMessage}`);
    }
  }

  // Removed duplicate handleRetry function - now using the retry handler for tool calls

  async function handleRestoreSnapshot(messageId: string) {
    if (!currentConversationId) return;

    try {
      const response = await listSnapshots(currentConversationId);
      const snapshot = response.snapshots.find((s) => s.message_id === messageId);
      if (snapshot) {
        const state = JSON.parse(snapshot.state);
        loadState(state.serialized || '');
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      const errorMessage = 'Failed to restore state';
      lastError = errorMessage;
      toast.error(errorMessage);
    }
  }

  async function handleStopStreaming() {
    console.log('Stop streaming called, current status:', requestStatus);
    try {
      // Abort the current request if there's one in progress
      if (abortController) {
        console.log('Aborting request...');
        abortController.abort();
        abortController = null;
      }

      // Flush any pending message updates to preserve content
      if (pendingMessageId && pendingAssistantText) {
        flushMessageUpdate(pendingMessageId, pendingAssistantText);
      }

      // Stop loading text cycle
      stopLoadingTextCycle();

      // Reset streaming state
      requestStatus = 'idle';
      lastError = null; // Clear any error state
      isStreamingMermaid = false;
      isReasoningStreaming = false;
      currentToolCall = null;

      // Reset tool start states
      isPreparingQuestionnaire = false;
      isGeneratingDiagram = false;
      currentToolStart = null;

      // Clear active tool executions
      activeToolExecutions = [];

      // Reset enhanced diagram states
      resetDiagramOpState();

      // Mark any in-progress editor tasks as cancelled
      editorTasks = editorTasks.map((task) =>
        task.status === 'in_progress'
          ? { ...task, status: 'completed' as const, details: 'Cancelled' }
          : task
      );

      // Show feedback to user
      // toast.info('Response cancelled'); // Removed - don't show toast for user cancellation
    } catch (error) {
      console.error('Failed to stop streaming', error);
      toast.error('Failed to stop streaming');
    }
  }

  function handleModelChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const value = target.value;
    if (!value) return;
    const option = getModelOptions().find((item) => item.id === value);
    if (option) {
      selectedModelId = option.id;
      selectedModelName = option.name;
      aiSettingsStoreWritable.update((s: any) => ({
        ...s,
        model: option.id,
        providerModel: option.id
      }));
    }
  }

  function handleModelSelectChange(value?: string) {
    if (!value) return;
    const option = getModelOptions().find((item) => item.id === value);
    if (!option) return;
    selectedModelId = option.id;
    selectedModelName = option.name;
    aiSettingsStoreWritable.update((s: any) => ({
      ...s,
      model: option.id,
      providerModel: option.id
    }));
  }

  function setInputMode(mode: PromptMode) {
    promptMode = mode;
    aiSettingsStoreWritable.update((s: any) => ({ ...s, promptMode: mode }));
  }

  // Enhanced input state
  let isTyping = $state(false);
  let characterCount = $state(0);
  let isComposing = $state(false);
  let showKeyboardHelp = $state(false);
  let textareaElement: HTMLTextAreaElement;

  // Constants for input behavior
  const MAX_HEIGHT = 200;
  const MIN_HEIGHT = 48;
  const MAX_CHARACTERS = 4000;

  // Auto-resize functionality
  function autoResize() {
    if (!textareaElement) return;

    // Reset height to get accurate scrollHeight
    textareaElement.style.height = 'auto';

    // Calculate new height
    const scrollHeight = textareaElement.scrollHeight;
    const newHeight = Math.max(MIN_HEIGHT, Math.min(scrollHeight, MAX_HEIGHT));

    textareaElement.style.height = `${newHeight}px`;
  }

  // Typing detection
  let typingTimeout: ReturnType<typeof setTimeout>;
  function handleTypingStart() {
    isTyping = true;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 1000);
  }

  function handleKeyDown(e: KeyboardEvent) {
    console.log('handleKeyDown called:', e.key, e.isComposing, e.shiftKey);

    // Show keyboard help on Ctrl+/
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      showKeyboardHelp = !showKeyboardHelp;
      return;
    }

    if (e.key === 'Enter') {
      if (e.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();
      const form = (e.currentTarget as HTMLTextAreaElement).form;
      console.log('Form found:', !!form);
      if (form) {
        console.log('Submitting form');
        form.requestSubmit();
      }
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    characterCount = target.value.length;
    handleTypingStart();
    autoResize();
  }

  function handleCompositionStart() {
    isComposing = true;
  }

  function handleCompositionEnd() {
    isComposing = false;
  }

  // Click outside handler for keyboard shortcuts help
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as Element;
    const helpElement = document.getElementById('keyboard-shortcuts-help');
    if (helpElement && !helpElement.contains(target)) {
      showKeyboardHelp = false;
    }
  }

  // Initialize auto-resize and event listeners
  onMount(() => {
    // Initial auto-resize
    if (textareaElement) {
      autoResize();
    }

    // Add click outside listener
    document.addEventListener('click', handleClickOutside);
  });

  // Cleanup event listeners
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    clearTimeout(typingTimeout);
  });

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      // Handle file attachments here if needed
    }
  }

  function handleViewFullCode(snippet: string | null) {
    // Switch to code mode in the sidebar
    updateCodeStore({ editorMode: 'code' });
  }

  // Mermaid validation function
  function validateMermaidCode(code: string): { isValid: boolean; error?: string; line?: number } {
    try {
      // Basic syntax validation for common Mermaid patterns
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        return { isValid: true };
      }

      // Check for required diagram type declaration
      const diagramTypes = [
        'graph',
        'flowchart',
        'sequenceDiagram',
        'classDiagram',
        'stateDiagram',
        'erDiagram',
        'journey',
        'gantt',
        'pie',
        'gitgraph'
      ];
      const firstLine = trimmedCode.split('\n')[0].trim().toLowerCase();
      const hasValidStart = diagramTypes.some(
        (type) => firstLine.startsWith(type.toLowerCase()) || firstLine === type.toLowerCase()
      );

      if (!hasValidStart && !firstLine.startsWith('%%')) {
        return {
          isValid: false,
          error: 'Invalid diagram type. Must start with one of: ' + diagramTypes.join(', '),
          line: 1
        };
      }

      // Check for common syntax errors
      const lines = trimmedCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines and comments
        if (!line || line.startsWith('%%')) continue;
        // Check for unclosed brackets
        const openBrackets = (line.match(/[\[\{]/g) || []).length;
        const closeBrackets = (line.match(/[\]\}]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          return {
            isValid: false,
            error: 'Unclosed brackets detected',
            line: i + 1
          };
        }

        // Check for invalid arrow syntax in flowcharts
        if (firstLine.includes('graph') || firstLine.includes('flowchart')) {
          const invalidArrows = line.match(/<-+>|<--?>|<-+?/g);
          if (invalidArrows) {
            return {
              isValid: false,
              error: `Invalid arrow syntax: ${invalidArrows[0]}. Use -->, --->, or -- instead`,
              line: i + 1
            };
          }
        }

        // Check for malformed node definitions
        if (line.includes('[') && !line.includes(']')) {
          return {
            isValid: false,
            error: 'Unclosed node label bracket [',
            line: i + 1
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Validation error: ' + (error as Error).message
      };
    }
  }

  // Show validation error toast
  function showValidationError(error: string, line?: number) {
    const message = line ? `Line ${line}: ${error}` : error;
    toast.error(message, {
      duration: 5000,
      position: 'bottom-right'
    });
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      // Handle file attachments here if needed
    }
  }

  // Expose sendMessage function to parent
  export async function sendMessageExternal(text: string) {
    if (!text.trim()) {
      return false;
    }

    // Set the message text and trigger the submit handler
    messageText = text;

    try {
      // Create a mock event for handleSubmit
      const mockEvent = new Event('submit', { cancelable: true }) as SubmitEvent;
      await handleSubmit(mockEvent);
      return true;
    } catch (error) {
      console.error('Failed to send message externally:', error);
      return false;
    }
  }

  // Expose clearChat function to parent for clearing conversation
  export async function clearChat() {
    // Clear UI immediately
    messageText = '';
    lastError = null;
    mermaidSnippetMap.clear();
    rawResponseMap = new SvelteMap();
    expandedCodeIds = new SvelteSet();
    expandedRawResponseIds = new SvelteSet();
    conversationContext = null;
    editorTasks = [];
    localStorage.removeItem('editorTasks');
    isReadInProgress = false;
    historicalMessages = [];
    sessionMessages = [];
    questionnaireResponses = {};
    currentQuestionnaire = null;
    reasoningContent = '';
    isReasoningStreaming = false;
    isCodeChanging = false;

    // Clear per-message Maps
    previousDiagramMap.clear();
    showDiffMap.clear();
    currentDiffMap.clear();

    // Create a new conversation
    try {
      const response = await createConversation({ title: 'New Chat' });
      currentConversationId = response.conversation.id;
      currentConversationTitle = response.conversation.title;
      localStorage.setItem('currentConversationId', currentConversationId || '');
      lastTrackedCode = $stateStore.code;
      updateConversationContext();
      toast.success('Chat cleared');
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      currentConversationId = crypto.randomUUID();
      currentConversationTitle = 'New Chat';
      localStorage.setItem('currentConversationId', currentConversationId || '');
      toast.error('Failed to create new conversation');
    }
  }
</script>

<div class={`flex h-full flex-col bg-background ${className ?? ''}`}>
  <!-- Messages Area -->
  <div
    class="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1 overflow-y-auto"
    bind:this={messagesContainerRef}>
    <div class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      {#if allMessages.length === 0}
        <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
          {#if initializing}
            <!-- Loading State -->
            <div
              class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 sm:mb-8 sm:h-20 sm:w-20 sm:rounded-3xl">
              <Loader2 class="size-8 animate-spin text-primary sm:size-10" />
            </div>
            <h2 class="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
              Initializing Chat...
            </h2>
            <p class="text-sm text-muted-foreground sm:text-base">Setting up your workspace</p>
          {:else}
            <!-- Empty State -->
            <div
              class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 sm:mb-8 sm:h-20 sm:w-20 sm:rounded-3xl">
              <img src="/brand/logo.png" alt="Graphini" class="size-8 sm:size-10" />
            </div>
            <h2 class="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
              Start creating diagrams
            </h2>
            <p class="mb-8 text-sm text-muted-foreground sm:text-base">
              Ask questions or create new diagrams with AI assistance
            </p>
            <div class="flex flex-wrap justify-center gap-2 sm:gap-3">
              <button
                onclick={() => {
                  messageText = 'Create a flowchart for user authentication';
                }}
                class="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 hover:shadow-md sm:px-5 sm:py-2.5 sm:text-sm">
                Authentication flow
              </button>
              <button
                onclick={() => {
                  messageText = 'Create a sequence diagram for API request';
                }}
                class="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 hover:shadow-md sm:px-5 sm:py-2.5 sm:text-sm">
                API sequence
              </button>
              <button
                onclick={() => {
                  messageText = 'Create an ER diagram for a blog';
                }}
                class="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 hover:shadow-md sm:px-5 sm:py-2.5 sm:text-sm">
                Database schema
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Messages -->
        <div class="space-y-4 sm:space-y-6">
          {#each allMessages as message, messageIndex (message.id ?? `${message.role}-${messageIndex}`)}
            {@const messageRole = message.role as MessageRole}
            {@const isLastMessage = messageIndex === allMessages.length - 1}
            {@const isCurrentlyStreaming =
              isStreaming && isLastMessage && messageRole === 'assistant'}

            <div class="group">
              {#if messageRole === 'user'}
                <!-- User Message -->
                <div class="flex justify-end">
                  <div class="max-w-[85%] sm:max-w-[80%]">
                    <div
                      class="rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground shadow-md sm:px-5 sm:py-3.5">
                      <div class="text-sm text-primary-foreground sm:text-base">
                        {#each message.parts?.filter((part) => part.type === 'text' && typeof part.text === 'string') || [] as part (part.text)}
                          <Response content={part.text!} class="[&_*]:!text-primary-foreground" />
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              {:else}
                <!-- Assistant Message -->
                <div class="min-w-0 flex-1 space-y-2 sm:space-y-3">
                  {#if message.parts?.length}
                    {#each message.parts as part, partIndex (`${part.type}-${partIndex}-${part.type === 'text' && typeof part.text === 'string' ? part.text.length : 0}`)}
                      {#if part.type === 'step-start'}
                        <!-- Skip step-start -->
                      {:else if part.type === 'text' && typeof part.text === 'string'}
                        {@const genId = message.id ?? `assistant-${messageIndex}`}
                        {@const isCurrentlyStreaming =
                          isStreaming && isLastMessage && messageRole === 'assistant'}
                        {@const semanticParts = getParsedContent((part as any).text, genId) || []}
                        {@const hasSemanticContent = semanticParts.some((p) => p.type !== 'text')}

                        <!-- Render both streaming and non-streaming messages -->
                        {@const parsedParts = semanticParts}
                        <div class="space-y-3">
                          <!-- Placeholder when streaming starts but no tools/content yet -->
                          {#if isCurrentlyStreaming && activeToolExecutions.length === 0 && parsedParts.length === 0}
                            <div
                              class="tool-execution rounded-xl border border-primary/30 bg-muted/20 p-5 shadow-sm">
                              <div class="mb-4 flex items-center gap-3">
                                <div
                                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
                                  <Loader2 class="size-5 animate-spin text-primary" />
                                </div>
                                <div class="flex flex-col">
                                  <div class="font-medium text-foreground">AI is thinking...</div>
                                  <div class="text-sm text-muted-foreground">
                                    Generating your response
                                  </div>
                                </div>
                              </div>
                              <!-- Shimmer placeholder for code -->
                              <div
                                class="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-5">
                                <div class="h-4 w-3/4 animate-pulse rounded-lg bg-muted"></div>
                                <div class="h-4 w-1/2 animate-pulse rounded-lg bg-muted delay-75">
                                </div>
                                <div class="h-4 w-2/3 animate-pulse rounded-lg bg-muted delay-150">
                                </div>
                                <div class="h-4 w-1/3 animate-pulse rounded-lg bg-muted"></div>
                              </div>
                            </div>
                          {/if}

                          {#each parsedParts as parsed, pIdx (`${parsed.type}-${pIdx}-${parsed.data?.toolType || ''}-${parsed.data?.operation || ''}`)}
                            {#if parsed.type === 'tool-call'}
                              <!-- Render unified ToolExecution component inline for active tools -->
                              {@const activeToolForThisCall = activeToolExecutions.find(
                                (t) =>
                                  (parsed.data?.toolType === 'thinking' && t.name === 'thinking') ||
                                  (parsed.data?.toolType === 'diagram_editor' &&
                                    t.name.startsWith('diagram_editor')) ||
                                  (parsed.data?.toolType === 'diagram' &&
                                    t.name === 'create_diagram') ||
                                  (parsed.data?.toolType === 'create_diagram' &&
                                    t.name === 'create_diagram') ||
                                  (parsed.data?.toolType === 'comprehensive-questionnaire' &&
                                    t.name === 'comprehensive_questionnaire')
                              )}

                              {#if isCurrentlyStreaming && activeToolForThisCall}
                                {@const toolIdx = activeToolExecutions.findIndex(
                                  (t) => t.id === activeToolForThisCall.id
                                )}
                                <ToolExecution
                                  id={activeToolForThisCall.id}
                                  name={activeToolForThisCall.name}
                                  status={activeToolForThisCall.status}
                                  message={activeToolForThisCall.message}
                                  progress={activeToolForThisCall.progress}
                                  steps={activeToolForThisCall.steps}
                                  streamingCode={activeToolForThisCall.streamingCode}
                                  error={activeToolForThisCall.error}
                                  isOpen={activeToolForThisCall.isOpen}
                                  onToggle={() => {
                                    activeToolExecutions = activeToolExecutions.map((t, i) =>
                                      i === toolIdx ? { ...t, isOpen: !t.isOpen } : t
                                    );
                                  }} />
                              {:else if parsed.data?.toolType === 'thinking'}
                                <!-- Stream thinking content directly without loader -->
                                {#if isCurrentlyStreaming && reasoningContent}
                                  <Reasoning isStreaming={true} content={reasoningContent} />
                                {:else if parsed.content}
                                  <Reasoning isStreaming={false} content={parsed.content} />
                                {/if}
                              {:else if parsed.data?.toolType === 'diagram_editor'}
                                {@const hasDiagramComplete = parsedParts.some(
                                  (p) => p.type === 'diagram-complete'
                                )}
                                {@const inProgressTasks = editorTasks.filter(
                                  (t: any) => t.status === 'in-progress' || t.status === 'pending'
                                )}
                                <!-- Skip rendering if diagram-complete already exists in this message -->
                                {#if !hasDiagramComplete}
                                  <!-- Render diagram_editor tool inline -->
                                  {#if isLastMessage && messageRole === 'assistant' && inProgressTasks.length > 0}
                                    <div class="space-y-1.5">
                                      {#each inProgressTasks as task (task.id || String(task))}
                                        <DiagramReadTask {task} />
                                      {/each}
                                    </div>
                                    <!-- Show loading indicator and CodeEditor for create/update/patch operations -->
                                    {#if isCurrentlyStreaming}
                                      {@const streamingTask = inProgressTasks.find(hasPartialCode)}
                                      {#if streamingTask}
                                        <CodeEditor
                                          code={streamingTask.metadata.partialCode}
                                          language="mermaid"
                                          title="Generating Diagram"
                                          isStreaming={true}
                                          showApply={false} />
                                      {:else if isCodeChanging}
                                        <!-- Show loader for code changes (create/update/patch) -->
                                        <div
                                          class="tool-execution rounded-lg border border-orange-500/20 bg-muted/20 p-4">
                                          <div class="mb-3 flex items-center gap-3">
                                            <div
                                              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                                              <Code2 class="size-4 animate-pulse text-orange-500" />
                                            </div>
                                            <div class="flex flex-col">
                                              <span class="text-sm font-medium text-foreground"
                                                >Making Code Changes...</span>
                                              <span class="text-xs text-muted-foreground"
                                                >Updating your diagram</span>
                                            </div>
                                          </div>
                                          <!-- Shimmer placeholder for code -->
                                          <div
                                            class="space-y-2 rounded-md border border-border/50 bg-muted/30 p-4">
                                            <div
                                              class="h-4 w-3/4 animate-pulse rounded bg-orange-500/20">
                                            </div>
                                            <div
                                              class="h-4 w-1/2 animate-pulse rounded bg-orange-500/20 delay-75">
                                            </div>
                                            <div
                                              class="h-4 w-2/3 animate-pulse rounded bg-orange-500/20 delay-150">
                                            </div>
                                            <div
                                              class="h-4 w-1/3 animate-pulse rounded bg-orange-500/20">
                                            </div>
                                          </div>
                                        </div>
                                      {/if}
                                    {/if}
                                  {:else}
                                    <!-- Show completed state for non-streaming -->
                                    <div
                                      class="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs">
                                      <Check class="size-3 text-emerald-500" />
                                      <span class="text-emerald-600 dark:text-emerald-400"
                                        >Diagram operation completed</span>
                                    </div>
                                  {/if}
                                {/if}
                              {:else if parsed.data?.toolType === 'diagram' || parsed.data?.toolType === 'create_diagram'}
                                {#if isCurrentlyStreaming && parsed.data?.status === 'running'}
                                  <div
                                    class="tool-indicator inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
                                    <Sparkles class="size-3 animate-pulse text-blue-500" />
                                    <span class="text-muted-foreground">Creating diagram...</span>
                                  </div>
                                  <!-- Show CodeEditor when diagram code is available, otherwise show loading -->
                                  {#if currentToolCall?.partialCode}
                                    <CodeEditor
                                      code={currentToolCall.partialCode}
                                      language="mermaid"
                                      title="Generating Diagram"
                                      isStreaming={true}
                                      showApply={false} />
                                  {:else}
                                    <!-- Show subtle loading indicator while waiting for diagram code -->
                                    <div class="my-2 flex items-center gap-2 text-xs text-blue-500">
                                      <Loader2 class="size-3 animate-spin" />
                                      <span>Creating diagram...</span>
                                    </div>
                                  {/if}
                                {:else}
                                  <div
                                    class="tool-indicator inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs">
                                    <Check class="size-3 text-emerald-500" />
                                    <span class="text-emerald-600 dark:text-emerald-400"
                                      >Diagram created</span>
                                  </div>
                                {/if}
                              {:else if parsed.data?.toolType === 'comprehensive-questionnaire'}
                                {#if isCurrentlyStreaming && parsed.data?.status === 'running'}
                                  <!-- Show inline loading while preparing -->
                                  <div class="my-2 flex items-center gap-2 text-xs text-purple-500">
                                    <Loader2 class="size-3 animate-spin" />
                                    <span>Preparing questions...</span>
                                  </div>
                                {:else}
                                  <div
                                    class="tool-indicator inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
                                    <Check class="size-3 text-emerald-500" />
                                    <span class="text-muted-foreground">Questionnaire ready</span>
                                  </div>
                                {/if}
                              {:else if parsed.data?.toolType === 'processing'}
                                <!-- Skip processing indicator - not shown to user -->
                              {:else if parsed.data?.toolType === 'retry'}
                                <div
                                  class="tool-indicator inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
                                  <Loader2 class="size-3 animate-spin text-yellow-500" />
                                  <span class="text-muted-foreground">Retrying...</span>
                                </div>
                              {:else}
                                <!-- Generic tool call indicator -->
                                <div
                                  class="tool-indicator inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
                                  {#if isCurrentlyStreaming}
                                    <Loader2 class="size-3 animate-spin text-muted-foreground" />
                                    <span class="text-muted-foreground"
                                      >{parsed.content || 'Processing...'}</span>
                                  {:else}
                                    <Check class="size-3 text-emerald-500" />
                                    <span class="text-muted-foreground">Completed</span>
                                  {/if}
                                </div>
                              {/if}
                            {:else if parsed.type === 'thinking'}
                              <Reasoning
                                isStreaming={false}
                                content={parsed.content || 'No reasoning content available'} />
                            {:else if parsed.type === 'comprehensive-questionnaire'}
                              <!-- Comprehensive questionnaire using extracted component -->
                              {@const questionnaireData = parsed.data}
                              {console.log(
                                'Rendering questionnaire component with data:',
                                questionnaireData
                              )}
                              <ChatQuestionnaire
                                data={questionnaireData}
                                responses={questionnaireResponses}
                                onResponse={handleQuestionnaireResponse}
                                onSubmit={handleQuestionnaireSubmit} />
                            {:else if parsed.type === 'diff-view'}
                              <!-- Diff View - shows code changes with red/green highlighting -->
                              {@const diffOperation = parsed.data?.operation || 'update'}
                              <div
                                class="diff-view-container my-3 overflow-hidden rounded-lg border border-border shadow-sm"
                                data-complete={!isCurrentlyStreaming}>
                                <div
                                  class="diff-header flex items-center justify-between border-b border-border/30 bg-muted/50 px-3 py-2">
                                  <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-foreground"
                                      >📝 Code Changes</span>
                                    <span
                                      class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize"
                                      >{diffOperation}</span>
                                  </div>
                                  <button
                                    type="button"
                                    class="text-xs text-primary hover:text-primary/80"
                                    onclick={() => {
                                      const currentState = showDiffMap.get(genId) || false;
                                      showDiffMap.set(genId, !currentState);
                                    }}>
                                    {showDiffMap.get(genId) ? '🙈 Hide' : '👁️ Show'} Diff
                                  </button>
                                </div>

                                {#if showDiffMap.get(genId)}
                                  <div
                                    class="diff-content max-h-80 overflow-y-auto bg-card font-mono text-xs">
                                    {@html parsed.content}
                                  </div>

                                  <div
                                    class="diff-footer border-t border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                                    <span class="inline-flex items-center gap-3">
                                      <span class="flex items-center gap-1"
                                        ><span
                                          class="h-3 w-3 rounded-sm border-l-2 border-emerald-500 bg-emerald-500/20"
                                        ></span> Added</span>
                                      <span class="flex items-center gap-1"
                                        ><span
                                          class="h-3 w-3 rounded-sm border-l-2 border-rose-500 bg-rose-500/20"
                                        ></span> Removed</span>
                                    </span>
                                  </div>
                                {/if}
                              </div>
                            {:else if parsed.type === 'diagram-complete'}
                              <!-- Diagram completion with diff toggle -->
                              {@const diagramData = parsed.data}
                              <div
                                class="diagram-complete-container my-3 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/5"
                                data-complete={!isCurrentlyStreaming}>
                                <div
                                  class="flex items-center justify-between border-b border-emerald-500/20 px-3 py-2 dark:border-emerald-400/20">
                                  <div class="flex items-center gap-2">
                                    <span class="text-emerald-600 dark:text-emerald-400">✅</span>
                                    <span
                                      class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                      Diagram {diagramData.operation === 'create'
                                        ? 'Created'
                                        : diagramData.operation === 'patch'
                                          ? 'Patched'
                                          : 'Updated'}
                                    </span>
                                  </div>
                                  {#if currentDiffMap.get(genId)}
                                    <button
                                      type="button"
                                      class="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                                      onclick={() => {
                                        const currentState = showDiffMap.get(genId) || false;
                                        showDiffMap.set(genId, !currentState);
                                      }}>
                                      {showDiffMap.get(genId) ? '🙈 Hide' : '👁️ Show'} Changes
                                    </button>
                                  {/if}
                                </div>
                                {#if diagramData.title}
                                  <div
                                    class="border-b border-emerald-500/10 px-3 py-1.5 dark:border-emerald-400/10">
                                    <h4 class="text-sm font-semibold text-foreground">
                                      {diagramData.title}
                                    </h4>
                                  </div>
                                {/if}
                                {#if diagramData.explanation}
                                  <div class="px-3 py-2 text-xs text-muted-foreground">
                                    {diagramData.explanation}
                                  </div>
                                {/if}
                              </div>
                            {:else if parsed.type === 'text'}
                              <div class="text-sm leading-relaxed text-foreground/90">
                                <Response content={parsed.content} />
                              </div>
                            {/if}
                          {/each}
                        </div>
                      {:else if part.type === 'tool-call' || part.type === 'tool-result'}
                        <!-- Suppress tool metadata to keep the conversation focused -->
                      {:else if part.type === 'file'}
                        <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
                          <div class="flex items-center gap-3">
                            <div
                              class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <Code2 class="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p class="text-sm font-medium text-foreground">
                                {formatFileLabel(part)}
                              </p>
                              <a
                                href={part.url as string}
                                target="_blank"
                                rel="noreferrer"
                                class="text-xs text-primary hover:underline">
                                Open file
                              </a>
                            </div>
                          </div>
                        </div>
                      {:else if part.type === 'reasoning'}
                        <div class="text-xs text-muted-foreground italic">
                          <Response content={part.text!} />
                        </div>
                      {/if}
                    {/each}
                  {:else if requestStatus === 'streaming' && message.parts?.length === 0}
                    <!-- Generic loading placeholder with cycling shimmer text -->
                    <div class="flex items-center gap-2">
                      <!-- <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> -->
                      <span class="shimmer-text text-sm font-medium">{loadingText}</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}

          <!-- Loading placeholder when waiting for model response (no assistant message yet) -->
          {#if isThinking && allMessages.length > 0 && allMessages[allMessages.length - 1]?.role === 'user'}
            <div class="group">
              <div class="min-w-0 flex-1 space-y-3">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0">
                    <div class="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="shimmer-text text-sm font-medium">{loadingText}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Code Changes Loader -->
          {#if isCodeChanging}
            <div class="group">
              <div class="min-w-0 flex-1 space-y-3">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 ring-1 ring-orange-500/20">
                      <Code2 class="size-4 animate-pulse text-orange-500" />
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <Loader2 class="size-4 animate-spin text-orange-500" />
                      <span class="text-sm font-medium text-orange-500"
                        >Making Code Changes...</span>
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      Updating your diagram with the requested changes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Input Area - Enhanced Modern Design -->
  <div
    class="border-t border-border/60 bg-gradient-to-b from-background to-muted/20 px-4 pt-3 pb-4">
    <!-- Error Bar -->
    {#if lastError}
      <div
        class="mb-3 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 shadow-sm">
        <div class="flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-destructive/20">
            <X class="size-3 text-destructive" />
          </div>
          <span class="text-sm font-medium text-destructive">{lastError}</span>
        </div>
        <button
          type="button"
          onclick={() => {
            isRetrying = true;
            sendChatRequest(messageText).finally(() => {
              isRetrying = false;
            });
          }}
          disabled={isRetrying}
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all duration-200 hover:bg-destructive/20 disabled:opacity-50">
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    {/if}

    <form onsubmit={handleSubmit}>
      <!-- Main Input Box - Enhanced Design -->
      <div
        class="rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm transition-all duration-300 focus-within:border-primary/60 focus-within:bg-card/90 focus-within:shadow-xl focus-within:ring-[3px] focus-within:ring-primary/20">
        <textarea
          name="message"
          bind:value={messageText}
          bind:this={textareaElement}
          onkeydown={handleKeyDown}
          oninput={handleInput}
          oncompositionstart={handleCompositionStart}
          oncompositionend={handleCompositionEnd}
          placeholder={promptMode === 'ask'
            ? 'Ask about your diagram... (Ctrl+/ for shortcuts)'
            : 'Create a new diagram... (Ctrl+/ for shortcuts)'}
          disabled={isStreaming}
          class="w-full resize-none bg-transparent px-5 py-4 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 sm:px-5 sm:py-4"
          rows="1"
          aria-label="Message input"
          aria-describedby="input-help-text"
          maxlength={MAX_CHARACTERS}
          style="min-height: 52px; max-height: 200px;"></textarea>

        <!-- Bottom Bar - Enhanced Design -->
        <div
          class="flex items-center justify-between gap-2 overflow-hidden border-t border-border/40 bg-muted/30 px-4 py-3">
          <!-- Left Controls - Mode dropdown and agent selection -->
          <div class="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
            <!-- Mode Dropdown -->
            <Select.Root
              type="single"
              value={promptMode}
              onValueChange={(value) => setInputMode(value as 'ask' | 'create')}>
              <Select.Trigger
                size="sm"
                class="flex h-8 min-w-0 flex-shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/50 hover:text-foreground">
                {#if promptMode === 'ask'}
                  <ArrowUp class="size-3.5 flex-shrink-0" />
                {:else}
                  <Sparkles class="size-3.5 flex-shrink-0" />
                {/if}
                <span class="max-w-[50px] truncate font-semibold capitalize">{promptMode}</span>
              </Select.Trigger>
              <Select.Content
                class="z-50 min-w-[120px] rounded-xl border border-border/40 bg-background/95 shadow-xl backdrop-blur-sm">
                <Select.Item value="ask" class="text-xs">
                  <div class="flex items-center gap-2.5 px-3 py-2">
                    <ArrowUp class="size-3.5" />
                    <span class="font-medium">Ask</span>
                  </div>
                </Select.Item>
                <Select.Item value="create" class="text-xs">
                  <div class="flex items-center gap-2.5 px-3 py-2">
                    <Sparkles class="size-3.5" />
                    <span class="font-medium">Create</span>
                  </div>
                </Select.Item>
              </Select.Content>
            </Select.Root>

            <!-- Agent Selection Dropdown -->
            <Select.Root
              type="single"
              value={selectedModelId}
              onValueChange={handleModelSelectChange}>
              <Select.Trigger
                size="sm"
                class="flex h-8 w-36 flex-shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/50 hover:text-foreground">
                <Bot class="size-3.5 flex-shrink-0 text-primary" />
                <span class="max-w-[90px] truncate font-medium"
                  >{selectedModelName || 'Select Agent'}</span>
              </Select.Trigger>
              <Select.Content
                class="z-50 w-56 rounded-xl border border-border/40 bg-background/95 shadow-xl backdrop-blur-sm">
                <div class="border-b border-border/30 px-3 py-2.5">
                  <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Bot class="size-3.5 text-primary" />
                    Choose AI Agent
                  </div>
                </div>
                {#each getModelOptions() as option (option.id)}
                  <Select.Item value={option.id} class="text-xs">
                    <div class="flex items-center gap-2 px-2 py-1.5">
                      <span class="flex-shrink-0 text-sm">{option.icon}</span>
                      <div class="min-w-0 flex-1">
                        <div class="truncate font-medium text-foreground">{option.name}</div>
                        {#if option.description}
                          <div class="truncate text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>

            <!-- Delete Conversation Button -->
            <button
              type="button"
              onclick={deleteCurrentConversation}
              disabled={!currentConversationId || isSubmitting || isStreaming}
              class="flex-shrink-0 rounded-lg p-2 text-xs text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              title="Delete conversation">
              <Trash2 class="size-3.5" />
            </button>
          </div>

          <!-- Mobile Controls - Mode and agent dropdowns -->
          <div class="flex min-w-0 flex-1 items-center gap-1 sm:hidden">
            <!-- Mobile Mode Dropdown -->
            <Select.Root
              type="single"
              value={promptMode}
              onValueChange={(value) => setInputMode(value as 'ask' | 'create')}>
              <Select.Trigger
                size="sm"
                class="flex h-6 min-w-0 flex-shrink-0 items-center gap-1 rounded-md border border-border/50 bg-muted/20 px-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 hover:text-foreground">
                {#if promptMode === 'ask'}
                  <ArrowUp class="size-2.5" />
                {:else}
                  <Sparkles class="size-2.5" />
                {/if}
                <span class="max-w-[30px] truncate capitalize">{promptMode}</span>
              </Select.Trigger>
              <Select.Content
                class="z-50 min-w-[80px] rounded-md border border-border/50 bg-background shadow-lg">
                <Select.Item value="ask" class="text-xs">
                  <div class="flex items-center gap-1.5 px-1.5 py-1">
                    <ArrowUp class="size-2.5" />
                    <span>Ask</span>
                  </div>
                </Select.Item>
                <Select.Item value="create" class="text-xs">
                  <div class="flex items-center gap-1.5 px-1.5 py-1">
                    <Sparkles class="size-2.5" />
                    <span>Create</span>
                  </div>
                </Select.Item>
              </Select.Content>
            </Select.Root>

            <!-- Mobile Agent Selector -->
            <Select.Root
              type="single"
              value={selectedModelId}
              onValueChange={handleModelSelectChange}>
              <Select.Trigger
                size="sm"
                class="flex h-6 w-28 flex-shrink-0 items-center gap-1 rounded-md border border-border/50 bg-muted/20 px-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 hover:text-foreground">
                <Bot class="size-2.5 flex-shrink-0 text-primary" />
                <span class="max-w-[60px] truncate"
                  >{selectedModelName ? selectedModelName.slice(0, 6) + '...' : 'Agent'}</span>
              </Select.Trigger>
              <Select.Content
                class="z-50 w-40 rounded-md border border-border/50 bg-background shadow-lg">
                <div class="border-b border-border/30 px-2 py-1">
                  <div class="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Bot class="size-3 text-primary" />
                    Choose AI Agent
                  </div>
                </div>
                {#each getModelOptions() as option (option.id)}
                  <Select.Item value={option.id} class="text-xs">
                    <div class="flex items-center gap-1.5 px-1.5 py-1">
                      <span class="flex-shrink-0 text-sm">{option.icon}</span>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-xs font-medium text-foreground">
                          {option.name}
                        </div>
                      </div>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <!-- Send Button with Enhanced Modern Design -->
          <div class="flex items-center gap-3">
            <!-- Character count and typing indicator -->
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              {#if isTyping}
                <div class="flex items-center gap-1">
                  <div class="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                  <div class="h-2 w-2 animate-pulse rounded-full bg-primary delay-75"></div>
                  <div class="h-2 w-2 animate-pulse rounded-full bg-primary delay-150"></div>
                </div>
              {/if}
              {#if characterCount > 0}
                <span
                  class={`font-medium ${characterCount > MAX_CHARACTERS * 0.9 ? 'text-orange-500' : ''}`}>
                  {characterCount}/{MAX_CHARACTERS}
                </span>
              {/if}
            </div>

            <Button
              type={isStreaming ? 'button' : 'submit'}
              size="sm"
              variant={isStreaming ? 'destructive' : 'default'}
              onclick={isStreaming
                ? (e) => {
                    e.preventDefault();
                    handleStopStreaming();
                  }
                : undefined}
              disabled={!isStreaming && (isSubmitting || !messageText.trim())}
              class="h-8 w-8 flex-shrink-0 rounded-lg shadow-md transition-all duration-200 {isStreaming
                ? 'text-destructive-foreground bg-destructive shadow-red-500/20 hover:bg-destructive/90'
                : 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:scale-[1.02] hover:from-primary/95 hover:to-primary hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]'} disabled:opacity-50 disabled:hover:scale-100"
              aria-label={isStreaming ? 'Stop generation' : 'Send message'}>
              {#if isStreaming}
                <X class="size-3.5" />
              {:else if promptMode === 'create'}
                <Sparkles class="size-3.5" />
              {:else}
                <ArrowUp class="size-3.5" />
              {/if}
            </Button>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts Help -->
      {#if showKeyboardHelp}
        <div
          class="absolute right-0 bottom-full left-0 z-50 mb-2 rounded-lg border border-border bg-popover p-3 shadow-lg"
          role="tooltip"
          id="keyboard-shortcuts-help">
          <button
            type="button"
            onclick={() => (showKeyboardHelp = false)}
            class="absolute top-2 right-2 rounded-md p-1 transition-colors hover:bg-muted"
            aria-label="Close keyboard shortcuts help">
            <X class="size-3" />
          </button>

          <h4 class="mb-2 pr-6 text-sm font-medium">Keyboard Shortcuts</h4>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">Send message</span>
              <kbd class="rounded bg-muted px-1.5 py-0.5 text-xs">Enter</kbd>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">New line</span>
              <kbd class="rounded bg-muted px-1.5 py-0.5 text-xs">Shift + Enter</kbd>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">Toggle shortcuts</span>
              <kbd class="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl + /</kbd>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">Stop generation</span>
              <kbd class="rounded bg-muted px-1.5 py-0.5 text-xs">Click stop button</kbd>
            </div>
          </div>
        </div>
      {/if}
    </form>
  </div>
</div>

<!-- Add default export -->

<style>
  .shimmer-text {
    background: linear-gradient(
      90deg,
      var(--foreground) 0%,
      var(--muted-foreground) 50%,
      var(--foreground) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }

  /* Typing indicator animations */
  .delay-75 {
    animation-delay: 75ms;
  }

  .delay-150 {
    animation-delay: 150ms;
  }

  /* Enhanced textarea focus styles */
  textarea:focus {
    outline: none;
    box-shadow: none;
  }

  /* Keyboard shortcuts tooltip */
  kbd {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
      monospace;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
    border: 1px solid hsl(var(--border));
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    box-shadow: 0 1px 0 1px hsl(var(--border) / 20%);
  }

  /* Character count warning */
  .text-orange-500 {
    color: hsl(var(--orange) / 1);
  }

  /* Smooth transitions for input states */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }

  /* Diff highlighting styles - red/green code changes */
  :global(.diff-line) {
    display: flex;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
    padding: 1px 8px;
    margin: 0;
  }

  :global(.diff-marker) {
    width: 16px;
    flex-shrink: 0;
    user-select: none;
    font-weight: 600;
  }

  :global(.diff-content) {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Added lines - emerald green */
  :global(.diff-added) {
    background-color: rgba(16, 185, 129, 0.12);
    border-left: 3px solid rgb(16, 185, 129);
  }

  :global(.diff-added .diff-marker) {
    color: rgb(16, 185, 129);
  }

  :global(.diff-added .diff-content) {
    color: rgb(5, 150, 105);
  }

  /* Removed lines - rose red */
  :global(.diff-removed) {
    background-color: rgba(244, 63, 94, 0.12);
    border-left: 3px solid rgb(244, 63, 94);
  }

  :global(.diff-removed .diff-marker) {
    color: rgb(244, 63, 94);
  }

  :global(.diff-removed .diff-content) {
    color: rgb(225, 29, 72);
  }

  /* Unchanged lines */
  :global(.diff-unchanged) {
    background-color: transparent;
    border-left: 3px solid transparent;
  }

  :global(.diff-unchanged .diff-marker) {
    color: hsl(var(--muted-foreground) / 0.5);
  }

  :global(.diff-unchanged .diff-content) {
    color: hsl(var(--muted-foreground) / 0.8);
  }

  /* Dark mode adjustments */
  :global(.dark .diff-added) {
    background-color: rgba(52, 211, 153, 0.15);
    border-left-color: rgb(52, 211, 153);
  }

  :global(.dark .diff-added .diff-marker) {
    color: rgb(52, 211, 153);
  }

  :global(.dark .diff-added .diff-content) {
    color: rgb(110, 231, 183);
  }

  :global(.dark .diff-removed) {
    background-color: rgba(251, 113, 133, 0.15);
    border-left-color: rgb(251, 113, 133);
  }

  :global(.dark .diff-removed .diff-marker) {
    color: rgb(251, 113, 133);
  }

  :global(.dark .diff-removed .diff-content) {
    color: rgb(253, 164, 175);
  }

  :global(.dark .diff-unchanged .diff-content) {
    color: hsl(var(--muted-foreground) / 0.7);
  }

  /* Diff view container - no animation during streaming to prevent flickering */
  :global(.diff-view-container) {
    contain: layout style;
    will-change: contents;
  }

  /* Only animate when not streaming (has data-complete attribute) */
  :global(.diff-view-container[data-complete='true']) {
    animation: slideDown 0.3s ease-out forwards;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Diagram complete container - no animation during streaming */
  :global(.diagram-complete-container) {
    contain: layout style;
    will-change: contents;
  }

  :global(.diagram-complete-container[data-complete='true']) {
    animation: fadeIn 0.3s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Prevent layout shifts during streaming */
  :global(.tool-indicator) {
    contain: layout style;
    min-height: 28px;
  }
</style>
