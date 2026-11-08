import type { HomeAssistant } from './types';

const en = {
  on: 'On',
  off: 'Off',
  unavailable: 'Unavailable',
  brightness: 'Brightness',
  color_temp: 'Color temperature',
  hue: 'Color',
  saturation: 'Saturation',
  lights: 'Lights',
  lights_on: '{on} of {total} on',
  not_found: 'Entity not found: {entity}',
  toggle: 'Toggle',
  expand: 'Show more',
  'editor.entities': 'Lights',
  'editor.name': 'Name (optional)',
  'editor.icon': 'Icon (optional)',
  'editor.show_color_temp': 'Show color temperature',
  'editor.show_color': 'Show color',
  'editor.expanded': 'Expanded by default',
};

type Key = keyof typeof en;

const da: Record<Key, string> = {
  on: 'Tændt',
  off: 'Slukket',
  unavailable: 'Utilgængelig',
  brightness: 'Lysstyrke',
  color_temp: 'Farvetemperatur',
  hue: 'Farve',
  saturation: 'Mætning',
  lights: 'Lys',
  lights_on: '{on} af {total} tændt',
  not_found: 'Enhed ikke fundet: {entity}',
  toggle: 'Tænd/sluk',
  expand: 'Vis mere',
  'editor.entities': 'Lys',
  'editor.name': 'Navn (valgfrit)',
  'editor.icon': 'Ikon (valgfrit)',
  'editor.show_color_temp': 'Vis farvetemperatur',
  'editor.show_color': 'Vis farve',
  'editor.expanded': 'Udfoldet som standard',
};

const languages: Record<string, Record<Key, string>> = { en, da };

export type Localize = (key: Key, vars?: Record<string, string | number>) => string;

export function localize(hass?: HomeAssistant): Localize {
  const lang = (hass?.locale?.language ?? hass?.language ?? 'en').split('-')[0];
  const table = languages[lang] ?? en;
  return (key, vars) => {
    let s = table[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

export const isEditorKey = (key: string): key is Key => key in en;
