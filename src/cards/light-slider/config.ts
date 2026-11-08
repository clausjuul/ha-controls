export interface LightEntityConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Scenes for this light. Omit to find scenes containing the light automatically. */
  scenes?: string[];
}

export interface LightSliderCardConfig {
  type: string;
  /** Shorthand for a single light. */
  entity?: string;
  entities?: Array<string | LightEntityConfig>;
  name?: string;
  icon?: string;
  /** Scenes for the card's main row. Omit to find them automatically. */
  scenes?: string[];
  show_color_temp?: boolean;
  show_color?: boolean;
  show_scenes?: boolean;
  expanded?: boolean;
}

export interface NormalizedConfig {
  name?: string;
  icon?: string;
  scenes?: string[];
  entities: LightEntityConfig[];
  show_color_temp: boolean;
  show_color: boolean;
  show_scenes: boolean;
  expanded: boolean;
}

export const DEFAULTS = {
  show_color_temp: true,
  show_color: true,
  show_scenes: true,
  expanded: false,
} as const;

/** All entity entries from a raw config, as written by the user. */
export function rawEntities(config: LightSliderCardConfig): Array<string | LightEntityConfig> {
  return [...(config.entity ? [config.entity] : []), ...(config.entities ?? [])];
}

export const entityId = (e: string | LightEntityConfig) =>
  typeof e === 'string' ? e : e?.entity;

function sceneList(value: unknown, where: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string' || !s.startsWith('scene.'))) {
    throw new Error(`"scenes" in ${where} must be a list of scene entities`);
  }
  return value as string[];
}

export function normalizeConfig(config: LightSliderCardConfig): NormalizedConfig {
  if (!config || typeof config !== 'object') throw new Error('Invalid configuration');

  const seen = new Set<string>();
  const entities: LightEntityConfig[] = [];
  for (const e of rawEntities(config)) {
    const id = entityId(e);
    if (typeof id !== 'string' || !id.startsWith('light.')) {
      throw new Error(`"${id ?? JSON.stringify(e)}" is not a light entity`);
    }
    if (seen.has(id)) continue;
    seen.add(id);
    if (typeof e === 'string') {
      entities.push({ entity: e });
    } else {
      entities.push({ ...e, scenes: sceneList(e.scenes, id) });
    }
  }
  if (!entities.length) throw new Error('Add at least one light under "entities"');

  return {
    name: config.name || undefined,
    icon: config.icon || undefined,
    scenes: sceneList(config.scenes, 'the card')?.length ? config.scenes : undefined,
    entities,
    show_color_temp: config.show_color_temp ?? DEFAULTS.show_color_temp,
    show_color: config.show_color ?? DEFAULTS.show_color,
    show_scenes: config.show_scenes ?? DEFAULTS.show_scenes,
    expanded: config.expanded ?? DEFAULTS.expanded,
  };
}
