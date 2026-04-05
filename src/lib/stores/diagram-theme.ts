/**
 * Diagram theme store and management
 */

import { writable, derived } from 'svelte/store';
import {
  getCurrentTheme,
  getThemeByMode,
  getPresetTheme,
  THEME_PRESETS,
  type ThemeColors
} from '$lib/themes';
import { mode } from '$lib/stores/theme';

// Current theme state
export const currentTheme = writable<ThemeColors>(getCurrentTheme());
export const selectedPreset = writable<keyof typeof THEME_PRESETS | 'custom'>('custom');
export const customColors = writable<string[]>(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']);

// Derived theme that updates when mode changes
export const theme = derived(
  [mode, selectedPreset, customColors],
  ([$mode, $selectedPreset, $customColors]) => {
    if ($selectedPreset !== 'custom') {
      return getPresetTheme($selectedPreset, $mode === 'dark');
    }

    // Apply custom colors to current theme
    const baseTheme = getThemeByMode($mode === 'dark' ? 'dark' : 'light');
    if ($customColors.length >= 3) {
      return {
        ...baseTheme,
        primaryColor: $customColors[0],
        secondaryColor: $customColors[1],
        tertiaryColor: $customColors[2]
      };
    }

    return baseTheme;
  },
  getCurrentTheme()
);

// Update current theme when derived theme changes
theme.subscribe((value) => {
  currentTheme.set(value);
});

// Theme actions
export const themeActions = {
  /**
   * Apply a preset theme
   */
  applyPreset(presetName: keyof typeof THEME_PRESETS) {
    selectedPreset.set(presetName);
  },

  /**
   * Set custom colors
   */
  setCustomColors(colors: string[]) {
    customColors.set(colors.slice(0, 8)); // Limit to 8 colors
    selectedPreset.set('custom');
  },

  /**
   * Add a custom color
   */
  addCustomColor(color: string) {
    customColors.update((colors) => {
      if (colors.length < 8) {
        return [...colors, color];
      }
      return colors;
    });
    selectedPreset.set('custom');
  },

  /**
   * Remove a custom color
   */
  removeCustomColor(index: number) {
    customColors.update((colors) => colors.filter((_, i) => i !== index));
    selectedPreset.set('custom');
  },

  /**
   * Update a custom color
   */
  updateCustomColor(index: number, color: string) {
    customColors.update((colors) => {
      const newColors = [...colors];
      newColors[index] = color;
      return newColors;
    });
    selectedPreset.set('custom');
  },

  /**
   * Reset to default theme
   */
  reset() {
    selectedPreset.set('custom');
    customColors.set(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']);
  },

  /**
   * Generate random colors
   */
  generateRandomColors() {
    const randomColors = Array.from(
      { length: 6 },
      () =>
        '#' +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, '0')
    );
    this.setCustomColors(randomColors);
  }
};

// Helper functions for diagram rendering
export const diagramColors = derived(theme, ($theme) => ({
  // Color scale for nodes
  getNodeColors: (count: number = 12) => {
    const colors: string[] = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const color = $theme[`cScale${i}` as keyof ThemeColors];
      if (typeof color === 'string') {
        colors.push(color);
      }
    }
    return colors;
  },

  // Border colors
  getBorderColors: (count: number = 12) => {
    const colors: string[] = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const color = $theme[`cScalePeer${i}` as keyof ThemeColors];
      if (typeof color === 'string') {
        colors.push(color);
      }
    }
    return colors;
  },

  // Text colors
  getTextColors: (count: number = 12) => {
    const colors: string[] = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const color = $theme[`cScaleLabel${i}` as keyof ThemeColors];
      if (typeof color === 'string') {
        colors.push(color);
      }
    }
    return colors;
  },

  // Surface colors for UI
  getSurfaceColors: () => {
    const colors: string[] = [];
    for (let i = 0; i < 5; i++) {
      const color = $theme[`surface${i}` as keyof ThemeColors];
      if (typeof color === 'string') {
        colors.push(color);
      }
    }
    return colors;
  },

  // Flowchart specific
  getFlowchartColors: () => ({
    nodeBkg: $theme.nodeBkg,
    nodeBorder: $theme.nodeBorder,
    clusterBkg: $theme.clusterBkg,
    clusterBorder: $theme.clusterBorder,
    defaultLinkColor: $theme.defaultLinkColor,
    titleColor: $theme.titleColor,
    edgeLabelBackground: $theme.edgeLabelBackground
  }),

  // Sequence diagram specific
  getSequenceColors: () => ({
    actorBorder: $theme.actorBorder,
    actorBkg: $theme.actorBkg,
    actorTextColor: $theme.actorTextColor,
    actorLineColor: $theme.actorLineColor,
    signalColor: $theme.signalColor,
    signalTextColor: $theme.signalTextColor,
    labelBoxBkgColor: $theme.labelBoxBkgColor,
    labelBoxBorderColor: $theme.labelBoxBorderColor,
    labelTextColor: $theme.labelTextColor,
    noteBorderColor: $theme.noteBorderColor,
    noteBkgColor: $theme.noteBkgColor,
    noteTextColor: $theme.noteTextColor,
    activationBorderColor: $theme.activationBorderColor,
    activationBkgColor: $theme.activationBkgColor
  }),

  // Gantt chart specific
  getGanttColors: () => ({
    sectionBkgColor: $theme.sectionBkgColor,
    altSectionBkgColor: $theme.altSectionBkgColor,
    sectionBkgColor2: $theme.sectionBkgColor2,
    taskBorderColor: $theme.taskBorderColor,
    taskBkgColor: $theme.taskBkgColor,
    taskTextColor: $theme.taskTextColor,
    activeTaskBorderColor: $theme.activeTaskBorderColor,
    activeTaskBkgColor: $theme.activeTaskBkgColor,
    gridColor: $theme.gridColor,
    doneTaskBkgColor: $theme.doneTaskBkgColor,
    critBorderColor: $theme.critBorderColor,
    critBkgColor: $theme.critBkgColor,
    todayLineColor: $theme.todayLineColor
  })
}));

// Export theme utilities
export { themeToCSSVariables, applyThemeToDocument } from '$lib/themes';
