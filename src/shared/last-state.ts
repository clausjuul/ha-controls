import type { HassEntity } from './types';

/**
 * Remembers in the browser how each light looked the last time it was on, so
 * turning it on can show the right brightness and colour straight away.
 */

const KEY = 'ha-controls:last-on';
const KEEP = ['brightness', 'color_mode', 'color_temp_kelvin', 'hs_color', 'rgb_color'];

type Snapshot = Record<string, unknown>;
let cache: Record<string, Snapshot> | undefined;

function load(): Record<string, Snapshot> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cache = {};
  }
  return cache!;
}

/** Store the attributes of a light that is on. */
export function rememberOn(s: HassEntity | undefined): void {
  if (!s || s.state !== 'on') return;
  const snapshot: Snapshot = {};
  for (const key of KEEP) {
    const value = s.attributes[key];
    if (value !== null && value !== undefined) snapshot[key] = value;
  }
  const all = load();
  if (JSON.stringify(all[s.entity_id]) === JSON.stringify(snapshot)) return;
  all[s.entity_id] = snapshot;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked (private mode): keep it in memory only.
  }
}

/** How the light looked the last time it was on, if known. */
export function lastOn(entityId: string): Snapshot | undefined {
  return load()[entityId];
}
