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

/** Icon for an entity without its own, based on its domain. */
export function entityIcon(s: HassEntity): string {
  if (s.attributes.icon) return s.attributes.icon;
  const on = isOn(s);
  switch (s.entity_id.split('.')[0]) {
    case 'switch':
      return on ? 'mdi:power-plug' : 'mdi:power-plug-off';
    case 'input_boolean':
      return on ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off';
    default:
      return defaultIcon(on, false);
  }
}

export function defaultIcon(on: boolean, group: boolean): string {
  if (group) return on ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-outline';
  return on ? 'mdi:lightbulb' : 'mdi:lightbulb-outline';
}

/** True when the light's colour is pale enough that text on it should be dark. */
export function isLightColor(s?: HassEntity): boolean {
  if (!isOn(s)) return false;
  const rgb = s!.attributes.rgb_color;
  if (!Array.isArray(rgb) || rgb.length !== 3) return false;
  const [r, g, b] = (rgb as number[]).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}
