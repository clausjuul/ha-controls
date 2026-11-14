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
  lights_on_short: '{on}/{total} on',
  not_found: 'Entity not found: {entity}',
  toggle: 'Toggle',
  expand: 'Show more',
  color: 'Color',
  custom_color: 'Custom color',
  white: 'White',
  scenes: 'Scenes',
  no_scenes: 'No scenes include these lights',
  close: 'Close',
  room_on: 'Turn on all',
  room_off: 'Turn off all',
  'editor.mode': 'Type',
  'editor.mode_single': 'Single – lights under one slider',
  'editor.mode_room': 'Room – several sliders',
  'editor.room_name': 'Room name (optional)',
  'editor.items': 'Sliders in the room',
  'editor.item': 'Slider',
  'editor.add_item': 'Add slider',
  'editor.remove_item': 'Remove',
  'editor.move_up': 'Move up',
  'editor.move_down': 'Move down',
  'editor.main_entity': 'Main light for the slider (optional)',
  'editor.toggle_only': 'Show as on/off only (no slider)',
  'editor.entity': 'Light',
  'editor.show_icon': 'Show icon',
  'editor.add_entity': 'Add light',
  'editor.entities': 'Lights',
  'editor.name': 'Name (optional)',
  'editor.icon': 'Icon (optional)',
  'editor.show_color_temp': 'Show color temperature',
  'editor.show_color': 'Show color',
  'editor.show_scenes': 'Show scenes',
  'editor.expanded': 'Lights expanded by default',
  'editor.compact': 'Compact',
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
  lights_on_short: '{on}/{total} tændt',
  not_found: 'Enhed ikke fundet: {entity}',
  toggle: 'Tænd/sluk',
  expand: 'Vis mere',
  color: 'Farve',
  custom_color: 'Vælg selv farve',
  white: 'Hvid',
  scenes: 'Scener',
  no_scenes: 'Ingen scener indeholder disse lys',
  close: 'Luk',
  room_on: 'Tænd alt',
  room_off: 'Sluk alt',
  'editor.mode': 'Type',
  'editor.mode_single': 'Single – lys under én slider',
  'editor.mode_room': 'Rum – flere slidere',
  'editor.room_name': 'Rummets navn (valgfrit)',
  'editor.items': 'Slidere i rummet',
  'editor.item': 'Slider',
  'editor.add_item': 'Tilføj slider',
  'editor.remove_item': 'Fjern',
  'editor.move_up': 'Flyt op',
  'editor.move_down': 'Flyt ned',
  'editor.main_entity': 'Hovedlys for slideren (valgfrit)',
  'editor.toggle_only': 'Vis kun som tænd/sluk (ingen slider)',
  'editor.entity': 'Lys',
  'editor.show_icon': 'Vis ikon',
  'editor.add_entity': 'Tilføj lys',
  'editor.entities': 'Lys',
  'editor.name': 'Navn (valgfrit)',
  'editor.icon': 'Ikon (valgfrit)',
  'editor.show_color_temp': 'Vis farvetemperatur',
  'editor.show_color': 'Vis farve',
  'editor.show_scenes': 'Vis scener',
  'editor.expanded': 'Vis enkelte lys som standard',
  'editor.compact': 'Kompakt',
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
