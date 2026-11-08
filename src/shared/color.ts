export type RGB = [number, number, number];

const clamp255 = (v: number) => Math.round(Math.min(255, Math.max(0, v)));

/** Approximate RGB for a colour temperature (Tanner Helland's algorithm). */
export function kelvinToRgb(kelvin: number): RGB {
  const t = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  return [clamp255(r), clamp255(g), clamp255(b)];
}

export const rgbCss = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

/** CSS gradient from warm (min K) to cool (max K). */
export function kelvinGradient(min: number, max: number, steps = 6): string {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = min + ((max - min) * i) / steps;
    stops.push(`${rgbCss(kelvinToRgb(k))} ${Math.round((i / steps) * 100)}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export const HUE_GRADIENT =
  'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';

export const saturationGradient = (hue: number) =>
  `linear-gradient(to right, #ffffff, hsl(${hue}, 100%, 50%))`;

/** How a light at this hue/saturation looks: full colour at 100 %, white at 0 %. */
export const hsCss = (hue: number, saturation: number) =>
  `hsl(${hue}, 100%, ${100 - saturation / 2}%)`;

/** Preset colours shown as buttons in the colour popup. */
export const SWATCH_HUES = [0, 25, 45, 60, 120, 175, 210, 240, 275, 320];

/** Shortest distance between two hues in degrees. */
export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
