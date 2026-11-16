import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fireEvent, type HomeAssistant } from '../../shared/types';
import { isEditorKey, localize } from '../../shared/localize';
import { DOMAINS } from '../light-slider/config';
import type { GroupConfig, GroupedLightsCardConfig, SubgroupConfig } from './config';

const OPTIONS_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_color_temp', selector: { boolean: {} } },
      { name: 'show_color', selector: { boolean: {} } },
      { name: 'show_scenes', selector: { boolean: {} } },
    ],
  },
];

const GROUP_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  { name: 'group_scenes', selector: { entity: { multiple: true, filter: { domain: 'scene' } } } },
];

const SUBGROUP_SCHEMA = [
  { name: 'entities', selector: { entity: { multiple: true, filter: { domain: DOMAINS } } } },
  { name: 'main_entity', selector: { entity: { filter: { domain: DOMAINS } } } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  { name: 'scenes', selector: { entity: { multiple: true, filter: { domain: 'scene' } } } },
];

type OptionKey = 'show_color_temp' | 'show_color' | 'show_scenes';

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function setOrDelete<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined) {
  const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (empty) delete obj[key];
  else obj[key] = value;
}

export class GroupedLightsCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: GroupedLightsCardConfig;

  setConfig(config: GroupedLightsCardConfig): void {
    this._config = config;
  }

  private get _t() {
    return localize(this.hass);
  }

  private _label = (schema: { name: string }) => {
    const key = `editor.${schema.name}`;
    return isEditorKey(key) ? this._t(key) : schema.name;
  };

  private _update(config: GroupedLightsCardConfig) {
    this._config = config;
    fireEvent(this, 'config-changed', { config });
  }

  private get _groups(): GroupConfig[] {
    return this._config?.groups ?? [];
  }

  private _setGroups(groups: GroupConfig[]) {
    this._update({ ...this._config!, groups });
  }

  private _setGroup(index: number, group: GroupConfig) {
    const groups = [...this._groups];
    groups[index] = group;
    this._setGroups(groups);
  }

  // ---------------------------------------------------------------- render

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const t = this._t;
    const c = this._config;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{
          show_color_temp: c.show_color_temp ?? true,
          show_color: c.show_color ?? true,
          show_scenes: c.show_scenes ?? true,
        }}
        .schema=${OPTIONS_SCHEMA}
        .computeLabel=${this._label}
        @value-changed=${this._optionsChanged}
      ></ha-form>
      ${this._groups.map((g, gi) => this._renderGroup(g, gi))}
      <button class="add" @click=${() => this._setGroups([...this._groups, { name: '', subgroups: [] }])}>
        <ha-icon icon="mdi:plus"></ha-icon>${t('editor.add_group')}
      </button>
    `;
  }

  private _header(
    title: string,
    index: number,
    count: number,
    onMove: (delta: number) => void,
    onRemove: () => void,
  ): TemplateResult {
    const t = this._t;
    return html`
      <div class="header">
        <span class="title">${title}</span>
        <button
          title=${t('editor.move_up')}
          aria-label=${t('editor.move_up')}
          ?disabled=${index === 0}
          @click=${() => onMove(-1)}
        >
          <ha-icon icon="mdi:arrow-up"></ha-icon>
        </button>
        <button
          title=${t('editor.move_down')}
          aria-label=${t('editor.move_down')}
          ?disabled=${index === count - 1}
          @click=${() => onMove(1)}
        >
          <ha-icon icon="mdi:arrow-down"></ha-icon>
        </button>
        <button title=${t('editor.remove_item')} aria-label=${t('editor.remove_item')} @click=${onRemove}>
          <ha-icon icon="mdi:delete-outline"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderGroup(g: GroupConfig, gi: number): TemplateResult {
    const t = this._t;
    const subs = g.subgroups ?? [];
    return html`
      <div class="box group">
        ${this._header(
          g.name || `${t('editor.group')} ${gi + 1}`,
          gi,
          this._groups.length,
          (d) => this._setGroups(move(this._groups, gi, d)),
          () => this._setGroups(this._groups.filter((_, i) => i !== gi)),
        )}
        <ha-form
          .hass=${this.hass}
          .data=${{ name: g.name ?? '', icon: g.icon ?? '', group_scenes: g.scenes ?? [] }}
          .schema=${GROUP_SCHEMA}
          .computeLabel=${this._label}
          @value-changed=${(ev: CustomEvent<{ value: { name?: string; icon?: string; group_scenes?: string[] } }>) => {
            ev.stopPropagation();
            const v = ev.detail.value;
            const next: GroupConfig = { ...g };
            setOrDelete(next, 'name', v.name);
            setOrDelete(next, 'icon', v.icon);
            setOrDelete(next, 'scenes', v.group_scenes);
            this._setGroup(gi, next);
          }}
        ></ha-form>
        <div class="subtitle">${t('rows')}</div>
        ${subs.map((sg, si) => this._renderSubgroup(g, gi, sg, si))}
        <button class="add small" @click=${() => this._setGroup(gi, { ...g, subgroups: [...subs, {}] })}>
          <ha-icon icon="mdi:plus"></ha-icon>${t('editor.add_row')}
        </button>
      </div>
    `;
  }

  private _renderSubgroup(g: GroupConfig, gi: number, sg: SubgroupConfig, si: number): TemplateResult {
    const t = this._t;
    const subs = g.subgroups ?? [];
    const entities = [...(sg.entity ? [sg.entity] : []), ...(sg.entities ?? [])].map((e) =>
      typeof e === 'string' ? e : e.entity,
    );
    const first = sg.main_entity ?? entities[0];
    const title =
      sg.name ||
      (first ? this.hass!.states[first]?.attributes.friendly_name : '') ||
      `${t('editor.row')} ${si + 1}`;
    const setSubs = (list: SubgroupConfig[]) => this._setGroup(gi, { ...g, subgroups: list });

    return html`
      <div class="box">
        ${this._header(
          String(title),
          si,
          subs.length,
          (d) => setSubs(move(subs, si, d)),
          () => setSubs(subs.filter((_, i) => i !== si)),
        )}
        <ha-form
          .hass=${this.hass}
          .data=${{
            entities,
            main_entity: sg.main_entity ?? '',
            name: sg.name ?? '',
            icon: sg.icon ?? '',
            scenes: sg.scenes ?? [],
          }}
          .schema=${SUBGROUP_SCHEMA}
          .computeLabel=${this._label}
          @value-changed=${(
            ev: CustomEvent<{
              value: { entities?: string[]; main_entity?: string; name?: string; icon?: string; scenes?: string[] };
            }>,
          ) => {
            ev.stopPropagation();
            const v = ev.detail.value;
            const next: SubgroupConfig = { ...sg };
            delete next.entity;
            setOrDelete(next, 'entities', v.entities);
            setOrDelete(next, 'main_entity', v.main_entity);
            setOrDelete(next, 'name', v.name);
            setOrDelete(next, 'icon', v.icon);
            setOrDelete(next, 'scenes', v.scenes);
            const list = [...subs];
            list[si] = next;
            setSubs(list);
          }}
        ></ha-form>
      </div>
    `;
  }

  private _optionsChanged(ev: CustomEvent<{ value: Partial<Record<OptionKey, boolean>> }>) {
    ev.stopPropagation();
    const config: GroupedLightsCardConfig = { ...this._config! };
    for (const key of ['show_color_temp', 'show_color', 'show_scenes'] as OptionKey[]) {
      if (ev.detail.value[key] === false) config[key] = false;
      else delete config[key];
    }
    this._update(config);
  }

  static styles = css`
    ha-form {
      display: block;
      margin-bottom: 12px;
    }
    .box {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 12px;
      padding: 8px 12px 4px;
      margin-bottom: 12px;
    }
    .group {
      padding-bottom: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .title {
      flex: 1;
      font-weight: 500;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .subtitle {
      font-weight: 500;
      margin: 4px 0 8px;
      color: var(--secondary-text-color);
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: none;
      color: var(--secondary-text-color);
      font: inherit;
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
    .add.small {
      height: 40px;
    }
  `;
}
