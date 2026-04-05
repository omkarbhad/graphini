/**
 * Export all application state as a JSON file.
 * Includes: UI states, settings, chats, markdown documentation, and mermaid code.
 */
import { aiSettingsStore, toolsStore } from '$lib/stores';
import { documentMarkdownStore } from '$lib/stores/documentStore';
import { kvGetAll, kvGetCategory } from '$lib/stores/kvStore';
import { panelOrderStore, panelStore } from '$lib/stores/panels.svelte';
import { get } from 'svelte/store';
import { inputStateStore } from './state';

export interface AppStateExport {
  exportedAt: string;
  version: string;
  mermaidCode: string;
  mermaidConfig: string;
  markdown: string;
  panels: {
    config: any;
    order: any;
  };
  aiSettings: any;
  tools: any;
  chatMessages: any[];
  kvData: { category: string; key: string; value: unknown }[];
}

export function exportAppState(): AppStateExport {
  const state = get(inputStateStore);
  const markdown = get(documentMarkdownStore);
  const panels = get(panelStore);
  const panelOrder = get(panelOrderStore);
  const aiSettings = get(aiSettingsStore as any);
  const tools = get(toolsStore);

  // Collect chat data from KV store
  const chatData = kvGetCategory('chat');
  const chatMessages = Object.entries(chatData).map(([key, value]) => ({ key, value }));

  // Collect all KV data
  const kvData = kvGetAll();

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    mermaidCode: state.code || '',
    mermaidConfig: state.mermaid || '',
    markdown: markdown || '',
    panels: {
      config: panels,
      order: panelOrder
    },
    aiSettings,
    tools,
    chatMessages,
    kvData
  };
}

export function downloadAppState() {
  const data = exportAppState();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `graphini-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
