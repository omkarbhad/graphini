# Advanced Color System

A comprehensive color management system inspired by Mermaid's theme architecture, providing sophisticated theming capabilities for all diagram types.

## Overview

This color system goes far beyond simple color picking - it's a complete color ecosystem that provides:

- **12-color scale generation** with automatic hue variations
- **Peer colors** for borders and UI elements
- **Label colors** optimized for readability
- **Theme-aware adaptations** for light/dark modes
- **Diagram-specific color sets** for optimal visual hierarchy
- **Real-time reactive updates** with Svelte stores

## Architecture

### Core Components

```
src/lib/
├── utils/
│   └── color.ts              # Color manipulation utilities
├── themes/
│   ├── theme-base.ts         # Base theme class
│   ├── theme-default.ts      # Light theme implementation
│   ├── theme-dark.ts         # Dark theme implementation
│   └── index.ts              # Theme exports and utilities
├── stores/
│   └── diagram-theme.ts      # Reactive theme management
├── mermaid-theme.ts          # Mermaid.js integration
└── components/
    ├── ColorSidebar.svelte    # Theme UI component
    └── ThemeDemo.svelte       # System demonstration
```

## Features

### 🎨 Color Scale System

The system generates a 12-color scale from base colors:

```typescript
// Automatic color generation
const colors = generatePalette('#3b82f6', 12);
// Returns: ['#3b82f6', '#4f46e5', '#7c3aed', '#9333ea', ...]

// Peer colors for borders
const peerColors = colors.map((c) => mkBorder(c, darkMode));

// Label colors for text
const labelColors = colors.map((c) => getReadableTextColor(c));
```

### 🌓 Theme Support

- **Light Theme**: Optimized for bright environments
- **Dark Theme**: Adapted for dark interfaces
- **Auto-switching**: Responds to system preferences
- **Custom Themes**: User-defined color palettes

### 📊 Diagram Integration

Supports all Mermaid diagram types with optimized color sets:

- **Flowcharts**: Node, cluster, and edge colors
- **Sequence Diagrams**: Actor, message, and activation colors
- **Gantt Charts**: Task, milestone, and timeline colors
- **State Diagrams**: State, transition, and event colors
- **Class Diagrams**: Class, interface, and relationship colors
- **Pie Charts**: Slice, legend, and label colors
- **Git Graphs**: Branch, commit, and tag colors

## Usage

### Basic Theme Usage

```typescript
import { getCurrentTheme, themeActions } from '$lib/stores/diagram-theme';

// Get current theme
const currentTheme = getCurrentTheme();

// Apply a preset theme
themeActions.applyPreset('ocean');

// Set custom colors
themeActions.setCustomColors(['#3b82f6', '#ef4444', '#10b981']);

// Generate random colors
themeActions.generateRandomColors();
```

### Diagram-Specific Colors

```typescript
import { diagramColors } from '$lib/stores/diagram-theme';

// Get flowchart colors
const flowchartColors = diagramColors.getFlowchartColors();

// Get color scale for nodes
const nodeColors = diagramColors.getNodeColors(8);

// Get border colors
const borderColors = diagramColors.getBorderColors(8);
```

### Mermaid Integration

```typescript
import { themeToMermaidConfig, applyThemeToMermaid } from '$lib/mermaid-theme';
import mermaid from 'mermaid';

// Convert theme to Mermaid config
const config = themeToMermaidConfig(currentTheme);

// Apply to Mermaid instance
applyThemeToMermaid(mermaid, currentTheme);
```

### CSS Generation

```typescript
import { generateMermaidCSS, themeToCSSVariables } from '$lib/themes';

// Generate CSS variables
const cssVars = themeToCSSVariables(theme);

// Generate complete CSS
const css = generateMermaidCSS(theme);

// Apply to document
applyThemeToDocument(theme);
```

## Color Utilities

### Color Manipulation

```typescript
import {
  adjustColor,
  darken,
  lighten,
  invert,
  complementary,
  triadic,
  analogous
} from '$lib/utils/color';

// Adjust colors
const darker = darken('#3b82f6', 20);
const lighter = lighten('#3b82f6', 20);
const adjusted = adjustColor('#3b82f6', { h: 30, l: 10 });

// Generate color relationships
const complement = complementary('#3b82f6');
const [triad1, triad2] = triadic('#3b82f6');
const [analog1, analog2] = analogous('#3b82f6');
```

### Color Analysis

```typescript
import { isDark, hexToRgb, rgbToHsl } from '$lib/utils/color';

// Check color brightness
const isDarkColor = isDark('#3b82f6');

// Convert between formats
const rgb = hexToRgb('#3b82f6');
const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
```

