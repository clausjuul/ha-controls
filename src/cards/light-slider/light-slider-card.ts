import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state, query } from 'lit/decorators.js';
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
import {
  SWATCH_HUES,
  hsCss,
  hueDistance,
  kelvinGradient,
  kelvinPresets,
  kelvinToRgb,
  rgbCss,
  saturationGradient,
} from '../../shared/color';
import {
  normalizeConfig,
  type LightEntityConfig,
  type LightSliderCardConfig,
  type NormalizedConfig,
} from './config';
import { styles } from './styles';

export const CARD_TAG = 'ha-controls-light-slider-card';
export const EDITOR_TAG = 'ha-controls-light-slider-card-editor';

const ICON_COLOR = 'mdi:palette';
const ICON_SCENES = 'mdi:creation';

/** What a row's colour / scene buttons act on. */
interface Target {
  title: string;
  ids: string[];
  /** Scenes chosen in the config; undefined = find automatically. */
  sceneOverride?: string[];
}

interface DialogState extends Target {
  kind: 'color' | 'scenes';
}

interface RowOptions {
  key: string;
  name: string;
  icon: string;
  on: boolean;
  unavailable: boolean;
  secondary: string;
  brightness?: number; // undefined = no slider
  color?: string;
  target: Target;
  /** Part of a group: reserve space for every button so sliders line up. */
  aligned: boolean;
  /** Show the chevron that expands the individual lights (group main row). */
  expander?: { expanded: boolean; onExpand: () => void };
  sub?: boolean;
  onToggle: () => void;
  onBrightness: (pct: number) => void;
}

