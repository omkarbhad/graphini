/**
 * Color utility functions inspired by mermaid's color system
 * Provides comprehensive color manipulation and theme generation
 */

export interface ColorAdjustment {
  h?: number; // hue shift (-360 to 360)
  s?: number; // saturation change (-100 to 100)
  l?: number; // lightness change (-100 to 100)
  r?: number; // red change (-255 to 255)
  g?: number; // green change (-255 to 255)
  b?: number; // blue change (-255 to 255)
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Adjust a color by specified amounts
 */
export function adjustColor(color: string, adjustment: ColorAdjustment): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  let { r, g, b } = rgb;

  // Apply RGB adjustments first
  if (adjustment.r !== undefined) r = Math.max(0, Math.min(255, r + adjustment.r));
  if (adjustment.g !== undefined) g = Math.max(0, Math.min(255, g + adjustment.g));
  if (adjustment.b !== undefined) b = Math.max(0, Math.min(255, b + adjustment.b));

  // Convert to HSL for hue/saturation/lightness adjustments
  const hsl = rgbToHsl(r, g, b);

  if (adjustment.h !== undefined) hsl.h = (hsl.h + adjustment.h + 360) % 360;
  if (adjustment.s !== undefined) hsl.s = Math.max(0, Math.min(100, hsl.s + adjustment.s));
  if (adjustment.l !== undefined) hsl.l = Math.max(0, Math.min(100, hsl.l + adjustment.l));

  // Convert back to RGB
  const finalRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
}

/**
 * Darken a color by percentage
 */
export function darken(color: string, percentage: number): string {
  return adjustColor(color, { l: -percentage });
}

/**
 * Lighten a color by percentage
 */
export function lighten(color: string, percentage: number): string {
  return adjustColor(color, { l: percentage });
}

/**
 * Invert a color
 */
export function invert(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/**
 * Check if a color is considered dark
 */
export function isDark(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;

  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

/**
 * Generate a border color from a background color
 */
export function mkBorder(color: string, darkMode = false): string {
  if (darkMode) {
    return lighten(color, 20);
  } else {
    return darken(color, 20);
  }
}

/**
 * Create rgba color from hex
 */
export function rgba(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Generate complementary color (180 degrees hue shift)
 */
export function complementary(color: string): string {
  return adjustColor(color, { h: 180 });
}

/**
 * Generate triadic colors (120 and 240 degrees hue shift)
 */
export function triadic(color: string): [string, string] {
  return [adjustColor(color, { h: 120 }), adjustColor(color, { h: 240 })];
}

/**
 * Generate analogous colors (30 and -30 degrees hue shift)
 */
export function analogous(color: string): [string, string] {
  return [adjustColor(color, { h: 30 }), adjustColor(color, { h: -30 })];
}

/**
 * Generate split complementary colors (150 and 210 degrees hue shift)
 */
export function splitComplementary(color: string): [string, string] {
  return [adjustColor(color, { h: 150 }), adjustColor(color, { h: 210 })];
}

/**
 * Generate a color palette from a base color
 */
export function generatePalette(baseColor: string, size: number = 12): string[] {
  const colors: string[] = [baseColor];

  for (let i = 1; i < size; i++) {
    const hueShift = (360 / size) * i;
    colors.push(adjustColor(baseColor, { h: hueShift }));
  }

  return colors;
}

/**
 * Generate surface colors (variations of main background)
 */
export function generateSurfaceColors(mainBkg: string, darkMode = false): string[] {
  const surfaces: string[] = [];
  const multiplier = darkMode ? -4 : -1;

  for (let i = 0; i < 5; i++) {
    const adjustment = { h: 180, s: -15, l: multiplier * (5 + i * 3) };
    surfaces.push(adjustColor(mainBkg, adjustment));
  }

  return surfaces;
}

/**
 * Generate fill type colors for journey diagrams
 */
export function generateFillTypes(primaryColor: string, secondaryColor: string): string[] {
  return [
    primaryColor,
    secondaryColor,
    adjustColor(primaryColor, { h: 64 }),
    adjustColor(secondaryColor, { h: 64 }),
    adjustColor(primaryColor, { h: -64 }),
    adjustColor(secondaryColor, { h: -64 }),
    adjustColor(primaryColor, { h: 128 }),
    adjustColor(secondaryColor, { h: 128 })
  ];
}

/**
 * Generate git graph colors
 */
export function generateGitColors(
  primaryColor: string,
  secondaryColor: string,
  tertiaryColor: string,
  darkMode = false
): string[] {
  const colors = [
    primaryColor,
    secondaryColor,
    tertiaryColor,
    adjustColor(primaryColor, { h: -30 }),
    adjustColor(primaryColor, { h: -60 }),
    adjustColor(primaryColor, { h: -90 }),
    adjustColor(primaryColor, { h: 60 }),
    adjustColor(primaryColor, { h: 120 })
  ];

  return darkMode ? colors.map((c) => lighten(c, 25)) : colors.map((c) => darken(c, 25));
}

/**
 * Generate pie chart colors
 */
export function generatePieColors(
  primaryColor: string,
  secondaryColor: string,
  tertiaryColor: string
): string[] {
  return [
    primaryColor,
    secondaryColor,
    adjustColor(tertiaryColor, { l: -40 }),
    adjustColor(primaryColor, { l: -10 }),
    adjustColor(secondaryColor, { l: -30 }),
    adjustColor(tertiaryColor, { l: -20 }),
    adjustColor(primaryColor, { h: 60, l: -20 }),
    adjustColor(primaryColor, { h: -60, l: -40 }),
    adjustColor(primaryColor, { h: 120, l: -40 }),
    adjustColor(primaryColor, { h: 60, l: -40 }),
    adjustColor(primaryColor, { h: -90, l: -40 }),
    adjustColor(primaryColor, { h: 120, l: -30 })
  ];
}

/**
 * Generate quadrant colors
 */
export function generateQuadrantColors(
  primaryColor: string,
  primaryTextColor: string
): {
  fills: string[];
  textFills: string[];
  pointFill: string;
} {
  const fills = [
    primaryColor,
    adjustColor(primaryColor, { r: 5, g: 5, b: 5 }),
    adjustColor(primaryColor, { r: 10, g: 10, b: 10 }),
    adjustColor(primaryColor, { r: 15, g: 15, b: 15 })
  ];

  const textFills = [
    primaryTextColor,
    adjustColor(primaryTextColor, { r: -5, g: -5, b: -5 }),
    adjustColor(primaryTextColor, { r: -10, g: -10, b: -10 }),
    adjustColor(primaryTextColor, { r: -15, g: -15, b: -15 })
  ];

  const pointFill = isDark(fills[0]) ? lighten(fills[0], 10) : darken(fills[0], 10);

  return { fills, textFills, pointFill };
}
