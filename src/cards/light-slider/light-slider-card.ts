import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from '../../shared/types';
import { localize, type Localize } from '../../shared/localize';
import {
  brightnessPct,
  defaultIcon,
  isOn,
  isUnavailable,
  lightColor,
  supportsBrightness,
  supportsColor,
  supportsColorTemp,
} from '../../shared/light';
import { HUE_GRADIENT, kelvinGradient, saturationGradient } from '../../shared/color';
import {
  normalizeConfig,
  type LightEntityConfig,
  type LightSliderCardConfig,
  type NormalizedConfig,
} from './config';
import { styles } from './styles';

export const CARD_TAG = 'ha-controls-light-slider-card';
export const EDITOR_TAG = 'ha-controls-light-slider-card-editor';

interface RowOptions {
  key: string;
  name: string;
  icon: string;
  on: boolean;
  unavailable: boolean;
  secondary: string;
  brightness?: number; // undefined = no slider
  color?: string;
  expandable: boolean;
  expanded: boolean;
  sub?: boolean;
  onToggle: () => void;
  onBrightness: (pct: number) => void;
  onExpand: () => void;
}

export class LightSliderCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: NormalizedConfig;
  @state() private _expanded = false;
  @state() private _expandedLights: ReadonlySet<string> = new Set();
  /** Brightness shown while the user is dragging, keyed by row. */
  @state() private _live: Readonly<Record<string, number>> = {};

  static styles = styles;

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass: HomeAssistant): Partial<LightSliderCardConfig> {
    const light = Object.keys(hass.states).find((id) => id.startsWith('light.'));
    return { entities: light ? [light] : [] };
  }

  setConfig(config: LightSliderCardConfig): void {
    this._config = normalizeConfig(config);
    this._expanded = this._config.expanded;
  }

  getCardSize(): number {
    if (!this._config) return 1;
    return 1 + (this._expanded ? this._config.entities.length : 0);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    if (!this._config) return false;
    if (changed.size > 1 || !changed.has('hass')) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass) return true;
    if (old.locale?.language !== this.hass.locale?.language) return true;
    return this._config.entities.some(
      (e) => old.states[e.entity] !== this.hass!.states[e.entity],
    );
  }

  // ---------------------------------------------------------------- render

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const t = localize(this.hass);
    const lights = this._config.entities;

    return html`
      <ha-card>
        ${lights.length === 1 ? this._renderSingle(lights[0], t) : this._renderGroup(lights, t)}
      </ha-card>
    `;
  }

  private _renderSingle(conf: LightEntityConfig, t: Localize): TemplateResult {
    const s = this.hass!.states[conf.entity];
    if (!s) return this._renderMissing(conf.entity, t);
    const hasColor = this._hasColorControls(s);
    const cfg = this._config!;

    return html`
      ${this._renderRow({
        ...this._lightRowBase(s, conf, t),
        key: 'main',
        name: cfg.name ?? conf.name ?? s.attributes.friendly_name ?? conf.entity,
        icon: cfg.icon ?? conf.icon ?? s.attributes.icon ?? defaultIcon(isOn(s), false),
        expandable: hasColor,
        expanded: this._expanded,
        onExpand: () => (this._expanded = !this._expanded),
      })}
      ${hasColor && this._expanded
        ? html`<div class="details">${this._renderColorControls(s, t)}</div>`
        : nothing}
    `;
  }

  private _renderGroup(confs: LightEntityConfig[], t: Localize): TemplateResult {
    const cfg = this._config!;
    const ids = confs.map((c) => c.entity);
    const states = ids
      .map((id) => this.hass!.states[id])
      .filter((s): s is HassEntity => !!s);
    const available = states.filter((s) => !isUnavailable(s));
    const on = available.filter(isOn);
    const dimmable = available.filter(supportsBrightness);
    const dimmableOn = dimmable.filter(isOn);

    let brightness = 0;
    if (dimmableOn.length) {
      brightness = Math.round(
        dimmableOn.reduce((sum, s) => sum + brightnessPct(s), 0) / dimmableOn.length,
      );
    } else if (on.length) {
      brightness = 100;
    }

    const live = this._live.main;
    const shown = live ?? brightness;
    const anyOn = on.length > 0;
    const count = t('lights_on', { on: on.length, total: confs.length });
    const unavailable = available.length === 0;

    return html`
      ${this._renderRow({
        key: 'main',
        name: cfg.name ?? t('lights'),
        icon: cfg.icon ?? defaultIcon(anyOn, true),
        on: anyOn,
        unavailable,
        secondary: unavailable
          ? t('unavailable')
          : anyOn || live !== undefined
            ? `${count} · ${shown}%`
            : count,
        brightness: dimmable.length ? brightness : undefined,
        color: lightColor(on[0]),
        expandable: true,
        expanded: this._expanded,
        onToggle: () => this._toggle(ids),
        onBrightness: (pct) => this._setBrightness(ids, pct),
        onExpand: () => (this._expanded = !this._expanded),
      })}
      ${this._expanded
        ? html`<div class="details group">
            ${confs.map((c) => this._renderSubLight(c, t))}
          </div>`
        : nothing}
    `;
  }

  private _renderSubLight(conf: LightEntityConfig, t: Localize): TemplateResult {
    const s = this.hass!.states[conf.entity];
    if (!s) return this._renderMissing(conf.entity, t);
    const hasColor = this._hasColorControls(s);
    const open = this._expandedLights.has(conf.entity);

    return html`
      ${this._renderRow({
        ...this._lightRowBase(s, conf, t),
        key: conf.entity,
        name: conf.name ?? s.attributes.friendly_name ?? conf.entity,
        icon: conf.icon ?? s.attributes.icon ?? defaultIcon(isOn(s), false),
        sub: true,
        expandable: hasColor,
        expanded: open,
        onExpand: () => this._toggleLightExpanded(conf.entity),
      })}
      ${hasColor && open
        ? html`<div class="details sub">${this._renderColorControls(s, t)}</div>`
        : nothing}
    `;
  }

  /** Row fields shared by single and sub-rows for one light. */
  private _lightRowBase(s: HassEntity, conf: LightEntityConfig, t: Localize) {
    const key = this._config!.entities.length === 1 ? 'main' : conf.entity;
    const unavailable = isUnavailable(s);
    const on = isOn(s);
    const dimmable = supportsBrightness(s);
    const pct = brightnessPct(s);
    const live = this._live[key];

    let secondary: string;
    if (unavailable) secondary = t('unavailable');
    else if (live !== undefined) secondary = `${live}%`;
    else if (!on) secondary = t('off');
    else secondary = dimmable ? `${pct}%` : t('on');

    return {
      on,
      unavailable,
      secondary,
      brightness: dimmable ? pct : undefined,
      color: lightColor(s),
      onToggle: () => this._toggle([conf.entity]),
      onBrightness: (v: number) => this._setBrightness([conf.entity], v),
    };
  }

  private _renderRow(o: RowOptions): TemplateResult {
    const t = localize(this.hass);
    return html`
      <div
        class="row ${o.sub ? 'sub' : ''} ${o.on ? 'on' : ''}"
        style=${o.color ? `--hac-light-color: ${o.color}` : ''}
      >
        <button
          class="icon"
          title=${t('toggle')}
          aria-label=${`${t('toggle')}: ${o.name}`}
          ?disabled=${o.unavailable}
          @click=${o.onToggle}
        >
          <ha-icon .icon=${o.icon}></ha-icon>
        </button>
        <div class="content">
          <div
            class="header ${o.expandable ? 'clickable' : ''}"
            @click=${o.expandable ? o.onExpand : undefined}
          >
            <span class="name">${o.name}</span>
            <span class="secondary">${o.secondary}</span>
          </div>
          ${o.brightness !== undefined
            ? html`<hac-slider
                .value=${o.brightness}
                .min=${0}
                .max=${100}
                .label=${`${t('brightness')}: ${o.name}`}
                .formatValue=${(v: number) => `${v}%`}
                ?disabled=${o.unavailable}
                @value-changing=${(e: CustomEvent<{ value?: number }>) =>
                  this._setLive(o.key, e.detail.value)}
                @value-changed=${(e: CustomEvent<{ value: number }>) => {
                  this._setLive(o.key, undefined);
                  o.onBrightness(e.detail.value);
                }}
              ></hac-slider>`
            : nothing}
        </div>
        ${o.expandable
          ? html`<button
              class="expand ${o.expanded ? 'open' : ''}"
              aria-label=${t('expand')}
              aria-expanded=${o.expanded ? 'true' : 'false'}
              @click=${o.onExpand}
            >
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>`
          : o.sub
            ? html`<span class="expand-spacer"></span>`
            : nothing}
      </div>
    `;
  }

  private _renderColorControls(s: HassEntity, t: Localize): TemplateResult[] {
    const cfg = this._config!;
    const id = s.entity_id;
    const disabled = isUnavailable(s);
    const out: TemplateResult[] = [];

    if (cfg.show_color_temp && supportsColorTemp(s)) {
      const min: number = s.attributes.min_color_temp_kelvin ?? 2000;
      const max: number = s.attributes.max_color_temp_kelvin ?? 6500;
      const value: number = s.attributes.color_temp_kelvin ?? Math.round((min + max) / 2);
      out.push(html`
        <div class="control">
          <span class="label">${t('color_temp')}</span>
          <hac-slider
            mode="cursor"
            .min=${min}
            .max=${max}
            .step=${50}
            .value=${value}
            .label=${t('color_temp')}
            .formatValue=${(v: number) => `${v} K`}
            ?disabled=${disabled}
            style="--hac-slider-track-background: ${kelvinGradient(min, max)}"
            @value-changed=${(e: CustomEvent<{ value: number }>) =>
              this._turnOn(id, { color_temp_kelvin: e.detail.value })}
          ></hac-slider>
        </div>
      `);
    }

    if (cfg.show_color && supportsColor(s)) {
      const hs: [number, number] = s.attributes.hs_color ?? [0, 100];
      const [hue, sat] = [Math.round(hs[0]), Math.round(hs[1])];
      out.push(html`
        <div class="control">
          <span class="label">${t('hue')}</span>
          <hac-slider
            mode="cursor"
            .min=${0}
            .max=${360}
            .value=${hue}
            .label=${t('hue')}
            .formatValue=${(v: number) => `${v}°`}
            ?disabled=${disabled}
            style="--hac-slider-track-background: ${HUE_GRADIENT}"
            @value-changed=${(e: CustomEvent<{ value: number }>) =>
              this._turnOn(id, { hs_color: [e.detail.value, sat] })}
          ></hac-slider>
        </div>
        <div class="control">
          <span class="label">${t('saturation')}</span>
          <hac-slider
            mode="cursor"
            .min=${0}
            .max=${100}
            .value=${sat}
            .label=${t('saturation')}
            .formatValue=${(v: number) => `${v}%`}
            ?disabled=${disabled}
            style="--hac-slider-track-background: ${saturationGradient(hue)}"
            @value-changed=${(e: CustomEvent<{ value: number }>) =>
              this._turnOn(id, { hs_color: [hue, e.detail.value] })}
          ></hac-slider>
        </div>
      `);
    }
    return out;
  }

  private _renderMissing(entity: string, t: Localize): TemplateResult {
    return html`<div class="row missing">${t('not_found', { entity })}</div>`;
  }

  // --------------------------------------------------------------- helpers

  private _hasColorControls(s: HassEntity): boolean {
    const cfg = this._config!;
    return (
      (cfg.show_color_temp && supportsColorTemp(s)) || (cfg.show_color && supportsColor(s))
    );
  }

  private _toggleLightExpanded(id: string) {
    const next = new Set(this._expandedLights);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._expandedLights = next;
  }

  private _setLive(key: string, value: number | undefined) {
    const next = { ...this._live };
    if (value === undefined) delete next[key];
    else next[key] = value;
    this._live = next;
  }

  // -------------------------------------------------------------- services

  private _available(ids: string[]): HassEntity[] {
    return ids
      .map((id) => this.hass!.states[id])
      .filter((s): s is HassEntity => !!s && !isUnavailable(s));
  }

  private _toggle(ids: string[]) {
    const states = this._available(ids);
    if (!states.length) return;
    const service = states.some(isOn) ? 'turn_off' : 'turn_on';
    this.hass!.callService('light', service, { entity_id: states.map((s) => s.entity_id) });
  }

  private _setBrightness(ids: string[], pct: number) {
    const states = this._available(ids);
    if (!states.length) return;
    if (pct <= 0) {
      this.hass!.callService('light', 'turn_off', { entity_id: states.map((s) => s.entity_id) });
      return;
    }
    const dimmable = states.filter(supportsBrightness).map((s) => s.entity_id);
    const plain = states.filter((s) => !supportsBrightness(s)).map((s) => s.entity_id);
    if (dimmable.length) {
      this.hass!.callService('light', 'turn_on', { entity_id: dimmable, brightness_pct: pct });
    }
    if (plain.length) {
      this.hass!.callService('light', 'turn_on', { entity_id: plain });
    }
  }

  private _turnOn(id: string, data: Record<string, unknown>) {
    this.hass!.callService('light', 'turn_on', { entity_id: id, ...data });
  }
}
