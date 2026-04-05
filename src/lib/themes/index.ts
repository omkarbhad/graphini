/**
 * Theme system exports and utilities
 */

export { BaseTheme } from './theme-base';
export type { ThemeColors } from './theme-base';
export { DarkTheme, getDarkTheme } from './theme-dark';
export { DefaultTheme, getDefaultTheme } from './theme-default';

import { mode } from '$lib/stores/theme.svelte';
import type { ThemeColors } from './theme-base';
import { getDarkTheme } from './theme-dark';
import { getDefaultTheme } from './theme-default';

/**
 * Get theme based on current mode
 */
export function getCurrentTheme(overrides: Partial<ThemeColors> = {}): ThemeColors {
  let currentMode: 'light' | 'dark' | undefined;
  const unsubscribe = mode.subscribe((value) => (currentMode = value));
  unsubscribe();

  if (currentMode === 'dark') {
    return getDarkTheme(overrides);
  }
  return getDefaultTheme(overrides);
}

/**
 * Get theme by mode name
 */
export function getThemeByMode(
  modeName: 'light' | 'dark',
  overrides: Partial<ThemeColors> = {}
): ThemeColors {
  if (modeName === 'dark') {
    return getDarkTheme(overrides);
  }
  return getDefaultTheme(overrides);
}

/**
 * Generate CSS custom properties from theme
 */
export function themeToCSSVariables(theme: ThemeColors): Record<string, string> {
  const cssVars: Record<string, string> = {};

  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Convert camelCase to kebab-case for CSS variables
      const cssVarName = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      cssVars[`--theme-${cssVarName}`] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested objects like xyChart, radar, etc.
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (typeof subValue === 'string' || typeof subValue === 'number') {
          const cssVarName = `${key}-${subKey}`
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase();
          cssVars[`--theme-${cssVarName}`] = String(subValue);
        }
      });
    }
  });

  return cssVars;
}

/**
 * Apply theme to document root
 */
export function applyThemeToDocument(theme: ThemeColors): void {
  const cssVars = themeToCSSVariables(theme);
  const root = document.documentElement;

  Object.entries(cssVars).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}

/**
 * Get color scale for diagrams
 */
export function getColorScale(theme: ThemeColors, count: number = 12): string[] {
  const colors: string[] = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    const color = theme[`cScale${i}` as keyof ThemeColors];
    if (typeof color === 'string') {
      colors.push(color);
    }
  }
  return colors;
}

/**
 * Get peer colors (borders) for diagrams
 */
export function getPeerColors(theme: ThemeColors, count: number = 12): string[] {
  const colors: string[] = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    const color = theme[`cScalePeer${i}` as keyof ThemeColors];
    if (typeof color === 'string') {
      colors.push(color);
    }
  }
  return colors;
}

/**
 * Get label colors for diagrams
 */
export function getLabelColors(theme: ThemeColors, count: number = 12): string[] {
  const colors: string[] = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    const color = theme[`cScaleLabel${i}` as keyof ThemeColors];
    if (typeof color === 'string') {
      colors.push(color);
    }
  }
  return colors;
}

/**
 * Get surface colors for UI elements
 */
export function getSurfaceColors(theme: ThemeColors): string[] {
  const colors: string[] = [];
  for (let i = 0; i < 5; i++) {
    const color = theme[`surface${i}` as keyof ThemeColors];
    if (typeof color === 'string') {
      colors.push(color);
    }
  }
  return colors;
}

/**
 * Preset theme configurations - vibrant, modern colors
 */
export const THEME_PRESETS = {
  // Ocean theme - blue based with cyan accents
  ocean: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    tertiaryColor: '#3b82f6',
    mainBkg: '#f0f9ff',
    secondBkg: '#ecfeff',
    border1: '#0ea5e9',
    border2: '#06b6d4',
    nodeBkg: '#e0f2fe',
    nodeBorder: '#0284c7'
  } as Partial<ThemeColors>,

  // Sunset theme - warm vibrant colors
  sunset: {
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    tertiaryColor: '#eab308',
    mainBkg: '#fff7ed',
    secondBkg: '#fef2f2',
    border1: '#f97316',
    border2: '#ef4444',
    nodeBkg: '#ffedd5',
    nodeBorder: '#ea580c'
  } as Partial<ThemeColors>,

  // Forest theme - lush green tones
  forest: {
    primaryColor: '#10b981',
    secondaryColor: '#22c55e',
    tertiaryColor: '#14b8a6',
    mainBkg: '#ecfdf5',
    secondBkg: '#f0fdf4',
    border1: '#10b981',
    border2: '#22c55e',
    nodeBkg: '#d1fae5',
    nodeBorder: '#059669'
  } as Partial<ThemeColors>,

  // Purple theme - rich violet tones
  purple: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#a855f7',
    tertiaryColor: '#6366f1',
    mainBkg: '#faf5ff',
    secondBkg: '#f5f3ff',
    border1: '#8b5cf6',
    border2: '#a855f7',
    nodeBkg: '#ede9fe',
    nodeBorder: '#7c3aed'
  } as Partial<ThemeColors>,

  // Monochrome theme - elegant grays with good contrast
  monochrome: {
    primaryColor: '#475569',
    secondaryColor: '#64748b',
    tertiaryColor: '#94a3b8',
    mainBkg: '#f8fafc',
    secondBkg: '#f1f5f9',
    border1: '#475569',
    border2: '#64748b',
    nodeBkg: '#e2e8f0',
    nodeBorder: '#334155'
  } as Partial<ThemeColors>
};

/**
 * Get preset theme
 */
export function getPresetTheme(
  presetName: keyof typeof THEME_PRESETS,
  darkMode = false
): ThemeColors {
  const preset = THEME_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown theme preset: ${presetName}`);
  }

  if (darkMode) {
    return getDarkTheme(preset);
  }
  return getDefaultTheme(preset);
}
