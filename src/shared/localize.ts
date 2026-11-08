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
  color: 'Color',
  custom_color: 'Custom color',
  white: 'White',
  scenes: 'Scenes',
  no_scenes: 'No scenes include these lights',
  close: 'Close',
  'editor.entities': 'Lights',
  'editor.name': 'Name (optional)',
  'editor.icon': 'Icon (optional)',
  'editor.show_color_temp': 'Show color temperature',
  'editor.show_color': 'Show color',
  'editor.show_scenes': 'Show scenes',
  'editor.expanded': 'Lights expanded by default',
  'editor.scenes': 'Scenes (empty = find automatically)',
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
  color: 'Farve',
  custom_color: 'Vælg selv farve',
  white: 'Hvid',
  scenes: 'Scener',
  no_scenes: 'Ingen scener indeholder disse lys',
  close: 'Luk',
  'editor.entities': 'Lys',
  'editor.name': 'Navn (valgfrit)',
  'editor.icon': 'Ikon (valgfrit)',
  'editor.show_color_temp': 'Vis farvetemperatur',
  'editor.show_color': 'Vis farve',
  'editor.show_scenes': 'Vis scener',
  'editor.expanded': 'Vis enkelte lys som standard',
  'editor.scenes': 'Scener (tom = find automatisk)',
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
