import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fireEvent, type HomeAssistant } from '../../shared/types';
import { isEditorKey, localize } from '../../shared/localize';
import {
  DEFAULTS,
  entityId,
  rawEntities,
  type LightEntityConfig,
  type LightSliderCardConfig,
  type RoomItemConfig,
} from './config';

const ENTITIES = {
  name: 'entities',
  selector: { entity: { multiple: true, filter: { domain: 'light' } } },
};
const MAIN = {
  name: 'main_entity',
  selector: { entity: { filter: { domain: 'light' } } },
};
const SCENES = {
  name: 'scenes',
  selector: { entity: { multiple: true, filter: { domain: 'scene' } } },
};

const OPTIONS_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_color_temp', selector: { boolean: {} } },
      { name: 'show_color', selector: { boolean: {} } },
      { name: 'show_scenes', selector: { boolean: {} } },
      { name: 'expanded', selector: { boolean: {} } },
    ],
  },
];

const SINGLE_SCHEMA = [
  MAIN,
  ENTITIES,
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  ...OPTIONS_SCHEMA,
  SCENES,
];

const ROOM_SCHEMA = [{ name: 'room_name', selector: { text: {} } }, ...OPTIONS_SCHEMA];

const ITEM_SCHEMA = [
  MAIN,
  ENTITIES,
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  SCENES,
];

type BoolKey = keyof typeof DEFAULTS;
type EntityList = Array<string | LightEntityConfig>;

interface ListData {
  main_entity?: string;
  entities?: string[];
  name?: string;
  icon?: string;
  scenes?: string[];
}

/** Map selected entity IDs back to entries, keeping per-light options. */
function mergeEntities(previous: EntityList, ids: string[] = []): EntityList {
  const existing = new Map(previous.map((e) => [entityId(e), e]));
  return ids.map((id) => existing.get(id) ?? id);
}

function setOrDelete<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined) {
  const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (empty) delete obj[key];
  else obj[key] = value;
}

