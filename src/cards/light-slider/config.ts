export interface LightEntityConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Scenes for this light. Omit to find scenes containing the light automatically. */
  scenes?: string[];
}

/** One slider in a room: a single light or several lights under one slider. */
export interface RoomItemConfig {
  name?: string;
  icon?: string;
  /** Shorthand for a single light. */
  entity?: string;
  entities?: Array<string | LightEntityConfig>;
  scenes?: string[];
  expanded?: boolean;
}

export type CardMode = 'single' | 'room';

export interface LightSliderCardConfig {
  type: string;
  /** `single` (default): all lights under one slider. `room`: several items. */
  mode?: CardMode;
  /** Single mode: shorthand for a single light. */
  entity?: string;
  /** Single mode: the lights. */
  entities?: Array<string | LightEntityConfig>;
  /** Room mode: the items, each with its own slider. */
  items?: RoomItemConfig[];
  name?: string;
  icon?: string;
  /** Single mode: scenes for the main row. Omit to find them automatically. */
  scenes?: string[];
  show_color_temp?: boolean;
  show_color?: boolean;
  show_scenes?: boolean;
  expanded?: boolean;
}

/** A slider with its lights, ready to render. */
export interface Group {
  key: string;
  name?: string;
  icon?: string;
  scenes?: string[];
  entities: LightEntityConfig[];
  expanded: boolean;
}

export interface NormalizedConfig {
  mode: CardMode;
  name?: string;
  groups: Group[];
  /** Every light on the card. */
  entityIds: string[];
  show_color_temp: boolean;
  show_color: boolean;
  show_scenes: boolean;
}

export const DEFAULTS = {
  show_color_temp: true,
  show_color: true,
  show_scenes: true,
  expanded: false,
} as const;

type EntityList = Array<string | LightEntityConfig>;

/** All entity entries of a single-mode config or room item, as written. */
export function rawEntities(config: { entity?: string; entities?: EntityList }): EntityList {
  return [...(config.entity ? [config.entity] : []), ...(config.entities ?? [])];
}

export const entityId = (e: string | LightEntityConfig) =>
  typeof e === 'string' ? e : e?.entity;

function sceneList(value: unknown, where: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string' || !s.startsWith('scene.'))) {
    throw new Error(`"scenes" in ${where} must be a list of scene entities`);
  }
  return value.length ? (value as string[]) : undefined;
}

function normalizeEntities(list: EntityList, where: string): LightEntityConfig[] {
  const seen = new Set<string>();
  const out: LightEntityConfig[] = [];
  for (const e of list) {
    const id = entityId(e);
    if (typeof id !== 'string' || !id.startsWith('light.')) {
      throw new Error(`"${id ?? JSON.stringify(e)}" in ${where} is not a light entity`);
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(typeof e === 'string' ? { entity: e } : { ...e, scenes: sceneList(e.scenes, id) });
  }
  if (!out.length) throw new Error(`Add at least one light to ${where}`);
  return out;
}

export function normalizeConfig(config: LightSliderCardConfig): NormalizedConfig {
  if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
  const mode: CardMode = config.mode ?? 'single';
  if (mode !== 'single' && mode !== 'room') throw new Error(`Unknown mode "${mode}"`);
  const expanded = config.expanded ?? DEFAULTS.expanded;

  let groups: Group[];
  if (mode === 'single') {
    groups = [
      {
        key: 'main',
        name: config.name || undefined,
        icon: config.icon || undefined,
        scenes: sceneList(config.scenes, 'the card'),
        entities: normalizeEntities(rawEntities(config), 'the card'),
        expanded,
      },
    ];
  } else {
    if (!Array.isArray(config.items) || !config.items.length) {
      throw new Error('Add at least one item under "items"');
    }
    groups = config.items.map((item, i) => {
      const where = item?.name ? `"${item.name}"` : `item ${i + 1}`;
      if (!item || typeof item !== 'object') throw new Error(`Invalid ${where}`);
      return {
        key: `item-${i}`,
        name: item.name || undefined,
        icon: item.icon || undefined,
        scenes: sceneList(item.scenes, where),
        entities: normalizeEntities(rawEntities(item), where),
        expanded: item.expanded ?? expanded,
      };
    });
  }

  return {
    mode,
    name: config.name || undefined,
    groups,
    entityIds: [...new Set(groups.flatMap((g) => g.entities.map((e) => e.entity)))],
    show_color_temp: config.show_color_temp ?? DEFAULTS.show_color_temp,
    show_color: config.show_color ?? DEFAULTS.show_color,
    show_scenes: config.show_scenes ?? DEFAULTS.show_scenes,
  };
}
