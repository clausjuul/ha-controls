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
  /** Open boxes: `g0` for a group, `g0-s1` for one of its rows. Closed by default. */
  @state() private _open: ReadonlySet<string> = new Set();

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
      <button
        class="add"
        @click=${() => {
          this._openKey(`g${this._groups.length}`);
          this._setGroups([...this._groups, { name: '', subgroups: [] }]);
        }}
      >
        <ha-icon icon="mdi:plus"></ha-icon>${t('editor.add_group')}
      </button>
    `;
  }

  private _header(
    key: string,
    title: string,
    summary: string,
    index: number,
    count: number,
    onMove: (delta: number) => void,
    onRemove: () => void,
  ): TemplateResult {
    const t = this._t;
    const open = this._open.has(key);
    return html`
      <div class="header">
        <button class="toggle ${open ? 'open' : ''}" aria-expanded=${open ? 'true' : 'false'} @click=${() => this._toggle(key)}>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
          <span class="title">${title}</span>
          ${summary ? html`<span class="summary">${summary}</span>` : nothing}
        </button>
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
    const key = `g${gi}`;
    const header = this._header(
      key,
      g.name || `${t('editor.group')} ${gi + 1}`,
      t('editor.rows_count', { count: subs.length }),
      gi,
      this._groups.length,
      (d) => {
        this._remapGroups((i) => (i === gi ? gi + d : i === gi + d ? gi : i));
        this._setGroups(move(this._groups, gi, d));
      },
      () => {
        this._remapGroups((i) => (i === gi ? undefined : i > gi ? i - 1 : i));
        this._setGroups(this._groups.filter((_, i) => i !== gi));
      },
    );
    if (!this._open.has(key)) return html`<div class="box group">${header}</div>`;
    return html`
      <div class="box group">
        ${header}
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
        <button
          class="add small"
          @click=${() => {
            this._openKey(`g${gi}-s${subs.length}`);
            this._setGroup(gi, { ...g, subgroups: [...subs, {}] });
          }}
        >
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

    const key = `g${gi}-s${si}`;
    const count = entities.length + (sg.main_entity ? 1 : 0);
    const header = this._header(
      key,
      String(title),
      count ? t('editor.lights_count', { count }) : '',
      si,
      subs.length,
      (d) => {
        this._remapRows(gi, (i) => (i === si ? si + d : i === si + d ? si : i));
        setSubs(move(subs, si, d));
      },
      () => {
        this._remapRows(gi, (i) => (i === si ? undefined : i > si ? i - 1 : i));
        setSubs(subs.filter((_, i) => i !== si));
      },
    );
    if (!this._open.has(key)) return html`<div class="box">${header}</div>`;
    return html`
      <div class="box">
        ${header}
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

  // ------------------------------------------------------------ open/close

  private _toggle(key: string) {
    const next = new Set(this._open);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this._open = next;
  }

  private _openKey(key: string) {
    this._open = new Set([...this._open, key]);
  }

  /** Keep the right groups open when groups move or are removed. */
  private _remapGroups(map: (index: number) => number | undefined) {
    const next = new Set<string>();
    for (const key of this._open) {
      const m = /^g(\d+)(.*)$/.exec(key);
      if (!m) continue;
      const i = map(Number(m[1]));
      if (i !== undefined) next.add(`g${i}${m[2]}`);
    }
    this._open = next;
  }

  /** Keep the right rows of group `gi` open when rows move or are removed. */
  private _remapRows(gi: number, map: (index: number) => number | undefined) {
    const prefix = `g${gi}-s`;
    const next = new Set<string>();
    for (const key of this._open) {
      if (!key.startsWith(prefix)) {
        next.add(key);
        continue;
      }
      const i = map(Number(key.slice(prefix.length)));
      if (i !== undefined) next.add(`${prefix}${i}`);
    }
    this._open = next;
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
      padding: 4px 8px 4px 4px;
      margin-bottom: 12px;
    }
    .box > ha-form,
    .box > .subtitle,
    .box > .box,
    .box > .add {
      margin-left: 8px;
    }
    .box > .header + * {
      margin-top: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .header .toggle {
      flex: 1;
      min-width: 0;
      width: auto;
      height: 40px;
      justify-content: flex-start;
      gap: 8px;
      padding: 0 4px;
      border-radius: 8px;
      color: var(--primary-text-color);
      text-align: left;
    }
    .toggle ha-icon {
      flex: none;
      color: var(--secondary-text-color);
      transform: rotate(-90deg);
      transition: transform 150ms ease;
    }
    .toggle.open ha-icon {
      transform: none;
    }
    .title {
      min-width: 0;
      font-weight: 500;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .summary {
      flex: none;
      font-size: 0.9em;
      color: var(--secondary-text-color);
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
