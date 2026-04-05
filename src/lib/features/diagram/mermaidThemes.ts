import type { MermaidConfig } from 'mermaid';

// Enhanced theme configuration with proper color palette support
export const getVercelTheme = (isDark: boolean): MermaidConfig => {
  const baseTheme = isDark ? 'dark' : 'default';

  return {
    theme: baseTheme,
    // Enhanced flowchart configuration for better color support
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      // Custom styling for better color rendering
      defaultRenderer: 'dagre-wrapper',
      // Ensure proper color inheritance
      useMaxWidth: true,
      // Make nodes smaller and closer together
      padding: 10,
      nodeSpacing: 50,
      rankSpacing: 50
    },
    // Security and color attributes
    securityLevel: 'loose',
    // Theme-specific color overrides
    themeVariables: {
      // Dark theme colors
      dark: {
        primaryColor: '#bb86fc',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#bb86fc',
        lineColor: '#f0f0f0',
        secondaryColor: '#3700b3',
        tertiaryColor: '#6200ee',
        background: '#121212',
        mainBkg: '#1e1e1e',
        secondBkg: '#2d2d2d',
        tertiaryBkg: '#3d3d3d',
        edgeLabelBackground: '#2d2d2d',
        textColor: '#f0f0f0',
        primary: '#bb86fc',
        primaryBorder: '#bb86fc',
        secondary: '#3700b3',
        tertiary: '#6200ee',
        line: '#f0f0f0',
        text: '#f0f0f0',
        clusterBkg: '#1e293b',
        defaultLinkColor: '#bb86fc',
        titleColor: '#f0f0f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        labelBackground: '#1e1e1e',
        nodeBkg: '#1e1e1e',
        nodeBorder: '#bb86fc',
        clusterBorder: '#475569',
        defaultTextColor: '#f0f0f0'
      },
      // Light theme colors
      default: {
        primaryColor: '#6200ee',
        primaryTextColor: '#000000',
        primaryBorderColor: '#6200ee',
        lineColor: '#333333',
        secondaryColor: '#bb86fc',
        tertiaryColor: '#3700b3',
        background: '#ffffff',
        mainBkg: '#f3f3f3',
        secondBkg: '#e0e0e0',
        tertiaryBkg: '#d0d0d0',
        edgeLabelBackground: '#f3f3f3',
        textColor: '#333333',
        primary: '#6200ee',
        primaryBorder: '#6200ee',
        secondary: '#bb86fc',
        tertiary: '#3700b3',
        line: '#333333',
        text: '#333333',
        clusterBkg: '#f1f5f9',
        defaultLinkColor: '#6200ee',
        titleColor: '#333333',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        labelBackground: '#f3f3f3',
        nodeBkg: '#f3f3f3',
        nodeBorder: '#6200ee',
        clusterBorder: '#94a3b8',
        defaultTextColor: '#333333'
      }
    }
  };
};

// Helper function to get current theme colors
export const getThemeColors = (isDark: boolean) => {
  const theme = getVercelTheme(isDark);
  const themeVariables = theme.themeVariables;
  const currentTheme = isDark ? themeVariables?.dark : themeVariables?.default;

  return {
    fill: currentTheme?.primaryColor || (isDark ? '#bb86fc' : '#6200ee'),
    stroke: currentTheme?.primaryBorderColor || (isDark ? '#bb86fc' : '#6200ee'),
    text: currentTheme?.primaryTextColor || (isDark ? '#ffffff' : '#000000'),
    background: currentTheme?.background || (isDark ? '#121212' : '#ffffff'),
    nodeBackground: currentTheme?.nodeBkg || (isDark ? '#1e1e1e' : '#f3f3f3'),
    line: currentTheme?.lineColor || (isDark ? '#f0f0f0' : '#333333')
  };
};
