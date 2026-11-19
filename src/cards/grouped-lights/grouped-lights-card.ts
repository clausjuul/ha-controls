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
import {
  lastOn,
  lastSet,
  rememberOn,
  rememberSet,
  restoreData,
  setKey,
} from '../../shared/last-state';
import { styles as baseStyles } from '../light-slider/styles';
import {
  normalizeGrouped,
  type GroupedLightsCardConfig,
  type NormalizedGroup,
  type NormalizedSubgroup,
  type SceneChip,
} from './config';
import { styles } from './styles';
import { themeTokens } from '../../shared/theme';

export const GROUPED_TAG = 'ha-controls-grouped-lights-card';
export const GROUPED_EDITOR_TAG = 'ha-controls-grouped-lights-card-editor';

/** How long a set of lights must stay unchanged before it is remembered. */
const SETTLE_MS = 2000;
/** How far (px) a pointer moves sideways before a folded group is dragged. */
const DRAG_SLOP = 6;

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
  @state() protected _topScenes: SceneChip[] = [];
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
    const { groups, scenes, base } = normalizeGrouped(config);
    this._groups = groups;
    this._topScenes = scenes;
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
    const sceneIds = [...this._topScenes, ...this._groups.flatMap((g) => g.scenes)].map((s) => s.entity);
    // Lights shown in an expanded row may not be in the config.
    const shown = this._groups
      .flatMap((g) => g.subgroups)
      .filter((s) => this._expanded[s.key])
      .flatMap((s) => this._members(s));
    // A folded group's level comes from its single lights.
    const leaves = this._groups.flatMap((g) => this._leaves(this._groupIds(g)));
    return [...sceneIds, ...shown, ...leaves].some(
      (id) => old.states[id] !== this.hass!.states[id],
    );
  }

  /** Every entity a group's switch acts on. */
  protected _groupIds(g: NormalizedGroup): string[] {
    return [...new Set(g.subgroups.flatMap((s) => this._controlled(s)))];
  }

  // ------------------------------------------- dragging a folded group

  /** The folded group being dragged, and the level it's dragged to. */
  @state() protected _groupDrag?: { key: string; pct: number };
  protected _gd?: {
    key: string;
    pointerId: number;
    x: number;
    y: number;
    width: number;
    start: number;
    locked: boolean;
  };
  /** Swallow the click that follows a drag, so it doesn't hit a button. */
  protected _swallowClick = false;

  /** The lights in a group that are on and can be dimmed, and their average. */
  protected _groupLevel(g: NormalizedGroup): { ids: string[]; pct: number } {
    const on = this._available(this._leaves(this._groupIds(g))).filter(
      (s) => isOn(s) && this._dimmable(s),
    );
    const pct = on.length
      ? Math.round(on.reduce((sum, s) => sum + brightnessPct(s), 0) / on.length)
      : 0;
    return { ids: on.map((s) => s.entity_id), pct };
  }

  protected _onGroupDown(g: NormalizedGroup, ev: PointerEvent) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const level = this._groupLevel(g);
    if (!level.ids.length) return;
    this._gd = {
      key: g.key,
      pointerId: ev.pointerId,
      x: ev.clientX,
      y: ev.clientY,
      width: (ev.currentTarget as HTMLElement).getBoundingClientRect().width,
      start: level.pct,
      locked: false,
    };
  }

  protected _onGroupMove(ev: PointerEvent) {
    const d = this._gd;
    if (!d || ev.pointerId !== d.pointerId) return;
    const dx = ev.clientX - d.x;
    const dy = ev.clientY - d.y;
    if (!d.locked) {
      if (Math.abs(dx) <= DRAG_SLOP || Math.abs(dx) <= Math.abs(dy)) return;
      d.locked = true;
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    }
    const pct = Math.round(
      Math.min(100, Math.max(0, d.start + (d.width > 0 ? (dx / d.width) * 100 : 0))),
    );
    if (this._groupDrag?.pct !== pct) this._groupDrag = { key: d.key, pct };
  }

  protected _onGroupUp(g: NormalizedGroup, ev: PointerEvent) {
    const d = this._gd;
    if (!d || ev.pointerId !== d.pointerId) return;
    this._gd = undefined;
    const target = ev.currentTarget as HTMLElement;
    if (target.hasPointerCapture(ev.pointerId)) target.releasePointerCapture(ev.pointerId);
    const drag = this._groupDrag;
    this._groupDrag = undefined;
    if (!d.locked || !drag || ev.type === 'pointercancel') return;
    this._swallowClick = true;
    window.setTimeout(() => (this._swallowClick = false), 0);
    this._shiftGroup(g, drag.pct - d.start);
  }

  /**
   * Move the brightness of a group's lights that are on by the same amount,
   * so their differences stay. Down to nothing turns them off.
   */
  protected _shiftGroup(g: NormalizedGroup, delta: number) {
    if (!delta) return;
    const { ids, pct } = this._groupLevel(g);
    if (!ids.length) return;
    if (pct + delta <= 0) {
      this._setBrightness(ids, 0);
      return;
    }
    const byLevel = new Map<number, string[]>();
    for (const id of ids) {
      const s = this._state(id)!;
      const next = Math.round(Math.min(100, Math.max(1, brightnessPct(s) + delta)));
      byLevel.set(next, [...(byLevel.get(next) ?? []), id]);
    }
    for (const [level, group] of byLevel) this._setBrightness(group, level);
  }

  /** Stops the page scrolling once a folded group is being dragged sideways. */
  protected _onGroupTouchMove = {
    handleEvent: (ev: TouchEvent) => {
      if (this._gd?.locked && ev.cancelable) ev.preventDefault();
    },
    passive: false,
  };

  protected _onGroupClickCapture = (ev: Event) => {
    if (!this._swallowClick) return;
    this._swallowClick = false;
    ev.stopPropagation();
    ev.preventDefault();
  };

  protected willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!changed.has('hass') || !this.hass || !this._groups) return;
    const old = changed.get('hass') as HomeAssistant | undefined;
    for (const ids of this._restorable()) {
      const leaves = this._leaves(ids);
      if (!leaves.some((id) => this.hass!.states[id] !== old?.states[id])) continue;
      for (const id of leaves) rememberOn(this.hass.states[id]);
      // Lights report one by one when a set turns off, so only remember a set
      // once it has settled; one that ends up all off keeps the earlier memory.
      const key = setKey(leaves);
      window.clearTimeout(this._setTimers.get(key));
      this._setTimers.set(
        key,
        window.setTimeout(() => {
          this._setTimers.delete(key);
          this._rememberSet(leaves);
        }, SETTLE_MS),
      );
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const timer of this._setTimers.values()) window.clearTimeout(timer);
    this._setTimers.clear();
  }

  protected _setTimers = new Map<string, number>();

  /** Remember which of these lights are on, if any are. */
  protected _rememberSet(leaves: string[]) {
    if (!this.hass) return;
    const on = leaves.filter((id) => isOn(this.hass!.states[id]));
    if (on.length) rememberSet(setKey(leaves), on);
  }

  /** Sets of lights that turn back on the way they were: groups and rows. */
  protected _restorable(): string[][] {
    return this._groups!.flatMap((g) => [
      [...new Set(g.subgroups.flatMap((s) => this._controlled(s)))],
      ...g.subgroups.map((s) => this._controlled(s)),
    ]);
  }

  /** The single lights behind some entities: a light group's members, or the entity itself. */
  protected _leaves(ids: string[]): string[] {
    const out = new Set<string>();
    for (const id of ids) {
      const attr = this.hass!.states[id]?.attributes.entity_id;
      const members = Array.isArray(attr)
        ? attr.filter(
            (m): m is string =>
              typeof m === 'string' && DOMAINS.includes(m.split('.')[0]) && !!this.hass!.states[m],
          )
        : [];
      for (const m of members.length ? members : [id]) out.add(m);
    }
    return [...out];
  }

  /**
   * Turning a group or row on brings back the lights that were on the last
   * time, each with its own brightness and colour. Without a memory (or with
   * one light) everything turns on as before.
   */
  protected _toggle(ids: string[]) {
    const states = this._available(ids);
    const leaves = this._leaves(ids);
    if (!states.length) return;
    if (states.some(isOn)) {
      // Turning off: remember the set as it is now, before it starts changing.
      const key = setKey(leaves);
      window.clearTimeout(this._setTimers.get(key));
      this._setTimers.delete(key);
      this._rememberSet(leaves);
      return super._toggle(ids);
    }
    const available = new Set(this._available(leaves).map((s) => s.entity_id));
    const remembered = (lastSet(setKey(leaves)) ?? []).filter((id) => available.has(id));
    if (leaves.length < 2 || !remembered.length) return super._toggle(ids);

    const lights = new Map<string, { data: Record<string, unknown>; ids: string[] }>();
    const others: string[] = [];
    // Light groups among `ids` turn on with their members.
    for (const st of states) {
      if (this._leaves([st.entity_id]).some((id) => remembered.includes(id))) {
        this._expect(st.entity_id, { state: 'on' });
      }
    }
    for (const id of remembered) {
      this._expect(id, { state: 'on' });
      if (!id.startsWith('light.')) {
        others.push(id);
        continue;
      }
      const data = restoreData(lastOn(id));
      const key = JSON.stringify(data);
      const entry = lights.get(key) ?? { data, ids: [] };
      entry.ids.push(id);
      lights.set(key, entry);
    }
    for (const { data, ids: group } of lights.values()) {
      this.hass!.callService('light', 'turn_on', { ...data, entity_id: group });
    }
    if (others.length) this._callOnOff('turn_on', others);
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
    const anyOn = on.length > 0;
    const allIds = [...new Set(g.subgroups.flatMap((s) => this._controlled(s)))];
    const color = lightColor(on.map((r) => r.info.state).find(isOn));
    const label = anyOn ? t('room_off') : t('room_on');
    const name = g.name ?? t('lights');
    const open = this._isGroupOpen(g, anyOn);
    const heading = html`<span class="gl-title">${name}</span>`;
    // Folded, the group is one wide slider for the lights that are on.
    const level = open ? undefined : this._groupLevel(g);
    const dimmable = !!level?.ids.length;
    const shownPct =
      this._groupDrag?.key === g.key ? this._groupDrag.pct : (level?.pct ?? 0);

    return html`
      <section
        class="gl-group ${dimmable ? 'dimmable' : ''} ${this._groupDrag?.key === g.key
          ? 'dragging'
          : ''}"
        aria-label=${name}
        style=${this._lightStyle(color)}
        @pointerdown=${dimmable ? (e: PointerEvent) => this._onGroupDown(g, e) : nothing}
        @pointermove=${dimmable ? (e: PointerEvent) => this._onGroupMove(e) : nothing}
        @pointerup=${dimmable ? (e: PointerEvent) => this._onGroupUp(g, e) : nothing}
        @pointercancel=${dimmable ? (e: PointerEvent) => this._onGroupUp(g, e) : nothing}
        @touchmove=${dimmable ? this._onGroupTouchMove : nothing}
        @click=${{ handleEvent: this._onGroupClickCapture, capture: true }}
      >
        ${dimmable
          ? html`<div class="gl-level" style="width: ${shownPct}%" aria-hidden="true"></div>`
          : nothing}
        <div class="gl-header ${anyOn ? 'on' : ''}" style=${this._lightStyle(color)}>
          <button
            class="icon"
            title=${label}
            aria-label=${`${label}: ${name}`}
            ?disabled=${!available.length}
            @click=${() => this._toggleGroup(g, open, allIds)}
          >
            <ha-icon .icon=${g.icon ?? defaultIcon(anyOn, true)}></ha-icon>
          </button>
          ${g.collapsible
            ? html`<button
                class="gl-heading gl-fold ${open ? 'open' : ''}"
                aria-expanded=${open ? 'true' : 'false'}
                aria-label=${`${t('expand')}: ${name}`}
                @click=${() => {
                  this._groupOpen[g.key] = !open;
                  this.requestUpdate();
                }}
              >
                ${heading}
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>`
            : html`<div class="gl-heading">${heading}</div>`}
          <button
            class="switch ${anyOn ? 'on' : ''}"
            role="switch"
            aria-checked=${anyOn ? 'true' : 'false'}
            aria-label=${`${t('toggle')}: ${name}`}
            ?disabled=${!available.length}
            @click=${() => this._toggleGroup(g, open, allIds)}
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
  protected _renderSceneRow(chips: SceneChip[], t: Localize, room?: string): TemplateResult {
    const scenes = chips
      .map((c) => ({ c, s: this._state(c.entity) }))
      .filter((x): x is { c: SceneChip; s: HassEntity } => !!x.s);
    return html`
      <div class="gl-scenes" role="group" aria-label=${t('scenes')}>
        ${scenes.map(
          ({ c, s }) => {
            const style = this._sceneStyle(s, c.color, '--gl-scene');
            return html`<button
              class="gl-scene ${style ? 'colored' : ''} ${c.showIcon ? '' : 'no-icon'}"
              style=${style ?? nothing}
              ?disabled=${s.state === 'unavailable'}
              @click=${() => this._activateScene(s)}
            >
              ${c.showIcon ? html`<ha-icon .icon=${c.icon ?? s.attributes.icon ?? 'mdi:palette'}></ha-icon>` : nothing}
              <span>${c.name ?? withoutRoomName(String(s.attributes.friendly_name ?? s.entity_id), room)}</span>
            </button>`;
          },
        )}
      </div>
    `;
  }

  /**
   * Whether a group shows its scenes and rows. A group folded by hand stays
   * that way until it turns on or off; with `collapse_off` an off group folds in.
   * Turning it on or off with its own switch keeps it as it is.
   */
  protected _isGroupOpen(g: NormalizedGroup, anyOn: boolean): boolean {
    if (!g.collapsible) return true;
    const was = this._groupWasOn[g.key];
    this._groupWasOn[g.key] = anyOn;
    if (was !== undefined && was !== anyOn) {
      if (this._keepFold.has(g.key)) this._keepFold.delete(g.key);
      else delete this._groupOpen[g.key];
    }
    return this._groupOpen[g.key] ?? !(g.collapseOff && !anyOn);
  }

  /** Groups switched from the card, whose fold survives the on/off change. */
  protected _keepFold = new Set<string>();

  /** The group's switch: turn it on/off without folding it in or out. */
  protected _toggleGroup(g: NormalizedGroup, open: boolean, ids: string[]) {
    if (g.collapsible) {
      this._groupOpen[g.key] = open;
      this._keepFold.add(g.key);
    }
    this._toggle(ids);
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
              relative
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
              @slider-tap=${() => this._toggle(ids)}
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
