export interface LightEntityConfig {
  entity: string;
  name?: string;
  icon?: string;
}

export interface LightSliderCardConfig {
  type: string;
  /** Shorthand for a single light. */
  entity?: string;
  entities?: Array<string | LightEntityConfig>;
  name?: string;
  icon?: string;
  show_color_temp?: boolean;
  show_color?: boolean;
  expanded?: boolean;
}

export interface NormalizedConfig {
  name?: string;
  icon?: string;
  entities: LightEntityConfig[];
  show_color_temp: boolean;
  show_color: boolean;
  expanded: boolean;
}

export const DEFAULTS = {
  show_color_temp: true,
  show_color: true,
  expanded: false,
} as const;

/** All entity entries from a raw config, as written by the user. */
export function rawEntities(config: LightSliderCardConfig): Array<string | LightEntityConfig> {
  return [...(config.entity ? [config.entity] : []), ...(config.entities ?? [])];
}

export const entityId = (e: string | LightEntityConfig) =>
  typeof e === 'string' ? e : e?.entity;

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
    entities.push(typeof e === 'string' ? { entity: e } : { ...e });
  }
  if (!entities.length) throw new Error('Add at least one light under "entities"');

  return {
    name: config.name || undefined,
    icon: config.icon || undefined,
    entities,
    show_color_temp: config.show_color_temp ?? DEFAULTS.show_color_temp,
    show_color: config.show_color ?? DEFAULTS.show_color,
    expanded: config.expanded ?? DEFAULTS.expanded,
  };
}