## Preset Themes

### Available Presets

- **Ocean**: Blue-based cool tones
- **Sunset**: Warm oranges and reds
- **Forest**: Natural greens
- **Purple**: Royal purples and violets
- **Monochrome**: Classic grayscale

### Custom Presets

```typescript
import { THEME_PRESETS, getPresetTheme } from '$lib/themes';

// Use existing preset
const oceanTheme = getPresetTheme('ocean');

// Create custom preset
const customPreset = {
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  tertiaryColor: '#ec4899'
  // ... other properties
};
```

## Advanced Features

### Surface Colors

Generate UI-specific color variations:

```typescript
const surfaces = generateSurfaceColors(mainBkg, darkMode);
// Returns: [surface0, surface1, surface2, surface3, surface4]
```

### Diagram-Specific Palettes

```typescript
// Journey diagram fills
const journeyFills = generateFillTypes(primary, secondary);

// Git graph colors
const gitColors = generateGitColors(primary, secondary, tertiary, darkMode);

// Pie chart colors
const pieColors = generatePieColors(primary, secondary, tertiary);

// Quadrant colors
const quadrantColors = generateQuadrantColors(primary, text);
```

## Performance Optimization

### Reactive Updates

The system uses Svelte's reactivity for efficient updates:

```typescript
// Automatic theme updates when mode changes
const theme = derived([mode, selectedPreset], ([$mode, $preset]) => {
  return getThemeByMode($mode === 'dark' ? 'dark' : 'light', $preset);
});
```

### Cached Calculations

Color calculations are cached to prevent redundant computations:

```typescript
// Colors are calculated once and reused
const colorScale = useMemo(() => generateColorScale(theme), [theme]);
```

## Accessibility

### Contrast Ratios

The system ensures readable text colors:

```typescript
// Automatic text color selection
const textColor = isDark(background) ? '#ffffff' : '#000000';

// High contrast mode support
const highContrastColors = generateHighContrastPalette(baseColor);
```

### Color Blindness Support

Consider color vision deficiencies:

```typescript
// Alternative color schemes
const colorblindSafe = generateColorblindSafePalette();

// Pattern fills for accessibility
const patterns = generateAccessibilityPatterns(colors);
```

## Integration Examples

### React Integration

```typescript
// Theme provider component
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const unsubscribe = theme.subscribe(setTheme);
    return unsubscribe;
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Vue Integration

```typescript
// Vue composable
export function useTheme() {
  const theme = ref(getCurrentTheme());

  onMounted(() => {
    const unsubscribe = theme.subscribe((value) => {
      theme.value = value;
    });

    onUnmounted(unsubscribe);
  });

  return { theme, themeActions };
}
```

## Best Practices

### 1. Color Selection

- Use the 12-color scale for consistent visual hierarchy
- Reserve bright colors for important elements
- Ensure sufficient contrast for accessibility

### 2. Theme Switching

- Provide smooth transitions between themes
- Maintain visual consistency across modes
- Test in both light and dark environments

### 3. Performance

- Cache color calculations
- Use reactive updates efficiently
- Avoid unnecessary re-renders

### 4. Accessibility

- Test contrast ratios
- Provide alternative indicators
- Support high contrast modes

## Migration Guide

### From Simple Colors

```typescript
// Before
const primaryColor = '#3b82f6';
const secondaryColor = '#ef4444';

// After
const theme = getCurrentTheme();
const { primaryColor, secondaryColor } = theme;
```

### From CSS Variables

```typescript
// Before
const primary = getComputedStyle(document).getPropertyValue('--primary-color');

// After
import { currentTheme } from '$lib/stores/diagram-theme';
const primary = $currentTheme.primaryColor;
```

## Troubleshooting

### Common Issues

1. **Colors not updating**: Check store subscriptions
2. **Poor contrast**: Verify theme calculations
3. **Performance issues**: Review color caching
4. **Type errors**: Ensure proper theme typing

### Debug Tools

```typescript
// Debug theme values
console.log('Current theme:', $currentTheme);

// Debug color calculations
console.log('Color scale:', diagramColors.getNodeColors(12));

// Debug Mermaid config
console.log('Mermaid config:', themeToMermaidConfig($currentTheme));
```

## Contributing

### Adding New Themes

1. Create theme class extending `BaseTheme`
2. Implement `initializeBaseColors()`
3. Add theme-specific overrides
4. Export from themes index

### Adding Diagram Types

1. Update `ThemeColors` interface
2. Add color generation logic
3. Update Mermaid integration
4. Add demo examples

## License

This color system is inspired by Mermaid's theme architecture and follows similar principles for consistency and extensibility.
