import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fireEvent, type HassEntity, type HomeAssistant } from '../../shared/types';
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
import { styles as baseStyles } from '../light-slider/styles';
import {
  normalizeGrouped,
  type GroupedLightsCardConfig,
  type NormalizedGroup,
  type NormalizedSubgroup,
} from './config';
import { styles } from './styles';

export const GROUPED_TAG = 'ha-controls-grouped-lights-card';
export const GROUPED_EDITOR_TAG = 'ha-controls-grouped-lights-card-editor';

interface Columns {
  color: boolean;
  scenes: boolean;
  lights: boolean;
}

const NO_COLUMNS: Columns = { color: false, scenes: false, lights: false };

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

  static styles = [baseStyles, styles];

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
    const { groups, scenes, base } = normalizeGrouped(config);
    this._groups = groups;
    this._topScenes = scenes;
    this._config = base;
    this._expanded = {};
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
    return sceneIds.some((id) => old.states[id] !== this.hass!.states[id]);
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
    const cols = { ...NO_COLUMNS };
    for (const g of this._groups!) {
      for (const sub of g.subgroups) {
        const target = this._subTarget(sub, '');
        cols.color ||= this._colorLights(target.ids).any;
        cols.scenes ||= this._hasSceneMenu(target);
        cols.lights ||= this._hasLights(sub);
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
    const secondary = !available.length
      ? t('unavailable')
      : anyOn
        ? `${pct}% · ${t('lights_on_short', { on: on.length, total: available.length })}`
        : t('off');
    const allIds = [...new Set(g.subgroups.flatMap((s) => this._controlled(s)))];
    const color = lightColor(on.map((r) => r.info.state).find(isOn));
    const label = anyOn ? t('room_off') : t('room_on');
    const name = g.name ?? t('lights');

    return html`
      <section class="gl-group" aria-label=${name}>
        <div class="gl-header ${anyOn ? 'on' : ''}" style=${color ? `--hac-light-color: ${color}` : ''}>
          <button
            class="icon"
            title=${label}
            aria-label=${`${label}: ${name}`}
            ?disabled=${!available.length}
            @click=${() => this._toggle(allIds)}
          >
            <ha-icon .icon=${g.icon ?? defaultIcon(anyOn, true)}></ha-icon>
          </button>
          <div class="gl-heading">
            <span class="gl-title">${name}</span>
            <span class="gl-sub">${secondary}</span>
          </div>
        </div>
        ${g.scenes.length ? this._renderSceneRow(g.scenes, t, g.name) : nothing}
        <div class="gl-rows">
          ${rows.map(({ sub, info }) => this._renderSubRow(sub, info, cols, t, g.name))}
        </div>
      </section>
    `;
  }

  /** A row of scene chips that scrolls sideways. `room` is left out of their names. */
  protected _renderSceneRow(ids: string[], t: Localize, room?: string): TemplateResult {
    const scenes = ids
      .map((id) => this._state(id))
      .filter((s): s is HassEntity => !!s);
    let latest: HassEntity | undefined;
    for (const s of scenes) {
      const time = Date.parse(s.state);
      if (!Number.isNaN(time) && (!latest || time > Date.parse(latest.state))) latest = s;
    }
    return html`
      <div class="gl-scenes" role="group" aria-label=${t('scenes')}>
        ${scenes.map(
          (s) => html`<button
            class="gl-scene ${s === latest ? 'active' : ''}"
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

  /** One row: name (tap to toggle), a bar, and the row's buttons. */
  protected _renderSubRow(
    sub: NormalizedSubgroup,
    info: SubInfo,
    cols: Columns,
    t: Localize,
    room?: string,
  ): TemplateResult {
    const ids = this._controlled(sub);
    const target = { ...this._subTarget(sub, info.name), room };
    const hasColor = cols.color && this._colorLights(target.ids).any;
    const hasScenes = cols.scenes && this._hasSceneMenu(target);
    const hasLights = cols.lights && this._hasLights(sub);
    const spacer = html`<span class="gl-spacer"></span>`;
    const stateText = info.unavailable ? t('unavailable') : info.on ? t('on') : t('off');

    return html`
      <div
        class="gl-row ${info.on ? 'on' : ''} ${info.lightFill ? 'light-fill' : ''}"
        style=${info.color ? `--hac-light-color: ${info.color}` : ''}
      >
        <button
          class="gl-name"
          title=${info.name}
          aria-label=${`${t('toggle')}: ${info.name}`}
          aria-pressed=${info.on ? 'true' : 'false'}
          ?disabled=${info.unavailable}
          @click=${() => this._toggle(ids)}
        >
          ${info.name}
        </button>
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
        ${cols.color || cols.scenes || cols.lights
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
              ${cols.lights
                ? hasLights
                  ? html`<button
                      class="gl-action"
                      title=${t('show_lights')}
                      aria-label=${`${t('show_lights')}: ${info.name}`}
                      aria-haspopup="dialog"
                      @click=${(e: Event) => this._openLights(sub, info.name, e)}
                    >
                      <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
                    </button>`
                  : spacer
                : nothing}
            </div>`
          : nothing}
      </div>
    `;
  }

  /** Our own popup with the lights of a row that has no main entity. */
  protected _renderLightsDialog(d: DialogState, t: Localize): TemplateResult {
    return html`
      <div class="gl-rows gl-popup-rows">
        ${d.ids.map((id) => {
          const sub: NormalizedSubgroup = { key: id, entities: [id] };
          return this._renderSubRow(sub, this._subInfo(sub, t), NO_COLUMNS, t);
        })}
      </div>
    `;
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

  /** A row can show its lights when it has a main entity or several lights. */
  protected _hasLights(sub: NormalizedSubgroup): boolean {
    return !!sub.main || sub.entities.length > 1;
  }

  protected _openLights(sub: NormalizedSubgroup, title: string, ev: Event) {
    if (sub.main) {
      fireEvent(this, 'hass-more-info', { entityId: sub.main });
      return;
    }
    this._openDialog('lights', { title, ids: sub.entities }, ev);
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
