import type { XYColor } from './device';

/**
 * Convert CIE 1931 xy chromaticity + brightness to sRGB.
 * Based on the Philips Hue color conversion algorithm.
 */
export function xyBriToRgb(
  x: number,
  y: number,
  brightness: number,
): [number, number, number] {
  const z = 1.0 - x - y;
  const Y = brightness / 100;
  const X = (Y / y) * x;
  const Z = (Y / y) * z;

  // Wide RGB D65 conversion
  let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  let b = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

  // Clamp negatives
  if (r < 0) r = 0;
  if (g < 0) g = 0;
  if (b < 0) b = 0;

  // Apply reverse sRGB companding
  r =
    r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, 1.0 / 2.4) - 0.055;
  g =
    g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, 1.0 / 2.4) - 0.055;
  b =
    b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, 1.0 / 2.4) - 0.055;

  // Scale to 0-255
  const maxVal = Math.max(r, g, b, 1);
  return [
    Math.round((r / maxVal) * 255),
    Math.round((g / maxVal) * 255),
    Math.round((b / maxVal) * 255),
  ];
}

/**
 * Convert sRGB to CIE 1931 xy chromaticity.
 */
export function rgbToXy(r: number, g: number, b: number): XYColor {
  // Normalize to 0-1
  let red = r / 255;
  let green = g / 255;
  let blue = b / 255;

  // Apply sRGB companding
  red =
    red > 0.04045
      ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4)
      : red / 12.92;
  green =
    green > 0.04045
      ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4)
      : green / 12.92;
  blue =
    blue > 0.04045
      ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4)
      : blue / 12.92;

  // Wide RGB D65 conversion
  const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z = red * 0.000088 + green * 0.07231 + blue * 0.986039;

  const sum = X + Y + Z;
  if (sum === 0) {
    return { x: 0.3127, y: 0.3290 }; // D65 white point
  }

  return {
    x: parseFloat((X / sum).toFixed(4)),
    y: parseFloat((Y / sum).toFixed(4)),
  };
}

/**
 * Convert color temperature in mirek to Kelvin.
 */
export function mirekToKelvin(mirek: number): number {
  return Math.round(1_000_000 / mirek);
}

/**
 * Convert color temperature in Kelvin to mirek.
 */
export function kelvinToMirek(kelvin: number): number {
  return Math.round(1_000_000 / kelvin);
}

/**
 * Convert HSL to RGB.
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}
