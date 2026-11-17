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

/**
 * Service data that brings a light back to how it looked: its brightness and
 * colour (or colour temperature), as far as they were remembered.
 */
export function restoreData(snapshot: Snapshot | undefined): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (!snapshot) return data;
  if (typeof snapshot.brightness === 'number') data.brightness = snapshot.brightness;
  const mode = snapshot.color_mode;
  if (mode === 'color_temp' && typeof snapshot.color_temp_kelvin === 'number') {
    data.color_temp_kelvin = snapshot.color_temp_kelvin;
  } else if (mode !== 'color_temp' && mode !== 'brightness' && mode !== 'onoff') {
    if (Array.isArray(snapshot.hs_color)) data.hs_color = snapshot.hs_color;
    else if (Array.isArray(snapshot.rgb_color)) data.rgb_color = snapshot.rgb_color;
  }
  return data;
}

// Which lights of a set (a group or a row) were on the last time any was.

const SETS_KEY = 'ha-controls:last-on-sets';
let sets: Record<string, string[]> | undefined;

function loadSets(): Record<string, string[]> {
  if (sets) return sets;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETS_KEY) ?? '{}');
    sets = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    sets = {};
  }
  return sets!;
}

/** A set is known by its lights, so the same lights in two cards share it. */
export const setKey = (ids: string[]) => [...ids].sort().join(',');

/** Store which lights of the set are on. Call only while at least one is. */
export function rememberSet(key: string, onIds: string[]): void {
  const all = loadSets();
  const value = [...onIds].sort();
  if (JSON.stringify(all[key]) === JSON.stringify(value)) return;
  all[key] = value;
  try {
    window.localStorage.setItem(SETS_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked (private mode): keep it in memory only.
  }
}

/** Which lights of the set were on the last time any of them was. */
export function lastSet(key: string): string[] | undefined {
  return loadSets()[key];
}
