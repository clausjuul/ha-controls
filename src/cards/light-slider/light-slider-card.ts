import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from '../../shared/types';
import { localize, type Localize } from '../../shared/localize';
import {
  brightnessPct,
  defaultIcon,
  entityIcon,
  isOn,
  isUnavailable,
  isLightColor,
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
  hsToRgb,
  kelvinToRgb,
  rgbCss,
  saturationGradient,
} from '../../shared/color';
import {
  normalizeConfig,
  type Group,
  type LightEntityConfig,
  type LightSliderCardConfig,
  type NormalizedConfig,
} from './config';
import { styles } from './styles';
import { OptimisticStates, type Patch } from '../../shared/optimistic';
import { lastOn, rememberOn } from '../../shared/last-state';

export const CARD_TAG = 'ha-controls-light-slider-card';
export const EDITOR_TAG = 'ha-controls-light-slider-card-editor';

const ICON_COLOR = 'mdi:palette';
const ICON_SCENES = 'mdi:creation';

/** What a row's colour / scene buttons act on. */
interface Target {
  title: string;
  /** Lights that colour and brightness changes apply to. */
  ids: string[];
  /** Lights whose scenes are listed (defaults to `ids`). */
  sceneIds?: string[];
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
  /** Text under the name; only used when there is no slider. */
  secondary: string;
  /** Text inside the slider when the light is off / unavailable. */
  emptyText?: string;
  /** Right-aligned text inside the slider. */
  endText?: string;
  brightness?: number; // undefined = no slider
  color?: string;
  /** The light's colour is pale, so text on the slider fill must be dark. */
  lightFill?: boolean;
  target: Target;
  /** Show the chevron that expands the individual lights (group main row). */
  expander?: { expanded: boolean; onExpand: () => void };
  sub?: boolean;
  onToggle: () => void;
  onBrightness: (pct: number) => void;
}

