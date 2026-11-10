export interface LightEntityConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Scenes for this light. Omit to find scenes containing the light automatically. */
  scenes?: string[];
}

/** One slider in a room: a single light or several lights under one slider. */
/** Entity domains that can be added. Non-light ones are shown as on/off. */
export const DOMAINS = ['light', 'switch', 'input_boolean'];
const isAllowed = (id: unknown): id is string =>
  typeof id === 'string' && DOMAINS.includes(id.split('.')[0]);

export interface RoomItemConfig {
  name?: string;
  /** Lights to show as plain on/off instead of a slider. */
  toggle_only?: string[];
  icon?: string;
  /** Light that the top slider controls; `entities` are shown when expanded. */
  main_entity?: string;
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
  /** Single mode: light that the top slider controls; `entities` are shown when expanded. */
  main_entity?: string;
  /** Single mode: the lights. */
  entities?: Array<string | LightEntityConfig>;
  /** Single mode: lights to show as plain on/off instead of a slider. */
  toggle_only?: string[];
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
  /** One line per light: icon, name and a thin bar. */
  compact?: boolean;
}

/** A slider with its lights, ready to render. */
export interface Group {
  key: string;
  name?: string;
  icon?: string;
  scenes?: string[];
  /** Light the top slider controls. Without it the slider controls all `entities`. */
  main?: string;
  entities: LightEntityConfig[];
  expanded: boolean;
}

export interface NormalizedConfig {
  mode: CardMode;
  name?: string;
  /** Room mode: icon in the room heading. */
  icon?: string;
  compact: boolean;
  groups: Group[];
  /** Every light on the card. */
  entityIds: string[];
  /** Lights shown as plain on/off (no slider, no colours). */
  toggleOnly: Set<string>;
  show_color_temp: boolean;
  show_color: boolean;
  show_scenes: boolean;
}

export const DEFAULTS = {
  show_color_temp: true,
  show_color: true,
  show_scenes: true,
  expanded: false,
  compact: false,
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

function mainEntity(value: unknown, where: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!isAllowed(value)) {
    throw new Error(`"main_entity" in ${where} must be a light, switch or input_boolean`);
  }
  return value;
}

/** Group from a config with entities and an optional main_entity. */
function makeGroup(
  key: string,
  src: { main_entity?: string; entity?: string; entities?: EntityList },
  where: string,
  rest: Omit<Group, 'key' | 'main' | 'entities'>,
): Group {
  const main = mainEntity(src.main_entity, where);
  const list = rawEntities(src);
  // With a main light, the other lights are optional children.
  const entities = main
    ? list.length
      ? normalizeEntities(list, where).filter((e) => e.entity !== main)
      : []
    : normalizeEntities(list, where);
  return { key, main, entities, ...rest };
}

function normalizeEntities(list: EntityList, where: string): LightEntityConfig[] {
  const seen = new Set<string>();
  const out: LightEntityConfig[] = [];
  for (const e of list) {
    const id = entityId(e);
    if (!isAllowed(id)) {
      throw new Error(
        `"${id ?? JSON.stringify(e)}" in ${where} is not a light, switch or input_boolean`,
      );
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
      makeGroup('main', config, 'the card', {
        name: config.name || undefined,
        icon: config.icon || undefined,
        scenes: sceneList(config.scenes, 'the card'),
        expanded,
      }),
    ];
  } else {
    if (!Array.isArray(config.items) || !config.items.length) {
      throw new Error('Add at least one item under "items"');
    }
    groups = config.items.map((item, i) => {
      const where = item?.name ? `"${item.name}"` : `item ${i + 1}`;
      if (!item || typeof item !== 'object') throw new Error(`Invalid ${where}`);
      return makeGroup(`item-${i}`, item, where, {
        name: item.name || undefined,
        icon: item.icon || undefined,
        scenes: sceneList(item.scenes, where),
        expanded: item.expanded ?? expanded,
      });
    });
  }

  const toggleOnly = new Set<string>();
  for (const src of mode === 'room' ? (config.items ?? []) : [config]) {
    const list = src.toggle_only;
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list) || list.some((id) => typeof id !== 'string')) {
      throw new Error('"toggle_only" must be a list of entities');
    }
    list.forEach((id) => toggleOnly.add(id));
  }

  return {
    mode,
    name: config.name || undefined,
    icon: mode === 'room' ? config.icon || undefined : undefined,
    compact: config.compact ?? DEFAULTS.compact,
    groups,
    toggleOnly,
    entityIds: [
      ...new Set(groups.flatMap((g) => [...(g.main ? [g.main] : []), ...g.entities.map((e) => e.entity)])),
    ],
    show_color_temp: config.show_color_temp ?? DEFAULTS.show_color_temp,
    show_color: config.show_color ?? DEFAULTS.show_color,
    show_scenes: config.show_scenes ?? DEFAULTS.show_scenes,
  };
}
