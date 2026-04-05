/**
 * Dark mode utilities for enhanced edge visibility and text readability
 */

import { currentTheme } from '$lib/stores/diagram-theme';
import { mode } from '$lib/stores/theme';
import { get } from 'svelte/store';

/**
 * Apply dark mode enhancements to Mermaid diagrams
 */
export function applyDarkModeEnhancements(): void {
  const isDarkMode = get(mode) === 'dark';
  const theme = get(currentTheme);

  if (!isDarkMode || !theme) return;

  // Apply CSS custom properties for enhanced dark mode
  const root = document.documentElement;

  // Enhanced edge colors with better contrast
  root.style.setProperty('--edge-enhanced-color', theme.lineColor || '#cccccc');
  root.style.setProperty('--edge-glow-color', 'rgba(255, 255, 255, 0.3)');
  root.style.setProperty('--node-shadow-color', 'rgba(0, 0, 0, 0.5)');

  // Enhanced text colors for better readability
  root.style.setProperty('--text-enhanced-color', theme.textColor || '#ffffff');
  root.style.setProperty('--text-shadow-color', 'rgba(0, 0, 0, 0.8)');
  root.style.setProperty('--title-enhanced-color', theme.titleColor || '#ffffff');
  root.style.setProperty('--label-enhanced-color', theme.labelTextColor || '#f0f0f0');

  // Diagram-specific enhancements
  root.style.setProperty('--flowchart-edge-color', theme.defaultLinkColor || theme.lineColor);
  root.style.setProperty('--sequence-actor-border', theme.actorBorder || theme.border1);
  root.style.setProperty('--sequence-signal-color', theme.signalColor || theme.lineColor);
  root.style.setProperty('--gantt-grid-color', theme.gridColor || '#666666');
  root.style.setProperty('--state-transition-color', theme.transitionColor || theme.lineColor);

  // Add dark mode class to body for CSS targeting
  document.body.classList.add('dark-mode-enhanced');

  // Inject enhanced styles if not already present
  injectDarkModeStyles();
}

/**
 * Remove dark mode enhancements
 */
export function removeDarkModeEnhancements(): void {
  document.body.classList.remove('dark-mode-enhanced');

  // Remove custom properties
  const root = document.documentElement;
  const properties = [
    '--edge-enhanced-color',
    '--edge-glow-color',
    '--node-shadow-color',
    '--text-enhanced-color',
    '--text-shadow-color',
    '--title-enhanced-color',
    '--label-enhanced-color',
    '--flowchart-edge-color',
    '--sequence-actor-border',
    '--sequence-signal-color',
    '--gantt-grid-color',
    '--state-transition-color'
  ];

  properties.forEach((prop) => root.style.removeProperty(prop));
}

/**
 * Inject dark mode enhancement styles
 */
