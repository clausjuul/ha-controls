import type { HassEntity } from './types';
import { rgbCss } from './color';

const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];

const modes = (s: HassEntity): string[] => s.attributes.supported_color_modes ?? [];

export const isUnavailable = (s?: HassEntity) => !s || s.state === 'unavailable';
export const isOn = (s?: HassEntity) => !!s && s.state === 'on';

export const supportsBrightness = (s: HassEntity) =>
  modes(s).some((m) => m !== 'onoff');
export const supportsColorTemp = (s: HassEntity) => modes(s).includes('color_temp');
export const supportsColor = (s: HassEntity) =>
  modes(s).some((m) => COLOR_MODES.includes(m));

/** Brightness as 0–100 %. Off = 0. On without brightness = 100. */
export function brightnessPct(s: HassEntity): number {
  if (!isOn(s)) return 0;
  const b = s.attributes.brightness;
  if (typeof b !== 'number') return 100;
  return Math.max(1, Math.round((b / 255) * 100));
}

/** The light's current colour as CSS, if it is on and reports one. */
export function lightColor(s?: HassEntity): string | undefined {
  if (!isOn(s)) return undefined;
  const rgb = s!.attributes.rgb_color;
  return Array.isArray(rgb) && rgb.length === 3 ? rgbCss(rgb as [number, number, number]) : undefined;
}

export function defaultIcon(on: boolean, group: boolean): string {
  if (group) return on ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-outline';
  return on ? 'mdi:lightbulb' : 'mdi:lightbulb-outline';
}
