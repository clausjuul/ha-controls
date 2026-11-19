import { DOMAINS, type Group, type LightEntityConfig, type NormalizedConfig } from '../light-slider/config';
import { sceneChips, type SceneChip, type SceneEntry } from '../../shared/scenes';

export type { SceneChip, SceneChipConfig, SceneEntry } from '../../shared/scenes';

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
  scenes?: SceneEntry[];
}

/** A room or area: heading, a row of scenes and its rows. */
export interface GroupConfig {
  name?: string;
  icon?: string;
  /** Scenes shown as a scrollable row under the heading. */
  scenes?: SceneEntry[];
  subgroups?: SubgroupConfig[];
  /** Tap the heading to fold the group in and out. */
  collapsible?: boolean;
  /** Fold the group in while all its lights are off (implies `collapsible`). */
  collapse_off?: boolean;
}

export interface GroupedLightsCardConfig {
  type: string;
  /** Scenes for everything, shown as a scrollable row at the very top. */
  scenes?: SceneEntry[];
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
  /** Undefined = find automatically. */
  scenes?: SceneChip[];
}

export interface NormalizedGroup {
  key: string;
  name?: string;
  icon?: string;
  scenes: SceneChip[];
  subgroups: NormalizedSubgroup[];
  collapsible: boolean;
  collapseOff: boolean;
  /** Every entity in the group. */
  entityIds: string[];
}

const isAllowed = (id: unknown): id is string =>
  typeof id === 'string' && DOMAINS.includes(id.split('.')[0]);

const idOf = (e: string | LightEntityConfig) => (typeof e === 'string' ? e : e?.entity);

export function normalizeGrouped(config: GroupedLightsCardConfig): {
  groups: NormalizedGroup[];
  /** Scenes shown above all groups. */
  scenes: SceneChip[];
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
      const scenes = sceneChips(sg.scenes, where);
      const sub: NormalizedSubgroup = {
        key: `g${gi}-s${si}`,
        name: sg.name || undefined,
        icon: sg.icon || undefined,
        main,
        entities,
        scenes: scenes.length ? scenes : undefined,
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
      scenes: sceneChips(g.scenes, gWhere),
      subgroups,
      collapsible: !!g.collapsible || !!g.collapse_off,
      collapseOff: !!g.collapse_off,
      entityIds: [...new Set(subgroups.flatMap((s) => [...(s.main ? [s.main] : []), ...s.entities]))],
    };
  });

  const entityIds = [...new Set(groups.flatMap((g) => g.entityIds))];
  return {
    groups,
    scenes: sceneChips(config.scenes, 'the card'),
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