export class LightSliderCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: NormalizedConfig;
  @state() private _expanded = false;
  @state() private _dialog?: DialogState;
  /** Brightness shown while the user is dragging, keyed by row. */
  @state() private _live: Readonly<Record<string, number>> = {};
  /** Hue/saturation picked in the colour popup, until Home Assistant catches up. */
  @state() private _popupHs?: [number, number];
  @state() private _colorTab?: 'white' | 'color';
  @query('dialog') private _dialogEl?: HTMLDialogElement;

  private _popupHsTimer?: number;
  private _liveTimer?: number;
  private _lastLive = 0;

  static styles = styles;

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass: HomeAssistant): Partial<LightSliderCardConfig> {
    const light = Object.keys(hass.states).find((id) => id.startsWith('light.'));
    return { entities: light ? [light] : [] };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._popupHsTimer);
    window.clearTimeout(this._liveTimer);
  }

  setConfig(config: LightSliderCardConfig): void {
    this._config = normalizeConfig(config);
    this._expanded = this._config.expanded;
  }

  getCardSize(): number {
    if (!this._config) return 1;
    const lights = this._config.entities.length;
    return 1 + (lights > 1 && this._expanded ? lights : 0);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    if (!this._config) return false;
    if (changed.size > 1 || !changed.has('hass')) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass) return true;
    // An open popup may show scenes, so let every update through.
    if (this._dialog) return true;
    if (old.locale?.language !== this.hass.locale?.language) return true;
    return this._config.entities.some(
      (e) => old.states[e.entity] !== this.hass!.states[e.entity],
    );
  }

  protected updated(): void {
    const dialog = this._dialogEl;
    if (!dialog) return;
    if (this._dialog && !dialog.open) dialog.showModal();
    else if (!this._dialog && dialog.open) dialog.close();
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
      ${this._renderDialog(t)}
    `;
  }

  private _renderSingle(conf: LightEntityConfig, t: Localize): TemplateResult {
    const s = this.hass!.states[conf.entity];
    if (!s) return this._renderMissing(conf.entity, t);
    const cfg = this._config!;
    const name = cfg.name ?? conf.name ?? s.attributes.friendly_name ?? conf.entity;

    return this._renderRow({
      ...this._lightRowBase(s, conf, t),
      key: 'main',
      name,
      icon: cfg.icon ?? conf.icon ?? s.attributes.icon ?? defaultIcon(isOn(s), false),
      target: { title: name, ids: [conf.entity], sceneOverride: cfg.scenes ?? conf.scenes },
      aligned: false,
    });
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
    const name = cfg.name ?? t('lights');

    return html`
      ${this._renderRow({
        key: 'main',
        name,
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
        target: { title: name, ids, sceneOverride: cfg.scenes },
        aligned: true,
        expander: {
          expanded: this._expanded,
          onExpand: () => (this._expanded = !this._expanded),
        },
        onToggle: () => this._toggle(ids),
        onBrightness: (pct) => this._setBrightness(ids, pct),
      })}
      ${this._expanded
        ? html`<div class="lights">${confs.map((c) => this._renderSubLight(c, t))}</div>`
        : nothing}
    `;
  }

  private _renderSubLight(conf: LightEntityConfig, t: Localize): TemplateResult {
    const s = this.hass!.states[conf.entity];
    if (!s) return this._renderMissing(conf.entity, t);
    const name = conf.name ?? s.attributes.friendly_name ?? conf.entity;

    return this._renderRow({
      ...this._lightRowBase(s, conf, t),
      key: conf.entity,
      name,
      icon: conf.icon ?? s.attributes.icon ?? defaultIcon(isOn(s), false),
      target: { title: name, ids: [conf.entity], sceneOverride: conf.scenes },
      aligned: true,
      sub: true,
    });
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
    const hasColor = this._colorLights(o.target.ids).any;
    const hasScenes = this._config!.show_scenes && this._scenes(o.target).length > 0;
    const slot = (show: boolean, button: () => TemplateResult) =>
      show ? button() : o.aligned ? html`<span class="action-spacer"></span>` : nothing;

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
            class="header ${o.expander ? 'clickable' : ''}"
            @click=${o.expander ? o.expander.onExpand : undefined}
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
        <div class="actions">
          ${slot(
            hasColor,
            () => html`<button
              class="action"
              title=${t('color')}
              aria-label=${`${t('color')}: ${o.name}`}
              ?disabled=${o.unavailable}
              @click=${() => this._openDialog('color', o.target)}
            >
              <ha-icon icon=${ICON_COLOR}></ha-icon>
            </button>`,
          )}
          ${slot(
            hasScenes,
            () => html`<button
              class="action"
              title=${t('scenes')}
              aria-label=${`${t('scenes')}: ${o.name}`}
              @click=${() => this._openDialog('scenes', o.target)}
            >
              <ha-icon icon=${ICON_SCENES}></ha-icon>
            </button>`,
          )}
          ${o.expander
            ? html`<button
                class="action expand ${o.expander.expanded ? 'open' : ''}"
                aria-label=${t('expand')}
                aria-expanded=${o.expander.expanded ? 'true' : 'false'}
                @click=${o.expander.onExpand}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>`
            : o.sub
              ? html`<span class="action-spacer"></span>`
              : nothing}
        </div>
      </div>
    `;
  }

  private _renderMissing(entity: string, t: Localize): TemplateResult {
    return html`<div class="row missing">${t('not_found', { entity })}</div>`;
  }

  // ---------------------------------------------------------------- dialog

  private _renderDialog(t: Localize): TemplateResult {
    const d = this._dialog;
    return html`
      <dialog
        aria-label=${d ? `${t(d.kind)}: ${d.title}` : nothing}
        @close=${this._closeDialog}
        @click=${this._onDialogClick}
      >
        ${d
          ? html`<div class="sheet">
              <div class="sheet-header">
                <ha-icon icon=${d.kind === 'color' ? ICON_COLOR : ICON_SCENES}></ha-icon>
                <span class="sheet-title">${d.title}</span>
                <button class="action" aria-label=${t('close')} @click=${this._closeDialog}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
              <div class="sheet-body">
                ${d.kind === 'color' ? this._renderColorControls(d.ids, t) : this._renderScenes(d, t)}
              </div>
            </div>`
          : nothing}
      </dialog>
    `;
  }

  private _openDialog(kind: DialogState['kind'], target: Target) {
    this._popupHs = undefined;
    this._colorTab = undefined;
    this._dialog = { kind, ...target };
  }

  private _closeDialog = () => {
    this._dialog = undefined;
    this._popupHs = undefined;
    window.clearTimeout(this._liveTimer);
  };

  /** Clicks on the backdrop land on the <dialog> itself. */
  private _onDialogClick(ev: MouseEvent) {
    if (ev.target === ev.currentTarget) this._closeDialog();
  }

  private _renderColorControls(ids: string[], t: Localize): TemplateResult {
    const { ct, color } = this._colorLights(ids);
    const pickRef = (list: HassEntity[]) => list.find(isOn) ?? list[0];

    let whiteTab: TemplateResult | undefined;
    if (ct.length) {
      const ref = pickRef(ct);
      const min = Math.min(...ct.map((s) => s.attributes.min_color_temp_kelvin ?? 2000));
      const max = Math.max(...ct.map((s) => s.attributes.max_color_temp_kelvin ?? 6500));
      const value: number = ref.attributes.color_temp_kelvin ?? Math.round((min + max) / 2);
      const targets = ct.map((s) => s.entity_id);
      const inWhiteMode = ref.attributes.color_mode === 'color_temp' && isOn(ref);
      const presets = kelvinPresets(min, max);
      const step = presets.length > 1 ? (presets[1] - presets[0]) / 2 : 100;
      const pick = (k: number) => this._turnOn(targets, { color_temp_kelvin: k });

      whiteTab = html`
        <div class="swatches">
          ${presets.map(
            (k) => html`<button
              class="swatch ${inWhiteMode && Math.abs(k - value) < step ? 'active' : ''}"
              style="background: ${rgbCss(kelvinToRgb(k))}"
              aria-label=${`${k} K`}
              title=${`${k} K`}
              @click=${() => pick(k)}
            ></button>`,
          )}
        </div>
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
            style="--hac-slider-track-background: ${kelvinGradient(min, max)}"
            @value-changed=${(e: CustomEvent<{ value: number }>) => pick(e.detail.value)}
          ></hac-slider>
        </div>
      `;
    }

    let colorTab: TemplateResult | undefined;
    if (color.length) {
      const ref = pickRef(color);
      const refHs: [number, number] = ref.attributes.hs_color ?? [0, 100];
      const [hue, sat] = this._popupHs ?? [Math.round(refHs[0]), Math.round(refHs[1])];
      const targets = color.map((s) => s.entity_id);
      const inColorMode = ref.attributes.color_mode !== 'color_temp' && isOn(ref);
      const pick = (h: number, s: number) => {
        this._setPopupHs([h, s]);
        window.clearTimeout(this._liveTimer);
        this._turnOn(targets, { hs_color: [h, s] });
      };

      colorTab = html`
        <div class="swatches">
            ${SWATCH_HUES.map(
              (h) => html`<button
                class="swatch ${inColorMode && sat > 5 && hueDistance(h, hue) <= 6
                  ? 'active'
                  : ''}"
                style="background: ${hsCss(h, sat)}"
                aria-label=${`${t('hue')} ${h}°`}
                @click=${() => pick(h, sat)}
              ></button>`,
            )}
        </div>
        <hac-color-wheel
          .hue=${hue}
          .saturation=${sat}
          .label=${t('custom_color')}
          @value-changing=${(e: CustomEvent<{ hue: number; saturation: number }>) => {
            this._setPopupHs([e.detail.hue, e.detail.saturation]);
            this._applyLive(targets, [e.detail.hue, e.detail.saturation]);
          }}
          @value-changed=${(e: CustomEvent<{ hue: number; saturation: number }>) =>
            pick(e.detail.hue, e.detail.saturation)}
        ></hac-color-wheel>
        <div class="control">
          <span class="label">${t('saturation')}</span>
          <hac-slider
            mode="cursor"
            .min=${0}
            .max=${100}
            .value=${sat}
            .label=${t('saturation')}
            .formatValue=${(v: number) => `${v}%`}
            style="--hac-slider-track-background: ${saturationGradient(hue)}"
            @value-changing=${(e: CustomEvent<{ value?: number }>) => {
              if (e.detail.value !== undefined) this._setPopupHs([hue, e.detail.value]);
            }}
            @value-changed=${(e: CustomEvent<{ value: number }>) => pick(hue, e.detail.value)}
          ></hac-slider>
        </div>
      `;
    }
    if (!whiteTab || !colorTab) return whiteTab ?? colorTab ?? html``;

    const tab = this._colorTab ?? this._defaultColorTab(ids);
    return html`
      <div class="tabs" role="tablist">
        ${(['white', 'color'] as const).map(
          (k) => html`<button
            class="tab ${tab === k ? 'selected' : ''}"
            role="tab"
            aria-selected=${tab === k ? 'true' : 'false'}
            @click=${() => (this._colorTab = k)}
          >
            ${t(k === 'white' ? 'white' : 'hue')}
          </button>`,
        )}
      </div>
      ${tab === 'white' ? whiteTab : colorTab}
    `;
  }

  /** Open on the tab matching what the lights are doing now. */
  private _defaultColorTab(ids: string[]): 'white' | 'color' {
    const on = this._available(ids).find(isOn);
    const mode = on?.attributes.color_mode;
    return mode && mode !== 'color_temp' && mode !== 'brightness' && mode !== 'onoff' && mode !== 'white'
      ? 'color'
      : 'white';
  }

  private _renderScenes(target: Target, t: Localize): TemplateResult {
    const scenes = this._scenes(target);
    if (!scenes.length) return html`<div class="empty">${t('no_scenes')}</div>`;

    // A scene's state is the time it was last activated.
    let latest: HassEntity | undefined;
    for (const s of scenes) {
      const time = Date.parse(s.state);
      if (!Number.isNaN(time) && (!latest || time > Date.parse(latest.state))) latest = s;
    }

    return html`
      <div class="scenes">
        ${scenes.map(
          (s) => html`<button
            class="scene ${s === latest ? 'active' : ''}"
            ?disabled=${isUnavailable(s)}
            @click=${() => this.hass!.callService('scene', 'turn_on', { entity_id: s.entity_id })}
          >
            <ha-icon .icon=${s.attributes.icon ?? 'mdi:palette'}></ha-icon>
            <span>${s.attributes.friendly_name ?? s.entity_id}</span>
          </button>`,
        )}
      </div>
    `;
  }

  // --------------------------------------------------------------- helpers

  /** Lights among `ids` whose colour temperature / colour can be set. */
  private _colorLights(ids: string[]) {
    const cfg = this._config!;
    const states = this._available(ids);
    const ct = cfg.show_color_temp ? states.filter(supportsColorTemp) : [];
    const color = cfg.show_color ? states.filter(supportsColor) : [];
    return { ct, color, any: ct.length > 0 || color.length > 0 };
  }

  /** Scenes chosen in the config, or every scene that includes one of the lights. */
  private _scenes(target: Target): HassEntity[] {
    const states = this.hass!.states;
    if (target.sceneOverride) {
      return target.sceneOverride
        .map((id) => states[id])
        .filter((s): s is HassEntity => !!s);
    }
    const found: HassEntity[] = [];
    for (const id in states) {
      if (!id.startsWith('scene.')) continue;
      const s = states[id];
      const members = s?.attributes.entity_id;
      if (Array.isArray(members) && target.ids.some((l) => members.includes(l))) found.push(s!);
    }
    const name = (s: HassEntity) => String(s.attributes.friendly_name ?? s.entity_id);
    return found.sort((a, b) => name(a).localeCompare(name(b)));
  }

  private _setPopupHs(hs: [number, number]) {
    this._popupHs = hs;
    window.clearTimeout(this._popupHsTimer);
    this._popupHsTimer = window.setTimeout(() => (this._popupHs = undefined), 5000);
  }

  /** Update the lights while the wheel is dragged, at most every 300 ms. */
  private _applyLive(ids: string[], hs: [number, number]) {
    window.clearTimeout(this._liveTimer);
    const send = () => {
      this._lastLive = Date.now();
      this._turnOn(ids, { hs_color: hs });
    };
    const wait = 300 - (Date.now() - this._lastLive);
    if (wait <= 0) send();
    else this._liveTimer = window.setTimeout(send, wait);
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

  private _turnOn(ids: string[], data: Record<string, unknown>) {
    if (!ids.length) return;
    this.hass!.callService('light', 'turn_on', {
      entity_id: ids.length === 1 ? ids[0] : ids,
      ...data,
    });
  }
}