export class LightSliderCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: NormalizedConfig;
  /** Which groups show their individual lights, by group key. */
  @state() private _expanded: Readonly<Record<string, boolean>> = {};
  @state() private _dialog?: DialogState;
  /** Hue/saturation picked in the colour popup, until Home Assistant catches up. */
  @state() private _popupHs?: [number, number];
  @state() private _colorTab?: 'white' | 'color';
  @query('dialog') private _dialogEl?: HTMLDialogElement;

  /** Expected states after our own service calls, so the UI reacts instantly. */
  private _optimistic = new OptimisticStates(() => this.requestUpdate());
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
    this._optimistic.clear();
    this._watchPosition(false);
  }

  setConfig(config: LightSliderCardConfig): void {
    this._config = normalizeConfig(config);
    this._expanded = Object.fromEntries(this._config.groups.map((g) => [g.key, g.expanded]));
  }

  getCardSize(): number {
    if (!this._config) return 1;
    let size = this._config.mode === 'room' && this._config.name ? 1 : 0;
    for (const g of this._config.groups) {
      size += 2 + (g.entities.length > 1 && this._expanded[g.key] ? g.entities.length * 2 : 0);
    }
    return size;
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
    return this._config.entityIds.some((id) => old.states[id] !== this.hass!.states[id]);
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('hass') && this.hass && this._config) {
      const old = changed.get('hass') as HomeAssistant | undefined;
      for (const id of this._config.entityIds) {
        const s = this.hass.states[id];
        if (s !== old?.states[id]) rememberOn(s);
      }
      this._optimistic.reconcile(this.hass.states);
    }
  }

  /**
   * Record what we expect a light to look like after a call. A light that is
   * off gets its last known look as a hint, so it doesn't flash 100 % / the
   * default colour while turning on.
   */
  private _expect(id: string, patch: Patch) {
    const base = this.hass!.states[id];
    if (!base) return;
    const hints = patch.state === 'on' && base.state !== 'on' ? lastOn(id) : undefined;
    this._optimistic.set(base, hints ? { ...patch, hints } : patch);
  }

  /** An entity's state, including changes we've just asked for. */
  private _state(id: string): HassEntity | undefined {
    return this._optimistic.get(this.hass!.states[id]);
  }

  protected updated(): void {
    const dialog = this._dialogEl;
    if (!dialog) return;
    if (this._dialog && !dialog.open) {
      dialog.showModal();
      this._watchPosition(true);
    } else if (!this._dialog && dialog.open) {
      dialog.close();
    }
    if (!this._dialog) this._watchPosition(false);
    this._position();
  }

  // ------------------------------------------------------- popup position

  /** The row whose button opened the popup. */
  private _anchor?: HTMLElement;
  private _resizeObserver?: ResizeObserver;
  private _reposition = () => this._position();

  private _watchPosition(on: boolean) {
    if (on) {
      if (this._resizeObserver) return;
      this._resizeObserver = new ResizeObserver(this._reposition);
      if (this._dialogEl) this._resizeObserver.observe(this._dialogEl);
      window.addEventListener('resize', this._reposition);
      window.addEventListener('scroll', this._reposition, true);
    } else if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
      window.removeEventListener('resize', this._reposition);
      window.removeEventListener('scroll', this._reposition, true);
    }
  }

  /**
   * Place the popup next to the card: below the row that opened it, above it
   * if there's no room, otherwise as close as the screen allows.
   */
  private _position() {
    const dialog = this._dialogEl;
    const card = this.renderRoot.querySelector('ha-card');
    if (!dialog?.open || !card) return;

    // Sizes in rem, so the popup scales with the html font size like the card.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardRect = card.getBoundingClientRect();
    const anchor = (this._anchor?.isConnected ? this._anchor : card).getBoundingClientRect();

    const width = Math.min(
      vw - 2 * margin,
      Math.max(23 * rem, Math.min(cardRect.width, 31.5 * rem)),
    );
    const left = Math.min(
      vw - width - margin,
      Math.max(margin, cardRect.left + (cardRect.width - width) / 2),
    );
    dialog.style.width = `${width}px`;
    dialog.style.left = `${left}px`;

    const height = dialog.offsetHeight;
    let top: number;
    if (anchor.bottom + margin + height <= vh - margin) top = anchor.bottom + margin;
    else if (anchor.top - margin - height >= margin) top = anchor.top - margin - height;
    else top = Math.max(margin, Math.min(vh - height - margin, anchor.top));
    dialog.style.top = `${top}px`;
  }

  // ---------------------------------------------------------------- render

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const t = localize(this.hass);
    const cfg = this._config;

    return html`
      <ha-card class="${cfg.mode} ${cfg.compact ? 'compact' : ''}">
        ${cfg.mode === 'room'
          ? html`${this._renderRoomHeader(t)}
              <div class="items">${cfg.groups.map((g) => this._renderGroup(g, t))}</div>`
          : this._renderGroup(cfg.groups[0], t)}
      </ha-card>
      ${this._renderDialog(t)}
    `;
  }

  private _renderRoomHeader(t: Localize): TemplateResult | typeof nothing {
    const cfg = this._config!;
    if (cfg.compact) return this._renderRoomHeaderCompact(t);
    if (!cfg.name) return nothing;
    const available = this._available(cfg.entityIds);
    const anyOn = available.some(isOn);
    const label = anyOn ? t('room_off') : t('room_on');
    return html`
      <div class="room-header">
        <span class="room-name">${cfg.name}</span>
        <button
          class="action power ${anyOn ? 'on' : ''}"
          title=${label}
          aria-label=${label}
          ?disabled=${!available.length}
          @click=${() => this._toggle(cfg.entityIds)}
        >
          <ha-icon icon="mdi:power"></ha-icon>
        </button>
      </div>
    `;
  }

  /** Compact room heading: icon (toggles the room), name, brightness and count. */
  private _renderRoomHeaderCompact(t: Localize): TemplateResult {
    const cfg = this._config!;
    const available = this._available(cfg.entityIds);
    const on = available.filter(isOn);
    const dimOn = on.filter(this._dimmable);
    const anyOn = on.length > 0;
    let pct = 0;
    if (dimOn.length) pct = Math.round(dimOn.reduce((sum, s) => sum + brightnessPct(s), 0) / dimOn.length);
    else if (anyOn) pct = 100;
    const name = cfg.name ?? t('lights');
    const secondary = !available.length
      ? t('unavailable')
      : anyOn
        ? `${pct}% · ${t('lights_on_short', { on: on.length, total: available.length })}`
        : t('off');
    const label = anyOn ? t('room_off') : t('room_on');
    const color = lightColor(on[0]);

    return html`
      <div
        class="room-header compact ${anyOn ? 'on' : ''}"
        style=${color ? `--hac-light-color: ${color}` : ''}
      >
        <button
          class="icon"
          title=${label}
          aria-label=${label}
          ?disabled=${!available.length}
          @click=${() => this._toggle(cfg.entityIds)}
        >
          <ha-icon .icon=${cfg.icon ?? defaultIcon(anyOn, true)}></ha-icon>
        </button>
        <div class="info">
          <span class="room-name">${name}</span>
          <span class="secondary">${secondary}</span>
        </div>
      </div>
    `;
  }

  /** One slider: a single light, or several lights that can be expanded. */
  private _renderGroup(group: Group, t: Localize): TemplateResult {
    if (group.main) return this._renderWithMain(group, group.main, t);
    return group.entities.length === 1
      ? this._renderSingle(group, t)
      : this._renderMulti(group, t);
  }

  /** The top slider controls one main light; the other lights are its children. */
  private _renderWithMain(group: Group, main: string, t: Localize): TemplateResult {
    const s = this._state(main);
    if (!s) return this._renderMissing(main, t);
    const children = group.entities;
    const childIds = children.map((c) => c.entity);
    const available = this._available(childIds);
    const on = available.filter(isOn);
    const name = group.name ?? s.attributes.friendly_name ?? main;
    const expanded = !!this._expanded[group.key];

    return html`
      <div class="group">
        ${this._renderRow({
          ...this._lightRowBase(s, { entity: main }, t),
          key: group.key,
          name,
          icon:
            group.icon ??
            (s.attributes.icon || !children.length ? entityIcon(s) : defaultIcon(isOn(s), true)),
          endText:
            on.length > 0 && on.length < available.length
              ? t('lights_on', { on: on.length, total: available.length })
              : undefined,
          target: {
            title: name,
            ids: [main],
            sceneIds: [main, ...childIds],
            sceneOverride: group.scenes,
          },
          expander: children.length
            ? {
                expanded,
                onExpand: () => (this._expanded = { ...this._expanded, [group.key]: !expanded }),
              }
            : undefined,
        })}
        ${expanded && children.length
          ? html`<div class="lights">${children.map((c) => this._renderSubLight(c, t))}</div>`
          : nothing}
      </div>
    `;
  }

  private _renderSingle(group: Group, t: Localize): TemplateResult {
    const conf = group.entities[0];
    const s = this._state(conf.entity);
    if (!s) return this._renderMissing(conf.entity, t);
    const name = group.name ?? conf.name ?? s.attributes.friendly_name ?? conf.entity;

    return this._renderRow({
      ...this._lightRowBase(s, conf, t),
      key: group.key,
      name,
      icon: group.icon ?? conf.icon ?? entityIcon(s),
      target: { title: name, ids: [conf.entity], sceneOverride: group.scenes ?? conf.scenes },
    });
  }

  private _renderMulti(group: Group, t: Localize): TemplateResult {
    const confs = group.entities;
    const ids = confs.map((c) => c.entity);
    const states = ids
      .map((id) => this._state(id))
      .filter((s): s is HassEntity => !!s);
    const available = states.filter((s) => !isUnavailable(s));
    const on = available.filter(isOn);
    const dimmable = available.filter(this._dimmable);
    const dimmableOn = dimmable.filter(isOn);

    let brightness = 0;
    if (dimmableOn.length) {
      brightness = Math.round(
        dimmableOn.reduce((sum, s) => sum + brightnessPct(s), 0) / dimmableOn.length,
      );
    } else if (on.length) {
      brightness = 100;
    }

    const anyOn = on.length > 0;
    const count = t('lights_on', { on: on.length, total: available.length });
    const unavailable = available.length === 0;
    const name = group.name ?? t('lights');
    const expanded = !!this._expanded[group.key];

    return html`
      <div class="group">
        ${this._renderRow({
          key: group.key,
          name,
          icon: group.icon ?? defaultIcon(anyOn, true),
          on: anyOn,
          unavailable,
          secondary: unavailable ? t('unavailable') : count,
          emptyText: t('off'),
          // Only interesting when some, but not all, lights are on.
          endText:
            on.length > 0 && on.length < available.length
              ? t('lights_on', { on: on.length, total: available.length })
              : undefined,
          brightness: dimmable.length ? brightness : undefined,
          color: lightColor(on[0]),
          lightFill: isLightColor(on[0]),
          target: { title: name, ids, sceneOverride: group.scenes },
          expander: {
            expanded,
            onExpand: () => (this._expanded = { ...this._expanded, [group.key]: !expanded }),
          },
          onToggle: () => this._toggle(ids),
          onBrightness: (pct) => this._setBrightness(ids, pct),
        })}
        ${expanded
          ? html`<div class="lights">${confs.map((c) => this._renderSubLight(c, t))}</div>`
          : nothing}
      </div>
    `;
  }

  private _renderSubLight(conf: LightEntityConfig, t: Localize): TemplateResult {
    const s = this._state(conf.entity);
    if (!s) return this._renderMissing(conf.entity, t);
    const name = conf.name ?? s.attributes.friendly_name ?? conf.entity;

    return this._renderRow({
      ...this._lightRowBase(s, conf, t),
      key: conf.entity,
      name,
      icon: conf.icon ?? entityIcon(s),
      target: { title: name, ids: [conf.entity], sceneOverride: conf.scenes },
      sub: true,
    });
  }

  /** Row fields shared by single and sub-rows for one light. */
  private _lightRowBase(s: HassEntity, conf: LightEntityConfig, t: Localize) {
    const unavailable = isUnavailable(s);
    const on = isOn(s);
    const dimmable = this._dimmable(s);
    const pct = brightnessPct(s);

    let state: string;
    if (unavailable) state = t('unavailable');
    else if (!on) state = t('off');
    else state = t('on');

    return {
      on,
      unavailable,
      secondary: state,
      emptyText: unavailable ? t('unavailable') : t('off'),
      brightness: dimmable ? pct : undefined,
      color: lightColor(s),
      lightFill: isLightColor(s),
      onToggle: () => this._toggle([conf.entity]),
      onBrightness: (v: number) => this._setBrightness([conf.entity], v),
    };
  }

  private _renderRow(o: RowOptions): TemplateResult {
    const t = localize(this.hass);
    const hasColor = this._colorLights(o.target.ids).any;
    const hasScenes = this._config!.show_scenes && this._scenes(o.target).length > 0;
    const expandButton = (cls: string) =>
      html`<button
        class="${cls} expand ${o.expander!.expanded ? 'open' : ''}"
        aria-label=${t('expand')}
        aria-expanded=${o.expander!.expanded ? 'true' : 'false'}
        @click=${o.expander!.onExpand}
      >
        <ha-icon icon="mdi:chevron-down"></ha-icon>
      </button>`;
    const colorButton = () =>
      html`<button
        class="action"
        title=${t('color')}
        aria-label=${`${t('color')}: ${o.name}`}
        ?disabled=${o.unavailable}
        @click=${(e: Event) => this._openDialog('color', o.target, e)}
      >
        <ha-icon icon=${ICON_COLOR}></ha-icon>
      </button>`;
    const scenesButton = () =>
      html`<button
        class="action"
        title=${t('scenes')}
        aria-label=${`${t('scenes')}: ${o.name}`}
        @click=${(e: Event) => this._openDialog('scenes', o.target, e)}
      >
        <ha-icon icon=${ICON_SCENES}></ha-icon>
      </button>`;

    if (this._config!.compact) {
      return html`
        <div
          class="row compact ${o.sub ? 'sub' : ''} ${o.on ? 'on' : ''} ${o.lightFill
            ? 'light-fill'
            : ''}"
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
          <span
            class="name ${o.expander ? 'clickable' : ''}"
            title=${o.name}
            @click=${o.expander ? o.expander.onExpand : undefined}
            >${o.name}</span
          >
          ${o.brightness !== undefined
            ? html`<hac-slider
                show-value
                value-at="end"
                .thumb=${false}
                .value=${o.brightness}
                .min=${0}
                .max=${100}
                .emptyText=${o.emptyText ?? ''}
                .startText=${o.endText ?? ''}
                .label=${`${t('brightness')}: ${o.name}`}
                .formatValue=${(v: number) => `${v}%`}
                ?disabled=${o.unavailable}
                @value-changed=${(e: CustomEvent<{ value: number }>) =>
                  o.onBrightness(e.detail.value)}
              ></hac-slider>`
            : html`<button
                class="toggle-bar ${o.on ? 'on' : ''}"
                aria-pressed=${o.on ? 'true' : 'false'}
                aria-label=${`${t('toggle')}: ${o.name}`}
                ?disabled=${o.unavailable}
                @click=${o.onToggle}
              >
                <span class="toggle-end">${o.endText ?? ''}</span>
                <span class="toggle-text">
                  ${o.unavailable ? t('unavailable') : o.on ? t('on') : t('off')}
                </span>
              </button>`}
          ${hasColor ? colorButton() : nothing} ${hasScenes ? scenesButton() : nothing}
          ${o.expander ? expandButton('action') : nothing}
        </div>
      `;
    }

    return html`
      <div
        class="row ${o.sub ? 'sub' : ''} ${o.on ? 'on' : ''} ${o.lightFill ? 'light-fill' : ''}"
        style=${o.color ? `--hac-light-color: ${o.color}` : ''}
      >
        <div class="top">
          <button
            class="icon"
            title=${t('toggle')}
            aria-label=${`${t('toggle')}: ${o.name}`}
            ?disabled=${o.unavailable}
            @click=${o.onToggle}
          >
            <ha-icon .icon=${o.icon}></ha-icon>
          </button>
          <div
            class="info ${o.expander ? 'clickable' : ''}"
            @click=${o.expander ? o.expander.onExpand : undefined}
          >
            <span class="name">${o.name}</span>
          </div>
          <div class="actions">
            ${hasColor ? colorButton() : nothing} ${hasScenes ? scenesButton() : nothing}
          </div>
        </div>
        ${o.brightness !== undefined
          ? html`<div class="bottom">
              <hac-slider
                show-value
                .thumb=${false}
                .value=${o.brightness}
                .min=${0}
                .max=${100}
                .emptyText=${o.emptyText ?? ''}
                .endText=${o.endText ?? ''}
                .label=${`${t('brightness')}: ${o.name}`}
                .formatValue=${(v: number) => `${v}%`}
                ?disabled=${o.unavailable}
                @value-changed=${(e: CustomEvent<{ value: number }>) =>
                  o.onBrightness(e.detail.value)}
              ></hac-slider>
              ${o.expander ? expandButton('expand-tile') : nothing}
            </div>`
          : html`<div class="bottom">
              <button
                class="toggle-bar ${o.on ? 'on' : ''}"
                aria-pressed=${o.on ? 'true' : 'false'}
                aria-label=${`${t('toggle')}: ${o.name}`}
                ?disabled=${o.unavailable}
                @click=${o.onToggle}
              >
                <span class="toggle-text">
                  ${o.unavailable ? t('unavailable') : o.on ? t('on') : t('off')}
                </span>
                ${o.endText ? html`<span class="toggle-end">${o.endText}</span>` : nothing}
              </button>
              ${o.expander ? expandButton('expand-tile') : nothing}
            </div>`}
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

  private _openDialog(kind: DialogState['kind'], target: Target, ev: Event) {
    this._anchor = (ev.currentTarget as HTMLElement).closest<HTMLElement>('.row') ?? undefined;
    this._popupHs = undefined;
    this._colorTab = undefined;
    this._dialog = { kind, ...target };
  }

  private _closeDialog = () => {
    this._dialog = undefined;
    this._anchor = undefined;
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
            @click=${() => this._activateScene(s)}
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
    const states = this._available(ids).filter(
      (st) => st.entity_id.startsWith('light.') && !cfg.toggleOnly.has(st.entity_id),
    );
    const ct = cfg.show_color_temp ? states.filter(supportsColorTemp) : [];
    const color = cfg.show_color ? states.filter(supportsColor) : [];
    return { ct, color, any: ct.length > 0 || color.length > 0 };
  }

  /** Scenes chosen in the config, or every scene that includes one of the lights. */
  private _scenes(target: Target): HassEntity[] {
    const states = this.hass!.states;
    if (target.sceneOverride) {
      return target.sceneOverride
        .map((id) => this._state(id))
        .filter((s): s is HassEntity => !!s);
    }
    const found: HassEntity[] = [];
    for (const id in states) {
      if (!id.startsWith('scene.')) continue;
      const s = this._state(id);
      const members = s?.attributes.entity_id;
      const lights = target.sceneIds ?? target.ids;
      if (Array.isArray(members) && lights.some((l) => members.includes(l))) found.push(s!);
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

  // -------------------------------------------------------------- services

  private _available(ids: string[]): HassEntity[] {
    return ids
      .map((id) => this._state(id))
      .filter((s): s is HassEntity => !!s && !isUnavailable(s));
  }

  private _toggle(ids: string[]) {
    const states = this._available(ids);
    if (!states.length) return;
    const turnOn = !states.some(isOn);
    for (const st of states) this._expect(st.entity_id, { state: turnOn ? 'on' : 'off' });
    this._callOnOff(turnOn ? 'turn_on' : 'turn_off', states.map((st) => st.entity_id));
  }

  private _setBrightness(ids: string[], pct: number) {
    const states = this._available(ids);
    if (!states.length) return;
    if (pct <= 0) {
      for (const st of states) this._expect(st.entity_id, { state: 'off' });
      this._callOnOff('turn_off', states.map((st) => st.entity_id));
      return;
    }
    const dimmable = states.filter(this._dimmable);
    const plain = states.filter((st) => !this._dimmable(st));
    const brightness = Math.round((pct / 100) * 255);
    for (const st of dimmable) {
      this._expect(st.entity_id, { state: 'on', attributes: { brightness } });
    }
    for (const st of plain) this._expect(st.entity_id, { state: 'on' });
    if (dimmable.length) {
      this.hass!.callService('light', 'turn_on', {
        entity_id: dimmable.map((st) => st.entity_id),
        brightness_pct: pct,
      });
    }
    if (plain.length) {
      this._callOnOff('turn_on', plain.map((st) => st.entity_id));
    }
  }

  /** Turn entities on/off: lights via `light`, switches etc. via `homeassistant`. */
  private _callOnOff(service: 'turn_on' | 'turn_off', ids: string[]) {
    const lights = ids.filter((id) => id.startsWith('light.'));
    const others = ids.filter((id) => !id.startsWith('light.'));
    if (lights.length) this.hass!.callService('light', service, { entity_id: lights });
    if (others.length) this.hass!.callService('homeassistant', service, { entity_id: others });
  }

  /** Can this entity's brightness be set from the card? */
  private _dimmable = (s: HassEntity): boolean =>
    s.entity_id.startsWith('light.') &&
    !this._config!.toggleOnly.has(s.entity_id) &&
    supportsBrightness(s);

  private _activateScene(scene: HassEntity) {
    const base = this.hass!.states[scene.entity_id];
    if (base) this._optimistic.set(base, { state: new Date().toISOString() }, { untilChanged: true });
    this.hass!.callService('scene', 'turn_on', { entity_id: scene.entity_id });
  }

  private _turnOn(ids: string[], data: Record<string, unknown>) {
    if (!ids.length) return;
    const attributes: Record<string, unknown> = {};
    if (typeof data.color_temp_kelvin === 'number') {
      const k = data.color_temp_kelvin;
      Object.assign(attributes, { color_mode: 'color_temp', color_temp_kelvin: k, rgb_color: kelvinToRgb(k) });
    }
    if (Array.isArray(data.hs_color)) {
      const [h, sat] = data.hs_color as [number, number];
      Object.assign(attributes, { color_mode: 'hs', hs_color: [h, sat], rgb_color: hsToRgb(h, sat) });
    }
    for (const id of ids) this._expect(id, { state: 'on', attributes });
    this.hass!.callService('light', 'turn_on', {
      entity_id: ids.length === 1 ? ids[0] : ids,
      ...data,
    });
  }
}
