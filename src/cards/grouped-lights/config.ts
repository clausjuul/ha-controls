import { DOMAINS, type Group, type LightEntityConfig, type NormalizedConfig } from '../light-slider/config';

/** One row: a single entity, several lights under one bar, or a main light. */
export interface SubgroupConfig {
  name?: string;
  icon?: string;
  /** Entity the bar controls (e.g. a light group). Without it the bar controls `entities`. */
  main_entity?: string;
  /** Shorthand for a single entity. */
  entity?: string;
  entities?: Array<string | LightEntityConfig>;
  /** Scenes for the row's scene button. Omit to find them automatically. */
  scenes?: string[];
}

/** A room or area: heading, a row of scenes and its rows. */
export interface GroupConfig {
  name?: string;
  icon?: string;
  /** Scenes shown as a scrollable row under the heading. */
  scenes?: string[];
  subgroups?: SubgroupConfig[];
}

export interface GroupedLightsCardConfig {
  type: string;
  /** Scenes for everything, shown as a scrollable row at the very top. */
  scenes?: string[];
  groups?: GroupConfig[];
  show_color_temp?: boolean;
  show_color?: boolean;
  show_scenes?: boolean;
  /** Colour bars with each light's own colour instead of the theme's. */
  light_color?: boolean;
}

export interface NormalizedSubgroup {
  key: string;
  name?: string;
  icon?: string;
  main?: string;
  entities: string[];
  scenes?: string[];
}

export interface NormalizedGroup {
  key: string;
  name?: string;
  icon?: string;
  scenes: string[];
  subgroups: NormalizedSubgroup[];
  /** Every entity in the group. */
  entityIds: string[];
}

const isAllowed = (id: unknown): id is string =>
  typeof id === 'string' && DOMAINS.includes(id.split('.')[0]);

const idOf = (e: string | LightEntityConfig) => (typeof e === 'string' ? e : e?.entity);

function sceneList(value: unknown, where: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string' || !s.startsWith('scene.'))) {
    throw new Error(`"scenes" in ${where} must be a list of scene entities`);
  }
  return value.length ? (value as string[]) : undefined;
}

export function normalizeGrouped(config: GroupedLightsCardConfig): {
  groups: NormalizedGroup[];
  /** Scenes shown above all groups. */
  scenes: string[];
  /** The same lights in the shape the light slider card's helpers use. */
  base: NormalizedConfig;
} {
  if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
  if (!Array.isArray(config.groups) || !config.groups.length) {
    throw new Error('Add at least one group under "groups"');
  }

  const baseGroups: Group[] = [];
  const groups = config.groups.map((g, gi): NormalizedGroup => {
    const gWhere = g?.name ? `"${g.name}"` : `group ${gi + 1}`;
    if (!g || typeof g !== 'object') throw new Error(`Invalid ${gWhere}`);
    const subgroups = (g.subgroups ?? []).map((sg, si): NormalizedSubgroup => {
      const where = sg?.name ? `"${sg.name}"` : `row ${si + 1} in ${gWhere}`;
      if (!sg || typeof sg !== 'object') throw new Error(`Invalid ${where}`);
      if (sg.main_entity !== undefined && sg.main_entity !== '' && !isAllowed(sg.main_entity)) {
        throw new Error(`"main_entity" in ${where} must be a light, switch or input_boolean`);
      }
      const list = [...(sg.entity ? [sg.entity] : []), ...(sg.entities ?? [])];
      const entities: string[] = [];
      for (const e of list) {
        const id = idOf(e);
        if (!isAllowed(id)) throw new Error(`"${id}" in ${where} is not a light, switch or input_boolean`);
        if (!entities.includes(id) && id !== sg.main_entity) entities.push(id);
      }
      const main = sg.main_entity || undefined;
      if (!main && !entities.length) throw new Error(`Add a light to ${where}`);
      const sub: NormalizedSubgroup = {
        key: `g${gi}-s${si}`,
        name: sg.name || undefined,
        icon: sg.icon || undefined,
        main,
        entities,
        scenes: sceneList(sg.scenes, where),
      };
      baseGroups.push({
        key: sub.key,
        name: sub.name,
        icon: sub.icon,
        showIcon: false,
        groupAction: 'more-info',
        scenes: sub.scenes,
        main,
        entities: entities.map((entity) => ({ entity })),
        expanded: false,
      });
      return sub;
    });
    return {
      key: `g${gi}`,
      name: g.name || undefined,
      icon: g.icon || undefined,
      scenes: sceneList(g.scenes, gWhere) ?? [],
      subgroups,
      entityIds: [...new Set(subgroups.flatMap((s) => [...(s.main ? [s.main] : []), ...s.entities]))],
    };
  });

  const entityIds = [...new Set(groups.flatMap((g) => g.entityIds))];
  return {
    groups,
    scenes: sceneList(config.scenes, 'the card') ?? [],
    base: {
      mode: 'room',
      compact: false,
      lightColor: config.light_color ?? false,
      groups: baseGroups,
      entityIds,
      toggleOnly: new Set(),
      show_color_temp: config.show_color_temp ?? true,
      show_color: config.show_color ?? true,
      show_scenes: config.show_scenes ?? true,
    },
  };
}