export class LightSliderCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: LightSliderCardConfig;

  setConfig(config: LightSliderCardConfig): void {
    this._config = config;
  }

  private get _t() {
    return localize(this.hass);
  }

  private _label = (schema: { name: string }) => {
    const key = `editor.${schema.name}`;
    return isEditorKey(key) ? this._t(key) : schema.name;
  };

  private _options() {
    const c = this._config!;
    return {
      show_color_temp: c.show_color_temp ?? DEFAULTS.show_color_temp,
      show_color: c.show_color ?? DEFAULTS.show_color,
      show_scenes: c.show_scenes ?? DEFAULTS.show_scenes,
      expanded: c.expanded ?? DEFAULTS.expanded,
    };
  }

  // ---------------------------------------------------------------- render

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const t = this._t;
    const mode = this._config.mode ?? 'single';
    const modeSchema = [
      {
        name: 'mode',
        selector: {
          select: {
            mode: 'box',
            options: [
              { value: 'single', label: t('editor.mode_single') },
              { value: 'room', label: t('editor.mode_room') },
            ],
          },
        },
      },
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ mode }}
        .schema=${modeSchema}
        .computeLabel=${this._label}
        @value-changed=${this._modeChanged}
      ></ha-form>
      ${mode === 'room' ? this._renderRoom() : this._renderSingle()}
    `;
  }

  private _renderSingle() {
    const c = this._config!;
    const data = {
      main_entity: c.main_entity ?? '',
      entities: rawEntities(c).map(entityId),
      name: c.name ?? '',
      icon: c.icon ?? '',
      scenes: c.scenes ?? [],
      ...this._options(),
    };
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${SINGLE_SCHEMA}
      .computeLabel=${this._label}
      @value-changed=${this._singleChanged}
    ></ha-form>`;
  }

  private _renderRoom() {
    const t = this._t;
    const c = this._config!;
    const items = c.items ?? [];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ room_name: c.name ?? '', ...this._options() }}
        .schema=${ROOM_SCHEMA}
        .computeLabel=${this._label}
        @value-changed=${this._roomChanged}
      ></ha-form>
      <div class="items-title">${t('editor.items')}</div>
      ${items.map((item, i) => {
        const first = rawEntities(item)[0];
        const title =
          item.name ||
          (first ? this.hass!.states[entityId(first)]?.attributes.friendly_name : '') ||
          `${t('editor.item')} ${i + 1}`;
        return html`
          <div class="item">
            <div class="item-header">
              <span class="item-title">${title}</span>
              <button
                title=${t('editor.move_up')}
                ?disabled=${i === 0}
                @click=${() => this._moveItem(i, -1)}
              >
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </button>
              <button
                title=${t('editor.move_down')}
                ?disabled=${i === items.length - 1}
                @click=${() => this._moveItem(i, 1)}
              >
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </button>
              <button title=${t('editor.remove_item')} @click=${() => this._removeItem(i)}>
                <ha-icon icon="mdi:delete-outline"></ha-icon>
              </button>
            </div>
            <ha-form
              .hass=${this.hass}
              .data=${{
                main_entity: item.main_entity ?? '',
                entities: rawEntities(item).map(entityId),
                name: item.name ?? '',
                icon: item.icon ?? '',
                scenes: item.scenes ?? [],
              }}
              .schema=${ITEM_SCHEMA}
              .computeLabel=${this._label}
              @value-changed=${(ev: CustomEvent<{ value: ListData }>) => this._itemChanged(i, ev)}
            ></ha-form>
          </div>
        `;
      })}
      <button class="add" @click=${this._addItem}>
        <ha-icon icon="mdi:plus"></ha-icon>${t('editor.add_item')}
      </button>
    `;
  }

  // ---------------------------------------------------------------- changes

  private _update(config: LightSliderCardConfig) {
    this._config = config;
    fireEvent(this, 'config-changed', { config });
  }

  private _applyOptions(config: LightSliderCardConfig, data: Partial<Record<BoolKey, boolean>>) {
    for (const key of Object.keys(DEFAULTS) as BoolKey[]) {
      const value = data[key];
      if (value === undefined || value === DEFAULTS[key]) delete config[key];
      else config[key] = value;
    }
  }

  private _modeChanged(ev: CustomEvent<{ value: { mode?: string } }>) {
    ev.stopPropagation();
    const c = this._config!;
    const from = c.mode ?? 'single';
    const to = ev.detail.value.mode === 'room' ? 'room' : 'single';
    if (from === to) return;

    const config: LightSliderCardConfig = { ...c };
    if (to === 'room') {
      // The current lights become the first slider in the room.
      const entities = rawEntities(c);
      const item: RoomItemConfig = {};
      setOrDelete(item, 'name', c.name);
      setOrDelete(item, 'icon', c.icon);
      setOrDelete(item, 'main_entity', c.main_entity);
      if (entities.length) item.entities = entities;
      setOrDelete(item, 'scenes', c.scenes);
      config.mode = 'room';
      config.items = [item];
      for (const key of ['entity', 'entities', 'main_entity', 'name', 'icon', 'scenes'] as const) {
        delete config[key];
      }
    } else {
      // Put every light from the room under one slider.
      const seen = new Set<string>();
      const entities: EntityList = [];
      for (const item of c.items ?? []) {
        const list = [...(item.main_entity ? [item.main_entity] : []), ...rawEntities(item)];
        for (const e of list) {
          if (seen.has(entityId(e))) continue;
          seen.add(entityId(e));
          entities.push(e);
        }
      }
      delete config.mode;
      delete config.items;
      config.entities = entities;
    }
    this._update(config);
  }

  private _singleChanged(ev: CustomEvent<{ value: ListData & Record<BoolKey, boolean> }>) {
    ev.stopPropagation();
    const c = this._config!;
    const data = ev.detail.value;
    const config: LightSliderCardConfig = {
      ...c,
      entities: mergeEntities(rawEntities(c), data.entities),
    };
    delete config.entity;
    setOrDelete(config, 'main_entity', data.main_entity);
    setOrDelete(config, 'name', data.name);
    setOrDelete(config, 'icon', data.icon);
    setOrDelete(config, 'scenes', data.scenes);
    this._applyOptions(config, data);
    this._update(config);
  }

  private _roomChanged(ev: CustomEvent<{ value: { room_name?: string } & Record<BoolKey, boolean> }>) {
    ev.stopPropagation();
    const data = ev.detail.value;
    const config: LightSliderCardConfig = { ...this._config! };
    setOrDelete(config, 'name', data.room_name);
    this._applyOptions(config, data);
    this._update(config);
  }

  private _itemChanged(index: number, ev: CustomEvent<{ value: ListData }>) {
    ev.stopPropagation();
    const items = [...(this._config!.items ?? [])];
    const old = items[index] ?? {};
    const data = ev.detail.value;
    const item: RoomItemConfig = { ...old, entities: mergeEntities(rawEntities(old), data.entities) };
    delete item.entity;
    setOrDelete(item, 'main_entity', data.main_entity);
    setOrDelete(item, 'name', data.name);
    setOrDelete(item, 'icon', data.icon);
    setOrDelete(item, 'scenes', data.scenes);
    items[index] = item;
    this._update({ ...this._config!, items });
  }

  private _addItem = () => {
    const items = [...(this._config!.items ?? []), { entities: [] }];
    this._update({ ...this._config!, items });
  };

  private _removeItem(index: number) {
    const items = (this._config!.items ?? []).filter((_, i) => i !== index);
    this._update({ ...this._config!, items });
  }

  private _moveItem(index: number, delta: number) {
    const items = [...(this._config!.items ?? [])];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    this._update({ ...this._config!, items });
  }

  static styles = css`
    ha-form {
      display: block;
      margin-bottom: 16px;
    }
    .items-title {
      font-weight: 500;
      margin: 8px 0;
    }
    .item {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 12px;
      padding: 8px 12px 0;
      margin-bottom: 12px;
    }
    .item-header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .item-title {
      flex: 1;
      font-weight: 500;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font: inherit;
      color: var(--secondary-text-color);
      background: none;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .add {
      width: 100%;
      height: 44px;
      border-radius: 12px;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.5));
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }
  `;
}
