import { hsToRgb, kelvinToRgb, xyToRgb, type RGB } from './color';
import type { HassEntity, HomeAssistant } from './types';

/** Colours per scene entity: undefined = not fetched yet, [] = none known. */
const cache = new Map<string, RGB[]>();
const pending = new Set<string>();

const MAX_STOPS = 6;

function lightColor(conf: Record<string, unknown>): RGB | undefined {
  if (conf.state !== undefined && conf.state !== 'on') return undefined;
  const nums = (v: unknown, n: number) =>
    Array.isArray(v) && v.length >= n && v.slice(0, n).every((x) => typeof x === 'number') ? (v as number[]) : undefined;
  const mode = conf.color_mode;
  const rgb = nums(conf.rgb_color, 3);
  const hs = nums(conf.hs_color, 2);
  const xy = nums(conf.xy_color, 2);
  const kelvin =
    typeof conf.color_temp_kelvin === 'number'
      ? conf.color_temp_kelvin
      : typeof conf.color_temp === 'number' && conf.color_temp > 0
        ? 1e6 / conf.color_temp
        : undefined;
  if (mode === 'color_temp' && kelvin) return kelvinToRgb(kelvin);
  if (hs) return hsToRgb(hs[0], hs[1]);
  if (xy) return xyToRgb(xy[0], xy[1]);
  if (rgb) return rgb.map((v) => Math.round(v)) as RGB;
  if (kelvin) return kelvinToRgb(kelvin);
  return undefined;
}

const near = (a: RGB, b: RGB) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 40;

/** The scene's colours in the order of its lights, near-duplicates merged. */
function colorsOf(entities: Record<string, unknown> | undefined): RGB[] {
  const out: RGB[] = [];
  for (const conf of Object.values(entities ?? {})) {
    if (!conf || typeof conf !== 'object') continue;
    const c = lightColor(conf as Record<string, unknown>);
    if (c && !out.some((o) => near(o, c))) out.push(c);
  }
  if (out.length <= MAX_STOPS) return out;
  // Spread the stops over the whole list.
  return Array.from({ length: MAX_STOPS }, (_, i) => out[Math.round((i * (out.length - 1)) / (MAX_STOPS - 1))]);
}

/**
 * The colours a scene sets its lights to. Only scenes made in Home Assistant
 * (they have an `id`) can be read, and only by an admin; others get [].
 * Returns undefined while fetching and calls `done` when the colours arrive.
 */
export function sceneColors(hass: HomeAssistant, scene: HassEntity, done: () => void): RGB[] | undefined {
  const id = scene.entity_id;
  const known = cache.get(id);
  if (known) return known;
  const configId = scene.attributes.id;
  if (typeof configId !== 'string' || !hass.callApi) {
    cache.set(id, []);
    return [];
  }
  if (!pending.has(id)) {
    pending.add(id);
    hass
      .callApi<{ entities?: Record<string, unknown> }>('GET', `config/scene/config/${encodeURIComponent(configId)}`)
      .then((config) => cache.set(id, colorsOf(config?.entities)))
      .catch(() => cache.set(id, []))
      .finally(() => {
        pending.delete(id);
        done();
      });
  }
  return undefined;
}

const rgba = ([r, g, b]: RGB, alpha: number) => `rgb(${r} ${g} ${b} / ${alpha})`;

/** Inline style for a scene button tinted with `colors`, or undefined for none. */
export function sceneColorStyle(colors: RGB[], prefix: string): string | undefined {
  if (!colors.length) return undefined;
  const bg = (alpha: number) =>
    colors.length === 1
      ? rgba(colors[0], alpha)
      : `linear-gradient(90deg, ${colors.map((c) => rgba(c, alpha)).join(', ')})`;
  const [r, g, b] = colors[0];
  return [
    `${prefix}-color: rgb(${r} ${g} ${b})`,
    `${prefix}-bg: ${bg(0.2)}`,
    `${prefix}-bg-hover: ${bg(0.3)}`,
    `${prefix}-bg-active: ${bg(0.38)}`,
  ].join('; ');
}
