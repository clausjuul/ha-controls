import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { type HassEntity, type HomeAssistant } from '../../shared/types';
import { localize, type Localize } from '../../shared/localize';
import {
  brightnessPct,
  defaultIcon,
  isLightColor,
  isOn,
  lightColor,
  withoutRoomName,
} from '../../shared/light';
import { LightSliderCard, type DialogState, type Target } from '../light-slider/light-slider-card';
import { DOMAINS } from '../light-slider/config';
import { styles as baseStyles } from '../light-slider/styles';
import {
  normalizeGrouped,
  type GroupedLightsCardConfig,
  type GroupedOptions,
  type NormalizedGroup,
  type NormalizedSubgroup,
} from './config';
import { styles } from './styles';
import { themeTokens } from '../../shared/theme';

export const GROUPED_TAG = 'ha-controls-grouped-lights-card';
export const GROUPED_EDITOR_TAG = 'ha-controls-grouped-lights-card-editor';

interface Columns {
  color: boolean;
  scenes: boolean;
}

interface SubInfo {
  name: string;
  on: boolean;
  unavailable: boolean;
  /** Undefined when nothing in the row can be dimmed (an on/off bar instead). */
  brightness?: number;
  color?: string;
  lightFill: boolean;
  /** A light that is on (or the first one), for the heading colour. */
  state?: HassEntity;
}

/**
 * Rooms (groups) with a scrollable row of scenes and one bar per row
 * (subgroup). Built on the light slider card, so popups, optimistic updates
 * and remembered light states work the same way.
 */
export class GroupedLightsCard extends LightSliderCard {
  @state() protected _groups?: NormalizedGroup[];
  /** Scenes for everything, above the groups. */
  @state() protected _topScenes: string[] = [];
  protected _options: GroupedOptions = { collapsible: false, collapseOff: false };
  /** Groups the user folded in or out by hand, until the group turns on or off. */
  protected _groupOpen: Record<string, boolean> = {};
  /** Whether each group was on at the last render, to notice it changing. */
  protected _groupWasOn: Record<string, boolean> = {};

  static styles = [themeTokens, baseStyles, styles];

  static getConfigElement(): HTMLElement {
    return document.createElement(GROUPED_EDITOR_TAG);
  }

  static getStubConfig(hass: HomeAssistant): Partial<GroupedLightsCardConfig> {
    const lights = Object.keys(hass.states)
      .filter((id) => id.startsWith('light.'))
      .slice(0, 2);
    return { groups: [{ name: 'Stue', subgroups: lights.map((entity) => ({ entity })) }] };
  }

  setConfig(config: GroupedLightsCardConfig): void {
    const { groups, scenes, options, base } = normalizeGrouped(config);
    this._groups = groups;
    this._topScenes = scenes;
    this._options = options;
    this._config = base;
    this._expanded = {};
    this._groupOpen = {};
    this._groupWasOn = {};
  }

