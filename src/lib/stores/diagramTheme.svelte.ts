/**
 * Diagram Theme Store (Svelte 5 runes)
 * Manages diagram color themes and presets.
 */

import { getThemeByMode, getPresetTheme, THEME_PRESETS, type ThemeColors } from '$lib/themes';
import { mode } from '$lib/stores/theme.svelte';
import { get } from 'svelte/store';
import { hmrRestore, hmrPreserve } from '$lib/util/hmr';

// ── State ──

const _hmrTheme = hmrRestore<{
  currentMode: 'light' | 'dark' | undefined;
  presetName: string;
  colors: string[];
}>('diagramThemeState');
let currentMode = $state<'light' | 'dark' | undefined>(_hmrTheme?.currentMode ?? get(mode));
let presetName = $state<keyof typeof THEME_PRESETS | 'custom'>(
  (_hmrTheme?.presetName as keyof typeof THEME_PRESETS | 'custom') ?? 'custom'
);
let colors = $state<string[]>(_hmrTheme?.colors ?? ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']);
hmrPreserve('diagramThemeState', () => ({ currentMode, presetName, colors }));

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
  addCustomColor(color: string) {
    if (colors.length < 8) {
      colors = [...colors, color];
    }
    presetName = 'custom';
  },

  applyPreset(name: keyof typeof THEME_PRESETS) {
    presetName = name;
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
  },

  removeCustomColor(index: number) {
    colors = colors.filter((_, i) => i !== index);
    presetName = 'custom';
  },

  reset() {
    presetName = 'custom';
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
  },

  setCustomColors(newColors: string[]) {
    colors = newColors.slice(0, 8);
    presetName = 'custom';
  },

  updateCustomColor(index: number, color: string) {
    const newColors = [...colors];
    newColors[index] = color;
    colors = newColors;
    presetName = 'custom';
  }
};

// ── Diagram color helpers ──

export const diagramColors = {
  get value() {
    const $theme = computeTheme();
    return {
      getBorderColors: (count = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScalePeer${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getFlowchartColors: () => ({
        clusterBkg: $theme.clusterBkg,
        clusterBorder: $theme.clusterBorder,
        defaultLinkColor: $theme.defaultLinkColor,
        edgeLabelBackground: $theme.edgeLabelBackground,
        nodeBkg: $theme.nodeBkg,
        nodeBorder: $theme.nodeBorder,
        titleColor: $theme.titleColor
      }),

      getGanttColors: () => ({
        activeTaskBkgColor: $theme.activeTaskBkgColor,
        activeTaskBorderColor: $theme.activeTaskBorderColor,
        altSectionBkgColor: $theme.altSectionBkgColor,
        critBkgColor: $theme.critBkgColor,
        critBorderColor: $theme.critBorderColor,
        doneTaskBkgColor: $theme.doneTaskBkgColor,
        gridColor: $theme.gridColor,
        sectionBkgColor: $theme.sectionBkgColor,
        sectionBkgColor2: $theme.sectionBkgColor2,
        taskBkgColor: $theme.taskBkgColor,
        taskBorderColor: $theme.taskBorderColor,
        taskTextColor: $theme.taskTextColor,
        todayLineColor: $theme.todayLineColor
      }),

      getNodeColors: (count = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScale${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getSequenceColors: () => ({
        activationBkgColor: $theme.activationBkgColor,
        activationBorderColor: $theme.activationBorderColor,
        actorBkg: $theme.actorBkg,
        actorBorder: $theme.actorBorder,
        actorLineColor: $theme.actorLineColor,
        actorTextColor: $theme.actorTextColor,
        labelBoxBkgColor: $theme.labelBoxBkgColor,
        labelBoxBorderColor: $theme.labelBoxBorderColor,
        labelTextColor: $theme.labelTextColor,
        noteBkgColor: $theme.noteBkgColor,
        noteBorderColor: $theme.noteBorderColor,
        noteTextColor: $theme.noteTextColor,
        signalColor: $theme.signalColor,
        signalTextColor: $theme.signalTextColor
      }),

      getSurfaceColors: () => {
        const result: string[] = [];
        for (let i = 0; i < 5; i++) {
          const color = $theme[`surface${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      },

      getTextColors: (count = 12) => {
        const result: string[] = [];
        for (let i = 0; i < Math.min(count, 12); i++) {
          const color = $theme[`cScaleLabel${i}` as keyof ThemeColors];
          if (typeof color === 'string') result.push(color);
        }
        return result;
      }
    };
  }
};

// Export theme utilities
export { themeToCSSVariables, applyThemeToDocument } from '$lib/themes';
