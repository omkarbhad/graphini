/**
 * Diagram Theme Store (Svelte 5 runes)
 * Manages diagram color themes and presets.
 */

import {
  getCurrentTheme,
  getThemeByMode,
  getPresetTheme,
  THEME_PRESETS,
  type ThemeColors
} from '$lib/themes';
import { mode } from '$lib/stores/theme.svelte';
import { get } from 'svelte/store';

// ── State ──

let currentMode = $state<'light' | 'dark' | undefined>(get(mode));
let presetName = $state<keyof typeof THEME_PRESETS | 'custom'>('custom');
let colors = $state<string[]>(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']);

// Subscribe to mode-watcher's mode store to keep currentMode in sync
if (typeof window !== 'undefined') {
  mode.subscribe((v) => {
    currentMode = v;
  });
}

// ── Derived theme ──

function computeTheme(): ThemeColors {
  if (presetName !== 'custom') {
    return getPresetTheme(presetName, currentMode === 'dark');
  }

  const baseTheme = getThemeByMode(currentMode === 'dark' ? 'dark' : 'light');
  if (colors.length >= 3) {
    return {
      ...baseTheme,
      primaryColor: colors[0],
      secondaryColor: colors[1],
      tertiaryColor: colors[2]
    };
  }

  return baseTheme;
}

// ── Exported stores ──

export const selectedPreset = {
  get value() {
    return presetName;
  },
  set(v: keyof typeof THEME_PRESETS | 'custom') {
    presetName = v;
  }
};

export const customColors = {
  get value() {
    return colors;
  },
  set(v: string[]) {
    colors = v;
  }
};

export const currentTheme = {
  get value(): ThemeColors {
    return computeTheme();
  }
};

export const theme = {
  get value(): ThemeColors {
    return computeTheme();
  }
};

// ── Theme actions ──

export const themeActions = {
  applyPreset(name: keyof typeof THEME_PRESETS) {
    presetName = name;
  },

  setCustomColors(newColors: string[]) {
    colors = newColors.slice(0, 8);
    presetName = 'custom';
  },

  addCustomColor(color: string) {
    if (colors.length < 8) {
      colors = [...colors, color];
    }
    presetName = 'custom';
  },

  removeCustomColor(index: number) {
    colors = colors.filter((_, i) => i !== index);
    presetName = 'custom';
  },

  updateCustomColor(index: number, color: string) {
    const newColors = [...colors];
    newColors[index] = color;
    colors = newColors;
    presetName = 'custom';
  },

  reset() {
    presetName = 'custom';
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
  },

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

// ── Diagram color helpers ──

export const diagramColors = {
  get value() {
    const $theme = computeTheme();
    return {
      getNodeColors: (count: number = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScale${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getBorderColors: (count: number = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScalePeer${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getTextColors: (count: number = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScaleLabel${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getSurfaceColors: () => {
        const result: string[] = [];
        for (let i = 0; i < 5; i++) {
          const color = $theme[`surface${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getFlowchartColors: () => ({
        nodeBkg: $theme.nodeBkg,
        nodeBorder: $theme.nodeBorder,
        clusterBkg: $theme.clusterBkg,
        clusterBorder: $theme.clusterBorder,
        defaultLinkColor: $theme.defaultLinkColor,
        titleColor: $theme.titleColor,
        edgeLabelBackground: $theme.edgeLabelBackground
      }),

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
    };
  }
};

// Export theme utilities
export { themeToCSSVariables, applyThemeToDocument } from '$lib/themes';
