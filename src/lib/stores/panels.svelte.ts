import { kv } from '$lib/stores/kvStore.svelte';

// ── Types ──

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

// ── Defaults ──

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

// ── Server Sync ──

let serverSyncTimeout: ReturnType<typeof setTimeout> | null = null;

function savePrefsToServer(key: string, value: unknown) {
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

// ── Helpers ──

function buildDefaults(): Record<PanelId, PanelConfig> {
	return Object.fromEntries(
		DEFAULT_ORDER.map((id) => [id, { id, ...PANEL_DEFAULTS[id] }])
	) as Record<PanelId, PanelConfig>;
}

function loadPanelState(): Record<PanelId, PanelConfig> {
	const defaults = buildDefaults();
	if (typeof window === 'undefined') return defaults;

	try {
		const saved = kv.get<Partial<Record<PanelId, Partial<PanelConfig>>>>('panels', STORAGE_KEY);
		if (!saved) return defaults;
		for (const id of DEFAULT_ORDER) {
			if (saved[id]) {
				if (typeof saved[id]!.visible === 'boolean') defaults[id].visible = saved[id]!.visible!;
				if (typeof saved[id]!.width === 'number') {
					defaults[id].width = Math.max(defaults[id].minWidth, saved[id]!.width!);
				}
			}
		}
		return defaults;
	} catch {
		return defaults;
	}
}

function loadPanelOrder(): PanelId[] {
	if (typeof window === 'undefined') return [...DEFAULT_ORDER];
	try {
		const saved = kv.get<PanelId[]>('panels', ORDER_STORAGE_KEY);
		if (!saved) return [...DEFAULT_ORDER];
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

// ── PanelManager ──

class PanelManager {
	panels = $state<Record<PanelId, PanelConfig>>(loadPanelState());
	order = $state<PanelId[]>(loadPanelOrder());
	visiblePanels = $derived(
		this.order.filter((id) => this.panels[id].visible).map((id) => this.panels[id])
	);

	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	private debouncedSave() {
		if (this.saveTimeout) clearTimeout(this.saveTimeout);
		this.saveTimeout = setTimeout(() => {
			const toSave: Partial<Record<PanelId, { visible: boolean; width: number }>> = {};
			for (const id of DEFAULT_ORDER) {
				toSave[id] = { visible: this.panels[id].visible, width: this.panels[id].width };
			}
			kv.set('panels', STORAGE_KEY, toSave);
			savePrefsToServer('panelState', toSave);
		}, 150);
	}

	private saveOrder() {
		kv.set('panels', ORDER_STORAGE_KEY, this.order);
		savePrefsToServer('panelOrder', this.order);
	}

	toggle(id: PanelId): void {
		this.panels[id].visible = !this.panels[id].visible;
		this.panels = { ...this.panels };
		this.debouncedSave();
	}

	show(id: PanelId): void {
		this.panels[id].visible = true;
		this.panels = { ...this.panels };
		this.debouncedSave();
	}

	hide(id: PanelId): void {
		this.panels[id].visible = false;
		this.panels = { ...this.panels };
		this.debouncedSave();
	}

	setWidth(id: PanelId, width: number): void {
		const p = this.panels[id];
		p.width = Math.max(p.minWidth, width);
		this.panels = { ...this.panels };
		this.debouncedSave();
	}

	reorder(newOrder: PanelId[]): void {
		this.order = newOrder;
		this.saveOrder();
	}

	reset(): void {
		this.panels = buildDefaults();
		this.order = [...DEFAULT_ORDER];
		const toSave: Partial<Record<PanelId, { visible: boolean; width: number }>> = {};
		for (const id of DEFAULT_ORDER) {
			toSave[id] = { visible: this.panels[id].visible, width: this.panels[id].width };
		}
		kv.set('panels', STORAGE_KEY, toSave);
		kv.set('panels', ORDER_STORAGE_KEY, this.order);
		savePrefsToServer('panelState', toSave);
		savePrefsToServer('panelOrder', this.order);
	}
}

// ── Exports ──

export const panels = new PanelManager();
export const PANEL_ORDER = DEFAULT_ORDER;

/** Call after login to pull server prefs into the panels instance */
export async function syncPreferencesFromServer(): Promise<void> {
	if (typeof window === 'undefined') return;
	try {
		const res = await fetch('/api/user/preferences', { credentials: 'include' });
		if (!res.ok) return;
		const data = await res.json();
		const prefs = data.preferences;
		if (!prefs) return;

		if (prefs.panelOrder) {
			const order = prefs.panelOrder as PanelId[];
			if (
				Array.isArray(order) &&
				order.length === DEFAULT_ORDER.length &&
				DEFAULT_ORDER.every((id) => order.includes(id))
			) {
				panels.reorder(order);
			}
		}

		if (prefs.panelState) {
			const saved = prefs.panelState as Partial<
				Record<PanelId, { visible: boolean; width: number }>
			>;
			for (const id of DEFAULT_ORDER) {
				if (saved[id]) {
					if (typeof saved[id]!.visible === 'boolean') {
						if (saved[id]!.visible) panels.show(id);
						else panels.hide(id);
					}
					if (typeof saved[id]!.width === 'number') {
						panels.setWidth(id, saved[id]!.width);
					}
				}
			}
		}
	} catch {
		/* silent */
	}
}
