/**
 * Graphini Design Tokens (JS-side)
 *
 * Centralized constants for colors, palettes, and values used in TypeScript/Svelte logic.
 * CSS custom properties live in app.css — this file is for values needed in JS
 * (color pickers, SVG attributes, inline styles computed at runtime).
 *
 * To change the theme, edit:
 *   1. src/app.css           — CSS custom properties (semantic tokens)
 *   2. This file             — JS-side constants (palettes, canvas defaults)
 *   3. src/lib/themes/       — Mermaid diagram theme classes
 */

// ─── Canvas Defaults ───────────────────────────────────────────────
// These match the --canvas-* CSS variables. Use CSS vars in templates when possible;
// use these constants only when you need the value in JS (e.g., SVG attribute, runtime calc).

export const CANVAS_ACCENT = '#6366f1';
export const CANVAS_ACCENT_DARK = '#818cf8';
export const CANVAS_ACCENT_MUTED = 'rgba(99, 102, 241, 0.1)';
export const CANVAS_STICKY_COLOR = '#ffec99';
export const CANVAS_STICKY_BORDER = 'rgba(0, 0, 0, 0.08)';

// ─── Color Picker Palettes ─────────────────────────────────────────
// Shared across ElementToolbar, canvas, and any future color pickers.

/** Standard border/stroke colors — 18 colors */
export const STROKE_COLORS = [
	'#ef4444', // red
	'#f97316', // orange
	'#f59e0b', // amber
	'#84cc16', // lime
	'#22c55e', // green
	'#10b981', // emerald
	'#06b6d4', // cyan
	'#0ea5e9', // sky
	'#3b82f6', // blue
	'#6366f1', // indigo
	'#8b5cf6', // violet
	'#a855f7', // purple
	'#d946ef', // fuchsia
	'#6366f1', // indigo (duplicate for continuity)
	'#f43f5e', // rose
	'#78716c', // stone
	'#475569', // slate
	'#1e293b' // slate-dark
] as const;

/** Fill/background colors — stroke colors + white for fills */
export const FILL_COLORS = [...STROKE_COLORS, '#ffffff'] as const;

/** Subgraph/cluster background colors — stroke colors + white */
export const SUBGRAPH_COLORS = [...STROKE_COLORS, '#ffffff'] as const;

/** Compact color palette for quick pickers (canvas text/stroke) */
export const QUICK_COLORS = [
	'currentColor',
	'#ef4444',
	'#3b82f6',
	'#22c55e',
	'#f59e0b',
	'#8b5cf6'
] as const;

/** Extended quick palette with indigo (canvas stroke) */
export const QUICK_STROKE_COLORS = [
	'currentColor',
	'#ef4444',
	'#3b82f6',
	'#22c55e',
	'#f59e0b',
	'#8b5cf6',
	'#6366f1'
] as const;

// ─── Element Toolbar Defaults ──────────────────────────────────────

export const DEFAULT_NODE_BORDER = '#6366f1';
export const DEFAULT_NODE_FILL = '#e0e7ff';
export const DEFAULT_NODE_TEXT = '#1e293b';
export const DEFAULT_EDGE_COLOR = '#6366f1';
export const DEFAULT_EDGE_TEXT = '#1e293b';
export const DEFAULT_SUBGRAPH_FILL = '#eef2ff';
export const DEFAULT_SUBGRAPH_TEXT = '#1e293b';
export const DEFAULT_ICON_COLOR = '#000000';

// ─── Grid Pattern Colors ───────────────────────────────────────────
// Used by View.svelte and canvas for background patterns.

export const GRID = {
	light: {
		dot: '#6b728033',
		line: '#e5e7eb44'
	},
	dark: {
		dot: '#9ca3af33',
		line: '#37415144'
	}
} as const;

// ─── Dashboard Category Colors ─────────────────────────────────────
// Used for workspace type badges on the dashboard.

export const WORKSPACE_CATEGORIES = [
	{ type: 'flowchart', icon: 'flowchart', text: '#c4b5fd' },
	{ type: 'sequence', icon: 'sequence', text: '#6ee7b7' },
	{ type: 'class', icon: 'class', text: '#67e8f9' },
	{ type: 'state', icon: 'state', text: '#93c5fd' },
	{ type: 'er', icon: 'er', text: '#fcd34d' },
	{ type: 'other', icon: 'other', text: '#fda4af' }
] as const;

// ─── Brand Gradient ────────────────────────────────────────────────
// Use CSS var(--gradient-*) in templates. These are for JS-computed inline styles.

export const BRAND_GRADIENT = {
	light: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%)',
	dark: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #6366f1 100%)'
} as const;

// ─── Font Stacks ───────────────────────────────────────────────────
// Mirror what's in app.css — use only when setting font-family in JS.

export const FONT = {
	heading: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	body: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace"
} as const;