  getCardSize(): number {
    if (!this._groups) return 1;
    return this._groups.reduce(
      (size, g) => size + 2 + (g.scenes.length ? 1 : 0) + g.subgroups.length,
      this._topScenes.length ? 1 : 0,
    );
  }

  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    if (super.shouldUpdate(changed)) return true;
    // Scenes in the scene rows change state when they're activated.
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass || !this._groups) return false;
    const sceneIds = [...this._topScenes, ...this._groups.flatMap((g) => g.scenes)];
    // Lights shown in an expanded row may not be in the config.
    const shown = this._groups
      .flatMap((g) => g.subgroups)
      .filter((s) => this._expanded[s.key])
      .flatMap((s) => this._members(s));
    return [...sceneIds, ...shown].some((id) => old.states[id] !== this.hass!.states[id]);
  }

  // ---------------------------------------------------------------- render

  protected render() {
    if (!this._groups || !this._config || !this.hass) return nothing;
    const t = localize(this.hass);
    const cols = this._glColumns();
    return html`
      <ha-card class="grouped">
        ${this._topScenes.length ? this._renderSceneRow(this._topScenes, t) : nothing}
        ${this._groups.map((g) => this._renderGroupBlock(g, cols, t))}
      </ha-card>
      ${this._renderDialog(t)}
    `;
  }

  /** Which buttons any row uses, so every row keeps the same columns. */
  protected _glColumns(): Columns {
    const cols: Columns = { color: false, scenes: false };
    for (const g of this._groups!) {
      for (const sub of g.subgroups) {
        const target = this._subTarget(sub, '');
        cols.color ||= this._colorLights(target.ids).any;
        cols.scenes ||= this._hasSceneMenu(target);
      }
    }
    return cols;
  }

  protected _renderGroupBlock(g: NormalizedGroup, cols: Columns, t: Localize): TemplateResult {
    const rows = g.subgroups.map((sub) => ({ sub, info: this._subInfo(sub, t) }));
    const available = rows.filter((r) => !r.info.unavailable);
    const on = available.filter((r) => r.info.on);
    const dimOn = on.filter((r) => r.info.brightness !== undefined);
    const pct = dimOn.length
      ? Math.round(dimOn.reduce((sum, r) => sum + (r.info.brightness ?? 0), 0) / dimOn.length)
      : on.length
        ? 100
        : 0;
    const anyOn = on.length > 0;
    const secondary = !available.length ? t('unavailable') : anyOn ? `${pct}%` : t('off');
    const allIds = [...new Set(g.subgroups.flatMap((s) => this._controlled(s)))];
    const color = lightColor(on.map((r) => r.info.state).find(isOn));
    const label = anyOn ? t('room_off') : t('room_on');
    const name = g.name ?? t('lights');
    const open = this._isGroupOpen(g, anyOn);
    const heading = html`
      <span class="gl-title">${name}</span>
      <span class="gl-sub">${secondary}</span>
    `;

    return html`
      <section class="gl-group" aria-label=${name}>
        <div class="gl-header ${anyOn ? 'on' : ''}" style=${this._lightStyle(color)}>
          <button
            class="icon"
            title=${label}
            aria-label=${`${label}: ${name}`}
            ?disabled=${!available.length}
            @click=${() => this._toggle(allIds)}
          >
            <ha-icon .icon=${g.icon ?? defaultIcon(anyOn, true)}></ha-icon>
          </button>
          ${this._options.collapsible
            ? html`<button
                class="gl-heading gl-fold ${open ? 'open' : ''}"
                aria-expanded=${open ? 'true' : 'false'}
                aria-label=${`${t('expand')}: ${name}`}
                @click=${() => {
                  this._groupOpen[g.key] = !open;
                  this.requestUpdate();
                }}
              >
                <span class="gl-heading-text">${heading}</span>
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>`
            : html`<div class="gl-heading"><span class="gl-heading-text">${heading}</span></div>`}
          <button
            class="switch ${anyOn ? 'on' : ''}"
            role="switch"
            aria-checked=${anyOn ? 'true' : 'false'}
            aria-label=${`${t('toggle')}: ${name}`}
            ?disabled=${!available.length}
            @click=${() => this._toggle(allIds)}
          >
            <span class="switch-knob"></span>
          </button>
        </div>
        ${this._collapse(
          open,
          html`<div class="gl-body">
            ${g.scenes.length ? this._renderSceneRow(g.scenes, t, g.name) : nothing}
            <div class="gl-rows">
              ${rows.map(({ sub, info }) => this._renderItem(sub, info, cols, t, g.name))}
            </div>
          </div>`,
          'group',
        )}
      </section>
    `;
  }

  /** A row of scene chips that scrolls sideways. `room` is left out of their names. */
  protected _renderSceneRow(ids: string[], t: Localize, room?: string): TemplateResult {
    const scenes = ids
      .map((id) => this._state(id))
      .filter((s): s is HassEntity => !!s);
    return html`
      <div class="gl-scenes" role="group" aria-label=${t('scenes')}>
        ${scenes.map(
          (s) => html`<button
            class="gl-scene"
            ?disabled=${s.state === 'unavailable'}
            @click=${() => this._activateScene(s)}
          >
            <ha-icon .icon=${s.attributes.icon ?? 'mdi:palette'}></ha-icon>
            <span>${withoutRoomName(String(s.attributes.friendly_name ?? s.entity_id), room)}</span>
          </button>`,
        )}
      </div>
    `;
  }

  /**
   * Whether a group shows its scenes and rows. A group folded by hand stays
   * that way until it turns on or off; with `collapse_off` an off group folds in.
   */
  protected _isGroupOpen(g: NormalizedGroup, anyOn: boolean): boolean {
    if (!this._options.collapsible) return true;
    const was = this._groupWasOn[g.key];
    this._groupWasOn[g.key] = anyOn;
    if (was !== undefined && was !== anyOn) delete this._groupOpen[g.key];
    return this._groupOpen[g.key] ?? !(this._options.collapseOff && !anyOn);
  }

  /** A row, and its lights in a panel below it while it's expanded. */
  protected _renderItem(
    sub: NormalizedSubgroup,
    info: SubInfo,
    cols: Columns,
    t: Localize,
    room?: string,
  ): TemplateResult {
    const members = this._members(sub);
    const expanded = members.length > 0 && !!this._expanded[sub.key];
    return html`
      <div class="gl-item">
        ${this._renderSubRow(sub, info, cols, t, room, members.length > 0)}
        ${members.length
          ? this._collapse(
              expanded,
              html`<div class="gl-lights">
                ${members.map((id) => {
                  const child: NormalizedSubgroup = { key: `${sub.key}-${id}`, entities: [id] };
                  return this._renderSubRow(child, this._subInfo(child, t), cols, t, room);
                })}
              </div>`,
              'row',
            )
          : nothing}
      </div>
    `;
  }

  /**
   * Content that slides open and shut. It stays rendered so it can animate,
   * but can't be reached with the keyboard while it's shut.
   */
  protected _collapse(open: boolean, content: TemplateResult, kind: 'group' | 'row') {
    return html`<div class="gl-collapse ${kind} ${open ? '' : 'closed'}" ?inert=${!open}>
      <div class="gl-collapse-inner">${content}</div>
    </div>`;
  }

  /**
   * One row: name, a bar, and the row's buttons. Tapping the name of a row
   * with several lights shows them; otherwise it toggles the row.
   */
  protected _renderSubRow(
    sub: NormalizedSubgroup,
    info: SubInfo,
    cols: Columns,
    t: Localize,
    room?: string,
    expandable = false,
  ): TemplateResult {
    const ids = this._controlled(sub);
    const target = { ...this._subTarget(sub, info.name), room };
    const hasColor = cols.color && this._colorLights(target.ids).any;
    const hasScenes = cols.scenes && this._hasSceneMenu(target);
    const spacer = html`<span class="gl-spacer"></span>`;
    const stateText = info.unavailable ? t('unavailable') : info.on ? t('on') : t('off');
    const expanded = expandable && !!this._expanded[sub.key];

    return html`
      <div
        class="gl-row ${info.on ? 'on' : ''} ${info.lightFill ? 'light-fill' : ''}"
        style=${this._lightStyle(info.color)}
      >
        ${expandable
          ? html`<button
              class="gl-name ${expanded ? 'open' : ''}"
              title=${info.name}
              aria-expanded=${expanded ? 'true' : 'false'}
              aria-label=${`${t('expand')}: ${info.name}`}
              @click=${() => (this._expanded = { ...this._expanded, [sub.key]: !expanded })}
            >
              <span class="gl-name-text">${info.name}</span>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>`
          : html`<button
              class="gl-name"
              title=${info.name}
              aria-label=${`${t('toggle')}: ${info.name}`}
              aria-pressed=${info.on ? 'true' : 'false'}
              ?disabled=${info.unavailable}
              @click=${() => this._toggle(ids)}
            >
              <span class="gl-name-text">${info.name}</span>
            </button>`}
        ${info.brightness !== undefined
          ? html`<hac-slider
              show-value
              value-at="end"
              .thumb=${false}
              .value=${info.brightness}
              .min=${0}
              .max=${100}
              .emptyText=${stateText}
              .label=${`${t('brightness')}: ${info.name}`}
              .formatValue=${(v: number) => `${v}%`}
              ?disabled=${info.unavailable}
              @value-changed=${(e: CustomEvent<{ value: number }>) =>
                this._setBrightness(ids, e.detail.value)}
            ></hac-slider>`
          : html`<button
              class="gl-toggle ${info.on ? 'on' : ''}"
              role="switch"
              aria-checked=${info.on ? 'true' : 'false'}
              aria-label=${`${t('toggle')}: ${info.name}`}
              ?disabled=${info.unavailable}
              @click=${() => this._toggle(ids)}
            >
              ${stateText}
            </button>`}
        ${cols.color || cols.scenes
          ? html`<div class="gl-actions">
              ${cols.color
                ? hasColor
                  ? html`<button
                      class="gl-action"
                      title=${t('color')}
                      aria-label=${`${t('color')}: ${info.name}`}
                      ?disabled=${info.unavailable}
                      @click=${(e: Event) => this._openDialog('color', target, e)}
                    >
                      <ha-icon icon="mdi:palette"></ha-icon>
                    </button>`
                  : spacer
                : nothing}
              ${cols.scenes
                ? hasScenes
                  ? html`<button
                      class="gl-action"
                      title=${t('scenes')}
                      aria-label=${`${t('scenes')}: ${info.name}`}
                      @click=${(e: Event) => this._openDialog('scenes', target, e)}
                    >
                      <ha-icon icon="mdi:creation"></ha-icon>
                    </button>`
                  : spacer
                : nothing}
            </div>`
          : html`<span></span>`}
      </div>
    `;
  }

  /** Place the popup by the row that opened it, like the light slider card. */
  protected _openDialog(kind: DialogState['kind'], target: Target, ev: Event) {
    super._openDialog(kind, target, ev);
    this._anchor = (ev.currentTarget as HTMLElement).closest<HTMLElement>('.gl-row') ?? undefined;
  }

  // --------------------------------------------------------------- helpers

  /** The entities a row's bar and toggle act on. */
  protected _controlled(sub: NormalizedSubgroup): string[] {
    return sub.main ? [sub.main] : sub.entities;
  }

  protected _subTarget(sub: NormalizedSubgroup, title: string): Target {
    return {
      title,
      ids: this._controlled(sub),
      sceneIds: [...(sub.main ? [sub.main] : []), ...sub.entities],
      sceneOverride: sub.scenes,
    };
  }

  /**
   * The lights a row can fold out: its listed lights, or the members of its
   * main entity when that is a light group. None for a row with one light.
   */
  protected _members(sub: NormalizedSubgroup): string[] {
    let ids = sub.entities;
    if (sub.main && !ids.length) {
      const attr = this._state(sub.main)?.attributes.entity_id;
      ids = Array.isArray(attr) ? attr.filter((id): id is string => typeof id === 'string') : [];
    }
    ids = ids.filter((id) => DOMAINS.includes(id.split('.')[0]) && !!this._state(id));
    return sub.main ? ids : ids.length > 1 ? ids : [];
  }

  protected _subInfo(sub: NormalizedSubgroup, t: Localize): SubInfo {
    const ids = this._controlled(sub);
    const all = ids.map((id) => this._state(id)).filter((s): s is HassEntity => !!s);
    const available = this._available(ids);
    const on = available.filter(isOn);
    const dimmable = available.filter(this._dimmable);
    const dimOn = dimmable.filter(isOn);
    const first = all[0];
    const name =
      sub.name ??
      (ids.length === 1 && first ? String(first.attributes.friendly_name ?? first.entity_id) : t('lights'));
    let brightness: number | undefined;
    if (dimmable.length) {
      brightness = dimOn.length
        ? Math.round(dimOn.reduce((sum, s) => sum + brightnessPct(s), 0) / dimOn.length)
        : 0;
    }
    return {
      name,
      on: on.length > 0,
      unavailable: available.length === 0,
      brightness,
      color: lightColor(on[0]),
      lightFill: isLightColor(on[0]),
      state: on[0] ?? first,
    };
  }
}
