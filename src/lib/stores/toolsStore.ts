import { kvGet, kvSet } from '$lib/stores/kvStore';
import { writable } from 'svelte/store';

export interface ToolConfig {
  id: string;
  label: string;
  description: string;
  category: 'diagram' | 'icons' | 'search' | 'interaction' | 'intelligence' | 'files';
  enabled: boolean;
}

const DEFAULT_TOOLS: ToolConfig[] = [
  {
    id: 'diagramRead',
    label: 'Diagram Read',
    description: 'Read current diagram content from the editor',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'diagramWrite',
    label: 'Diagram Write',
    description: 'Write or replace the entire diagram',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'diagramPatch',
    label: 'Diagram Patch',
    description: 'Apply surgical edits to specific lines',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'diagramDelete',
    label: 'Diagram Delete',
    description: 'Clear the entire diagram',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'iconifier',
    label: 'Iconifier',
    description: 'Add or remove icons on diagram nodes',
    category: 'icons',
    enabled: true
  },
  {
    id: 'webSearch',
    label: 'Web Search',
    description: 'Search the web for information',
    category: 'search',
    enabled: true
  },
  {
    id: 'askQuestions',
    label: 'Ask Questions',
    description: 'Ask clarifying questions before creating diagrams',
    category: 'interaction',
    enabled: true
  },
  {
    id: 'markdownRead',
    label: 'Markdown Read',
    description: 'Read content from the markdown editor',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'markdownWrite',
    label: 'Markdown Write',
    description: 'Write content to the markdown editor',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'errorChecker',
    label: 'Error Checker',
    description: 'Validate diagram syntax and report errors',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'autoStyler',
    label: 'Auto Styler',
    description: 'Automatically style nodes and subgraphs with harmonious colors',
    category: 'diagram',
    enabled: true
  },
  {
    id: 'planner',
    label: 'Planner',
    description: 'Decompose complex tasks into step-by-step plans',
    category: 'intelligence',
    enabled: true
  },
  {
    id: 'actionItemExtractor',
    label: 'Action Items',
    description: 'Extract action items, risks, KPIs, and entities from documents',
    category: 'intelligence',
    enabled: true
  },
  {
    id: 'tableAnalytics',
    label: 'Table Analytics',
    description: 'Analyze CSV/tabular data with statistics and chart suggestions',
    category: 'intelligence',
    enabled: true
  },
  {
    id: 'selfCritique',
    label: 'Self Critique',
    description: 'Evaluate and improve diagrams/documents for quality',
    category: 'intelligence',
    enabled: true
  },
  {
    id: 'fileManager',
    label: 'File Manager',
    description: 'List, read, search, and manage uploaded files and attachments',
    category: 'files',
    enabled: true
  },
  {
    id: 'dataAnalyzer',
    label: 'Data Analyzer',
    description: 'Analyze CSV/Excel data: frequency, groupBy, filter, topN, correlations',
    category: 'files',
    enabled: true
  }
];

const STORAGE_KEY = 'graphini_tools_config_v1';

function loadToolsConfig(): ToolConfig[] {
  if (typeof window === 'undefined') return [...DEFAULT_TOOLS];
  try {
    const saved = kvGet<Record<string, boolean>>('tools', STORAGE_KEY);
    if (!saved) return [...DEFAULT_TOOLS];
    return DEFAULT_TOOLS.map((t) => ({
      ...t,
      enabled: saved[t.id] !== undefined ? saved[t.id] : t.enabled
    }));
  } catch {
    return [...DEFAULT_TOOLS];
  }
}

function saveToolsConfig(tools: ToolConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave: Record<string, boolean> = {};
    for (const t of tools) {
      toSave[t.id] = t.enabled;
    }
    kvSet('tools', STORAGE_KEY, toSave);
  } catch {}
}

function createToolsStore() {
  const { subscribe, set, update } = writable<ToolConfig[]>(loadToolsConfig());

  return {
    subscribe,

    toggle(toolId: string) {
      update((tools) => {
        const updated = tools.map((t) => (t.id === toolId ? { ...t, enabled: !t.enabled } : t));
        saveToolsConfig(updated);
        return updated;
      });
    },

    setEnabled(toolId: string, enabled: boolean) {
      update((tools) => {
        const updated = tools.map((t) => (t.id === toolId ? { ...t, enabled } : t));
        saveToolsConfig(updated);
        return updated;
      });
    },

    enableAll() {
      update((tools) => {
        const updated = tools.map((t) => ({ ...t, enabled: true }));
        saveToolsConfig(updated);
        return updated;
      });
    },

    disableAll() {
      update((tools) => {
        const updated = tools.map((t) => ({ ...t, enabled: false }));
        saveToolsConfig(updated);
        return updated;
      });
    },

    getEnabledToolIds(): string[] {
      let ids: string[] = [];
      const unsub = subscribe((tools) => {
        ids = tools.filter((t) => t.enabled).map((t) => t.id);
      });
      unsub();
      return ids;
    },

    reset() {
      const defaults = [...DEFAULT_TOOLS];
      set(defaults);
      saveToolsConfig(defaults);
    }
  };
}

export const toolsStore = createToolsStore();

export const TOOL_CATEGORIES: { id: string; label: string }[] = [
  { id: 'diagram', label: 'Diagram' },
  { id: 'icons', label: 'Icons' },
  { id: 'search', label: 'Search' },
  { id: 'interaction', label: 'Interaction' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'files', label: 'Files & Data' }
];
