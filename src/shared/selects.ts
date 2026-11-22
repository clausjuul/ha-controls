import type { EntityRegistryDisplayEntry, HassEntity, HomeAssistant } from './types';

/**
 * Select entities that belong to lights: Govee scenes, DIY scenes, snapshots,
 * music modes and the like. The scene popup shows each as a tab.
 */

type Registry = Record<string, EntityRegistryDisplayEntry | undefined>;

/** Select entities by device, per registry object (it's replaced when it changes). */
const byDevice = new WeakMap<Registry, Map<string, string[]>>();

function selectsByDevice(reg: Registry): Map<string, string[]> {
  let map = byDevice.get(reg);
  if (map) return map;
  map = new Map();
  for (const e of Object.values(reg)) {
    // Settings like "power on behaviour" are config entities: leave them out.
    if (!e?.device_id || e.hidden || e.entity_category || !e.entity_id.startsWith('select.')) continue;
    const list = map.get(e.device_id) ?? [];
    list.push(e.entity_id);
    map.set(e.device_id, list);
  }
  byDevice.set(reg, map);
  return map;
}

/** The select entities on the same devices as `lights`. */
export function deviceSelects(hass: HomeAssistant, lights: string[]): string[] {
  const reg = hass.entities;
  if (!reg) return [];
  const map = selectsByDevice(reg);
  const found: string[] = [];
  for (const id of lights) {
    const device = reg[id]?.device_id;
    for (const s of (device && map.get(device)) || []) if (!found.includes(s)) found.push(s);
  }
  return found;
}

/** A select's choices, without the "None" that means nothing is chosen. */
export function selectOptions(s: HassEntity): string[] {
  const options = s.attributes.options;
  if (!Array.isArray(options)) return [];
  return options.filter(
    (o: unknown): o is string => typeof o === 'string' && !!o.trim() && o.toLowerCase() !== 'none',
  );
}

/**
 * The switch that turns a select's mode on and off, e.g. Govee's
 * `switch.x_music_mode` next to `select.x_music_mode`: the same object ID,
 * or the same name on the same device.
 */
export function selectSwitch(hass: HomeAssistant, select: string): string | undefined {
  const twin = `switch.${select.slice('select.'.length)}`;
  if (hass.states[twin]) return twin;
  const reg = hass.entities;
  const entry = reg?.[select];
  if (!reg || !entry?.device_id || !entry.name) return undefined;
  return Object.values(reg).find(
    (e) =>
      !!e &&
      e.entity_id.startsWith('switch.') &&
      e.device_id === entry.device_id &&
      e.name === entry.name,
  )?.entity_id;
}

/** A select's own name, without the device's: "washer Music mode" → "Music mode". */
export function selectName(hass: HomeAssistant, s: HassEntity): string {
  const own = hass.entities?.[s.entity_id]?.name;
  if (own) return own;
  const full = String(s.attributes.friendly_name ?? s.entity_id);
  const device = hass.entities?.[s.entity_id]?.device_id;
  const d = device ? hass.devices?.[device] : undefined;
  const prefix = d?.name_by_user || d?.name;
  return prefix && full.startsWith(`${prefix} `) ? full.slice(prefix.length + 1) : full;
}
