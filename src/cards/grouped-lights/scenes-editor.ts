import { HacEntitiesEditor, compactEntry, type Entry, type RowData } from '../light-slider/entities-editor';
import type { SceneChipConfig } from './config';

const ROW_SCHEMA = [
  { name: 'scene', selector: { entity: { filter: { domain: 'scene' } } } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_icon', selector: { boolean: {} } },
      { name: 'auto_color', selector: { boolean: {} } },
      { name: 'scene_color', selector: { color_rgb: {} } },
    ],
  },
];

const ADD_SCHEMA = [{ name: 'add_scene', selector: { entity: { filter: { domain: 'scene' } } } }];

const toHex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

function fromHex(color?: string): number[] | undefined {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '');
  return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : undefined;
}

/**
 * The scene chips of a scene row: scene, own name and icon, icon on/off and a
 * colour, with buttons to reorder and remove. Fires `entities-changed`.
 */
export class HacScenesEditor extends HacEntitiesEditor {
  protected rowSchema: unknown[] = ROW_SCHEMA;
  protected addSchema: unknown[] = ADD_SCHEMA;
  protected entityKey = 'scene';
  protected addKey = 'add_scene';

  protected rowData(conf: { entity: string }): RowData {
    const c = conf as SceneChipConfig;
    return {
      scene: c.entity,
      name: c.name ?? '',
      icon: c.icon ?? '',
      show_icon: c.show_icon !== false,
      auto_color: c.color === 'auto',
      scene_color: fromHex(c.color),
    };
  }

  protected toEntry(prev: Entry, data: RowData): Entry {
    const base: SceneChipConfig = typeof prev === 'string' ? { entity: prev } : { ...(prev as SceneChipConfig) };
    base.entity = (data.scene as string) || base.entity;
    base.name = (data.name as string) || undefined;
    base.icon = (data.icon as string) || undefined;
    base.show_icon = data.show_icon === false ? false : undefined;
    const rgb = data.scene_color as number[] | undefined;
    const wasAuto = base.color === 'auto';
    if (data.auto_color && !wasAuto) {
      base.color = 'auto';
    } else if (!data.auto_color && wasAuto) {
      base.color = undefined;
    } else if (wasAuto) {
      // Picking a colour turns the lights' colours off.
      if (Array.isArray(rgb) && rgb.length === 3) base.color = toHex(rgb);
    } else if (Array.isArray(rgb) && rgb.length === 3) {
      // The colour picker only knows RGB: leave a CSS colour from YAML alone until it's changed.
      if (fromHex(base.color)?.join() !== rgb.join()) base.color = toHex(rgb);
    } else if (fromHex(base.color)) {
      base.color = undefined;
    }
    for (const k of Object.keys(base) as (keyof SceneChipConfig)[]) if (base[k] === undefined) delete base[k];
    return compactEntry(base);
  }
}
