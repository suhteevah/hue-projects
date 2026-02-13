import { xyBriToRgb, rgbToXy, mirekToKelvin, kelvinToMirek, hslToRgb } from '@smart-home/shared-types';

export { xyBriToRgb, rgbToXy, mirekToKelvin, kelvinToMirek, hslToRgb };

/**
 * Convert a device's CIE xy color + brightness to a CSS hex string.
 */
export function deviceColorToHex(
  xy: { x: number; y: number } | undefined,
  brightness = 100
): string {
  if (!xy) return '#ffffff';
  const [r, g, b] = xyBriToRgb(xy.x, xy.y, brightness / 100);
  return rgbToHex(r, g, b);
}

/**
 * Convert a mirek color temperature to a CSS color for visual indication.
 * Warm (500 mirek) → amber, Cool (153 mirek) → blue-white.
 */
export function mirekToCSS(mirek: number): string {
  // Normalize 153-500 to 0-1 (cool to warm)
  const t = Math.max(0, Math.min(1, (mirek - 153) / (500 - 153)));

  // Interpolate from cool blue-white to warm amber
  const r = Math.round(200 + 55 * t);
  const g = Math.round(220 - 70 * t);
  const b = Math.round(255 - 175 * t);
  return rgbToHex(r, g, b);
}

/**
 * Convert HSL (h: 0-360, s: 0-100, l: 0-100) to CIE xy for Hue API.
 */
export function hslToXy(h: number, s: number, l: number): { x: number; y: number } {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToXy(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}
