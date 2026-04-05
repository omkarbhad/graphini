import { kvGet, kvSet } from '$lib/stores/kvStore';
import { writable } from 'svelte/store';

// ── Server Sync Helpers ──
let serverSyncTimeout: ReturnType<typeof setTimeout> | null = null;

async function savePrefsToServer(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  serverSyncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { [key]: value } }),
        credentials: 'include'
      });
    } catch {
      /* silent fail */
    }
  }, 300);
}

async function loadPrefsFromServer(): Promise<Record<string, unknown> | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/user/preferences', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.preferences || null;
    }
  } catch {
    /* silent */
  }
  return null;
}

/** Call after login to pull server prefs into stores */
export async function syncPreferencesFromServer() {
  const prefs = await loadPrefsFromServer();
  if (!prefs) return;
  if (prefs.panelOrder) {
    const order = prefs.panelOrder as PanelId[];
    if (
      Array.isArray(order) &&
      order.length === DEFAULT_ORDER.length &&
      DEFAULT_ORDER.every((id) => order.includes(id))
    ) {
      panelOrderStore.set(order);
      try {
        kvSet('panels', ORDER_STORAGE_KEY, order);
      } catch {}
    }
  }
  if (prefs.panelState) {
    const saved = prefs.panelState as Partial<Record<PanelId, { visible: boolean; width: number }>>;
    for (const id of DEFAULT_ORDER) {
      if (saved[id]) {
        if (typeof saved[id]!.visible === 'boolean') {
          if (saved[id]!.visible) panelStore.show(id);
          else panelStore.hide(id);
        }
        if (typeof saved[id]!.width === 'number') {
          panelStore.setWidth(id, saved[id]!.width);
        }
      }
    }
  }
}

export type PanelId = 'files' | 'canvas' | 'document' | 'code' | 'chat';

export interface PanelConfig {
  id: PanelId;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  /** If true, this panel fills remaining space (flex-1) instead of fixed width */
  flex?: boolean;
}

const DEFAULT_ORDER: PanelId[] = ['files', 'canvas', 'document', 'code', 'chat'];

const PANEL_DEFAULTS: Record<PanelId, Omit<PanelConfig, 'id'>> = {
  files: { label: 'Files', visible: true, width: 260, minWidth: 180, maxWidth: 9999 },
  canvas: { label: 'Canvas', visible: true, width: 0, minWidth: 200, maxWidth: 9999, flex: true },
  document: { label: 'Document', visible: false, width: 400, minWidth: 220, maxWidth: 9999 },
  code: { label: 'Code', visible: true, width: 350, minWidth: 220, maxWidth: 9999 },
  chat: { label: 'Chat', visible: true, width: 380, minWidth: 220, maxWidth: 9999 }
};

const STORAGE_KEY = 'graphini_panels_v2';
const ORDER_STORAGE_KEY = 'graphini_panel_order_v1';

// ── Panel Order (mutable, persistable) ──

function loadPanelOrder(): PanelId[] {
  if (typeof window === 'undefined') return [...DEFAULT_ORDER];
  try {
    const saved = kvGet<PanelId[]>('panels', ORDER_STORAGE_KEY);
    if (!saved) return [...DEFAULT_ORDER];
    // Validate: must contain exactly the same IDs
    if (
      Array.isArray(saved) &&
      saved.length === DEFAULT_ORDER.length &&
      DEFAULT_ORDER.every((id) => saved.includes(id))
    ) {
      return saved;
    }
  } catch {}
  return [...DEFAULT_ORDER];
}

function savePanelOrder(order: PanelId[]) {
  if (typeof window === 'undefined') return;
  try {
    kvSet('panels', ORDER_STORAGE_KEY, order);
  } catch {}
  savePrefsToServer('panelOrder', order);
}

function createPanelOrderStore() {
  const { subscribe, set, update } = writable<PanelId[]>(loadPanelOrder());

  return {
    subscribe,
    set,
    update,
    reorder(newOrder: PanelId[]) {
      set(newOrder);
      savePanelOrder(newOrder);
    },
    reset() {
      const def = [...DEFAULT_ORDER];
      set(def);
      savePanelOrder(def);
    }
  };
}

export const panelOrderStore = createPanelOrderStore();

/** @deprecated Use panelOrderStore for dynamic order. This is the default order. */
export const PANEL_ORDER = DEFAULT_ORDER;

// ── Panel Config Store ──

function loadPanelState(): Record<PanelId, PanelConfig> {
  const defaults = Object.fromEntries(
    DEFAULT_ORDER.map((id) => [id, { id, ...PANEL_DEFAULTS[id] }])
  ) as Record<PanelId, PanelConfig>;

  if (typeof window === 'undefined') return defaults;

  try {
    const saved = kvGet<Partial<Record<PanelId, Partial<PanelConfig>>>>('panels', STORAGE_KEY);
    if (!saved) return defaults;
    for (const id of DEFAULT_ORDER) {
      if (saved[id]) {
        if (typeof saved[id].visible === 'boolean') defaults[id].visible = saved[id].visible;
        if (typeof saved[id].width === 'number') {
          defaults[id].width = Math.max(defaults[id].minWidth, saved[id].width!);
        }
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

function savePanelState(panels: Record<PanelId, PanelConfig>) {
  if (typeof window === 'undefined') return;
  try {
    const toSave: Partial<Record<PanelId, { visible: boolean; width: number }>> = {};
    for (const id of DEFAULT_ORDER) {
      toSave[id] = { visible: panels[id].visible, width: panels[id].width };
    }
    kvSet('panels', STORAGE_KEY, toSave);
    savePrefsToServer('panelState', toSave);
  } catch {}
}

function createPanelStore() {
  const initial = loadPanelState();
  const { subscribe, update, set } = writable(initial);

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = (panels: Record<PanelId, PanelConfig>) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => savePanelState(panels), 150);
  };

  return {
    subscribe,

    toggle(id: PanelId) {
      update((panels) => {
        panels[id].visible = !panels[id].visible;
        debouncedSave(panels);
        return { ...panels };
      });
    },

    show(id: PanelId) {
      update((panels) => {
        panels[id].visible = true;
        debouncedSave(panels);
        return { ...panels };
      });
    },

    hide(id: PanelId) {
      update((panels) => {
        panels[id].visible = false;
        debouncedSave(panels);
        return { ...panels };
      });
    },

    setWidth(id: PanelId, width: number) {
      update((panels) => {
        const p = panels[id];
        p.width = Math.max(p.minWidth, width);
        debouncedSave(panels);
        return { ...panels };
      });
    },

    /** Get visible panels in given order */
    getVisiblePanels(panels: Record<PanelId, PanelConfig>, order?: PanelId[]): PanelConfig[] {
      return (order || DEFAULT_ORDER).filter((id) => panels[id].visible).map((id) => panels[id]);
    },

    reset() {
      const defaults = Object.fromEntries(
        DEFAULT_ORDER.map((id) => [id, { id, ...PANEL_DEFAULTS[id] }])
      ) as Record<PanelId, PanelConfig>;
      set(defaults);
      savePanelState(defaults);
    }
  };
}

export const panelStore = createPanelStore();
