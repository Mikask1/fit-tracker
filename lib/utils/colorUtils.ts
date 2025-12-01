/**
 * Color utility functions for generating shades in drill-down charts
 */

/**
 * Convert hex color to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

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
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate an array of shades for a base color
 * Uses lightness variation to create distinct but related colors
 *
 * @param baseColor - Hex color string (e.g., '#ec4899')
 * @param count - Number of shades to generate
 * @returns Array of hex color strings
 */
export function generateColorShades(
  baseColor: string,
  count: number
): string[] {
  if (count <= 0) return [];
  if (count === 1) return [baseColor];

  const hsl = hexToHSL(baseColor);
  const shades: string[] = [];

  // Strategy: Vary lightness from darker to lighter
  // Keep saturation mostly constant for color consistency
  // Range: from 30% lightness to 75% lightness
  const minLightness = 30;
  const maxLightness = 75;
  const step = (maxLightness - minLightness) / (count - 1);

  for (let i = 0; i < count; i++) {
    const lightness = minLightness + step * i;
    // Slightly reduce saturation for lighter colors for better readability
    const saturation = hsl.s - i * 2;
    shades.push(hslToHex(hsl.h, Math.max(saturation, 40), lightness));
  }

  return shades;
}

/**
 * Get color for a specific drill-down level
 * Level 0 (main groups): Use MUSCLE_COLORS
 * Level 1 (categories): Use shades of parent main group color
 * Level 2 (specific): Use shades of parent main group color
 */
export function getDrillDownColor(
  itemName: string,
  mainGroup: string,
  drillPath: string[],
  allItemsAtLevel: string[],
  MUSCLE_COLORS: Record<string, string>
): string {
  const level = drillPath.length;

  if (level === 0) {
    // Level 0: Main groups use their defined colors
    return MUSCLE_COLORS[itemName] || '#6b7280';
  } else {
    // Level 1 and 2: Generate shades for categories and specific muscles
    const baseColor = MUSCLE_COLORS[mainGroup] || '#6b7280';
    const shades = generateColorShades(baseColor, allItemsAtLevel.length);
    const index = allItemsAtLevel.indexOf(itemName);
    return shades[index] || baseColor;
  }
}