function injectDarkModeStyles(): void {
  const styleId = 'dark-mode-enhancements';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Dark Mode Enhancements */
    .dark-mode-enhanced .mermaid .edgePath .path {
      stroke: var(--edge-enhanced-color) !important;
      stroke-width: 2.5px !important;
      filter: drop-shadow(0 0 2px var(--edge-glow-color));
    }
    
    .dark-mode-enhanced .mermaid .edgeLabel {
      filter: drop-shadow(0 1px 2px var(--text-shadow-color));
    }
    
    .dark-mode-enhanced .mermaid .node rect,
    .dark-mode-enhanced .mermaid .node circle,
    .dark-mode-enhanced .mermaid .node ellipse,
    .dark-mode-enhanced .mermaid .node polygon {
      stroke-width: 2px !important;
      filter: drop-shadow(0 2px 4px var(--node-shadow-color));
    }
    
    .dark-mode-enhanced .mermaid .node text,
    .dark-mode-enhanced .mermaid .cluster text,
    .dark-mode-enhanced .mermaid .titleText {
      fill: var(--text-enhanced-color) !important;
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 500;
    }
    
    .dark-mode-enhanced .mermaid .edgeLabel text {
      fill: var(--label-enhanced-color) !important;
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 600;
    }
    
    .dark-mode-enhanced .mermaid .title {
      fill: var(--title-enhanced-color) !important;
      text-shadow: 0 2px 4px var(--text-shadow-color);
      font-weight: 700;
    }
    
    /* Sequence diagram specific */
    .dark-mode-enhanced .mermaid .actor {
      filter: drop-shadow(0 2px 4px var(--node-shadow-color));
    }
    
    .dark-mode-enhanced .mermaid .messageLine0,
    .dark-mode-enhanced .mermaid .messageLine1 {
      stroke-width: 2px !important;
      filter: drop-shadow(0 0 1px var(--edge-glow-color));
    }
    
    .dark-mode-enhanced .mermaid .messageText {
      fill: var(--text-enhanced-color) !important;
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 600;
    }
    
    /* Gantt chart specific */
    .dark-mode-enhanced .mermaid .grid .tick line {
      stroke: var(--gantt-grid-color) !important;
      opacity: 0.6;
    }
    
    .dark-mode-enhanced .mermaid .taskText {
      fill: var(--text-enhanced-color) !important;
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 600;
    }
    
    /* State diagram specific */
    .dark-mode-enhanced .mermaid .transition {
      stroke: var(--state-transition-color) !important;
      stroke-width: 2px !important;
      filter: drop-shadow(0 0 1px var(--edge-glow-color));
    }
    
    .dark-mode-enhanced .mermaid .state text {
      fill: var(--text-enhanced-color) !important;
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 600;
    }
    
    /* High contrast support */
    @media (prefers-contrast: high) {
      .dark-mode-enhanced .mermaid .edgePath .path {
        stroke-width: 3px !important;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));
      }
      
      .dark-mode-enhanced .mermaid .node text,
      .dark-mode-enhanced .mermaid .cluster text {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
        font-weight: 700;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .dark-mode-enhanced .mermaid * {
        transition: none !important;
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Monitor theme changes and apply/remove enhancements
 */
export function setupDarkModeEnhancements(): () => void {
  let currentMode = get(mode);

  // Apply initial state
  if (currentMode === 'dark') {
    applyDarkModeEnhancements();
  }

  // Subscribe to mode changes
  const unsubscribe = mode.subscribe((newMode) => {
    if (newMode === 'dark' && currentMode !== 'dark') {
      applyDarkModeEnhancements();
    } else if (newMode !== 'dark' && currentMode === 'dark') {
      removeDarkModeEnhancements();
    }
    currentMode = newMode;
  });

  return unsubscribe;
}

/**
 * Get enhanced dark mode color configuration
 */
export function getEnhancedDarkModeColors(theme: any) {
  return {
    // Enhanced edge colors with better visibility
    edgeColor: theme.lineColor || '#cccccc',
    edgeGlowColor: 'rgba(255, 255, 255, 0.3)',
    nodeBorderColor: theme.border1 || lighten(theme.border1 || '#999', 15),
    clusterBorderColor: theme.border2 || lighten(theme.border2 || '#666', 20),

    // Enhanced text colors for better readability
    primaryTextColor: theme.textColor || '#ffffff',
    secondaryTextColor: theme.secondaryTextColor || '#e5e5e5',
    titleTextColor: theme.titleColor || '#ffffff',
    labelTextColor: theme.labelTextColor || '#f0f0f0',

    // Shadow and glow effects
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    nodeShadowColor: 'rgba(0, 0, 0, 0.5)',

    // Diagram-specific enhancements
    flowchart: {
      edgeColor: theme.defaultLinkColor || theme.lineColor,
      nodeBorder: lighten(theme.border1 || '#999', 15),
      clusterBorder: lighten(theme.border2 || '#666', 20)
    },

    sequence: {
      actorBorder: theme.actorBorder || lighten(theme.border1 || '#999', 10),
      signalColor: theme.signalColor || theme.lineColor,
      messageTextColor: theme.signalTextColor || theme.textColor
    },

    gantt: {
      gridColor: theme.gridColor || '#666666',
      taskBorderColor: theme.taskBorderColor || lighten(theme.border1 || '#999', 10),
      todayLineColor: theme.todayLineColor || '#ff6666'
    },

    state: {
      transitionColor: theme.transitionColor || theme.lineColor,
      stateTextColor: theme.stateLabelColor || theme.textColor
    }
  };
}

/**
 * Apply filter effects for dark mode diagrams
 */
export function applyDarkModeFilters(container: HTMLElement): void {
  const isDarkMode = get(mode) === 'dark';

  if (!isDarkMode) {
    container.style.filter = '';
    return;
  }

  // Apply subtle filters for better visibility
  container.style.filter = `
    contrast(1.1) 
    brightness(1.05)
    saturate(0.95)
  `;

  // Add backdrop filter for text readability
  const mermaidElement = container.querySelector('.mermaid') as HTMLElement;
  if (mermaidElement) {
    mermaidElement.style.backdropFilter = 'blur(0.5px)';
  }
}

/**
 * Generate CSS with explicit dark mode states
 */
export function generateDarkModeCSS(theme: any): string {
  const enhancedColors = getEnhancedDarkModeColors(theme);

  return `
    /* Dark Mode Explicit States */
    .dark .mermaid,
    [data-theme="dark"] .mermaid {
      --edge-color: ${enhancedColors.edgeColor};
      --edge-glow-color: ${enhancedColors.edgeGlowColor};
      --node-border-color: ${enhancedColors.nodeBorderColor};
      --cluster-border-color: ${enhancedColors.clusterBorderColor};
      --primary-text-color: ${enhancedColors.primaryTextColor};
      --secondary-text-color: ${enhancedColors.secondaryTextColor};
      --title-text-color: ${enhancedColors.titleTextColor};
      --label-text-color: ${enhancedColors.labelTextColor};
      --text-shadow-color: ${enhancedColors.textShadowColor};
      --node-shadow-color: ${enhancedColors.nodeShadowColor};
    }
    
    /* Enhanced Edge Visibility */
    .dark .mermaid .edgePath .path,
    [data-theme="dark"] .mermaid .edgePath .path {
      stroke: var(--edge-color);
      stroke-width: 2.5px;
      filter: drop-shadow(0 0 2px var(--edge-glow-color));
    }
    
    /* Enhanced Node Borders */
    .dark .mermaid .node rect,
    .dark .mermaid .node circle,
    .dark .mermaid .node ellipse,
    .dark .mermaid .node polygon,
    [data-theme="dark"] .mermaid .node rect,
    [data-theme="dark"] .mermaid .node circle,
    [data-theme="dark"] .mermaid .node ellipse,
    [data-theme="dark"] .mermaid .node polygon {
      stroke: var(--node-border-color);
      stroke-width: 2px;
      filter: drop-shadow(0 2px 4px var(--node-shadow-color));
    }
    
    /* Enhanced Text Readability */
    .dark .mermaid .node text,
    .dark .mermaid .cluster text,
    .dark .mermaid .titleText,
    [data-theme="dark"] .mermaid .node text,
    [data-theme="dark"] .mermaid .cluster text,
    [data-theme="dark"] .mermaid .titleText {
      fill: var(--primary-text-color);
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 500;
    }
    
    .dark .mermaid .title,
    [data-theme="dark"] .mermaid .title {
      fill: var(--title-text-color);
      text-shadow: 0 2px 4px var(--text-shadow-color);
      font-weight: 700;
    }
    
    .dark .mermaid .edgeLabel text,
    [data-theme="dark"] .mermaid .edgeLabel text {
      fill: var(--label-text-color);
      text-shadow: 0 1px 2px var(--text-shadow-color);
      font-weight: 600;
    }
  `;
}

// Helper function to lighten color (simplified version)
function lighten(color: string, percent: number): string {
  // Simple implementation - in production, use the color utilities
  return color; // Placeholder
}
