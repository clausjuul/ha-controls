import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fireEvent } from '../shared/types';

/** How far (px) a pointer moves sideways before it counts as a drag. */
const SLOP = 6;

/**
 * Horizontal slider shared by all ha-controls cards.
 *
 * Events:
 *  - `value-changing` while dragging ({ value })
 *  - `value-changed` when the user lets go / stops pressing keys ({ value })
 *  - `slider-tap` when a `relative` slider is tapped (or Enter/Space)
 *
 * Once a drag has moved sideways, the page can't scroll until the finger
 * lets go, so a drag that drifts up or down keeps setting the value.
 *
 * CSS custom properties:
 *  --hac-slider-height, --hac-slider-radius,
 *  --hac-slider-color (fill), --hac-slider-track-background
 */
export class HacSlider extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * `fill` = bar fills up to the value. `cursor` = only a handle (for gradients).
   * `thin` = a thin rail with a round knob and the value beside it.
   */
  @property({ reflect: true }) mode: 'fill' | 'cursor' | 'thin' = 'fill';
  @property() label = '';
  @property({ attribute: false }) formatValue?: (value: number) => string;
  /** Show the formatted value inside the track (hidden at the minimum). */
  @property({ type: Boolean, attribute: 'show-value' }) showValue = false;
  /** Text shown inside the track when the value is at the minimum (e.g. "Off"). */
  @property() emptyText = '';
  /** Text shown right-aligned inside the track. */
  @property() endText = '';
  /** Text shown left-aligned inside the track (used when the value is at the end). */
  @property() startText = '';
  /** Where the value / empty text goes: `start` (default) or `end`. */
  @property({ attribute: 'value-at', reflect: true }) valueAt: 'start' | 'end' = 'start';
  /** Show the small handle. */
  @property({ type: Boolean }) thumb = true;
  /**
   * Dragging moves the value from where it was by how far the finger moves,
   * instead of jumping to the finger. A tap doesn't change the value; it
   * fires `slider-tap`.
   */
  @property({ type: Boolean, reflect: true }) relative = false;

  /** Value chosen by the user that Home Assistant hasn't confirmed yet. */
  @state() private _pending?: number;
  @query('.track') private _track!: HTMLElement;

  /** A pointer is down on the track. */
  private _active = false;
  /** The value is following the pointer. */
  private _dragging = false;
  /** The drag has gone sideways: the page mustn't scroll now. */
  private _locked = false;
  private _startX = 0;
  private _startY = 0;
  private _startValue = 0;
  private _pendingTimer?: number;
  private _keyTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    // Not passive, so a locked drag can stop the page from scrolling.
    this.addEventListener('touchmove', this._onTouchMove, { passive: false });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('touchmove', this._onTouchMove);
    window.clearTimeout(this._pendingTimer);
    window.clearTimeout(this._keyTimer);
  }

  private _onTouchMove = (ev: TouchEvent) => {
    if (this._locked && ev.cancelable) ev.preventDefault();
  };

  protected willUpdate(changed: PropertyValues<this>): void {
    // A new value from Home Assistant replaces the optimistic one.
    if (changed.has('value') && changed.get('value') !== undefined && !this._dragging) {
      this._clearPending();
    }
  }

  private get _shown(): number {
    return this._clamp(this._pending ?? this.value);
  }

  private _clamp(v: number): number {
    return Math.min(this.max, Math.max(this.min, v));
  }

  private _round(v: number): number {
    const step = this.step > 0 ? this.step : 1;
    return this._clamp(Math.round((v - this.min) / step) * step + this.min);
  }

  private _valueFromPointer(ev: PointerEvent): number {
    const rect = this._track.getBoundingClientRect();
    const f = rect.width > 0 ? (ev.clientX - rect.left) / rect.width : 0;
    return this._round(this.min + Math.min(1, Math.max(0, f)) * (this.max - this.min));
  }

  private _setPending(v: number) {
    window.clearTimeout(this._pendingTimer);
    this._pending = v;
  }

  private _clearPending() {
    window.clearTimeout(this._pendingTimer);
    this._pending = undefined;
  }

  /** Keep the optimistic value a few seconds, in case HA never reports a change. */
  private _expirePending() {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => (this._pending = undefined), 5000);
  }

  private _onPointerDown(ev: PointerEvent) {
    if (this.disabled || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    this._track.setPointerCapture(ev.pointerId);
    this._active = true;
    this._locked = false;
    this._startX = ev.clientX;
    this._startY = ev.clientY;
    this._startValue = this._shown;
    // A plain slider jumps to the finger straight away; a relative one waits
    // to see whether this is a tap or a drag.
    if (!this.relative) {
      this._startDrag();
      this._setPending(this._valueFromPointer(ev));
      fireEvent(this, 'value-changing', { value: this._pending });
    }
  }

  private _onPointerMove(ev: PointerEvent) {
    if (!this._active) return;
    const dx = ev.clientX - this._startX;
    const dy = ev.clientY - this._startY;
    if (!this._locked && Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) {
      this._locked = true;
      if (!this._dragging) this._startDrag();
    }
    if (!this._dragging) return;
    let v: number;
    if (this.relative) {
      const width = this._track.getBoundingClientRect().width;
      v = this._round(this._startValue + (width > 0 ? dx / width : 0) * (this.max - this.min));
    } else {
      v = this._valueFromPointer(ev);
    }
    if (v === this._pending) return;
    this._setPending(v);
    fireEvent(this, 'value-changing', { value: v });
  }

  private _onPointerUp(ev: PointerEvent) {
    if (!this._active) return;
    const dragged = this._dragging;
    this._endDrag(ev);
    if (!dragged) {
      // A relative slider: a tap, unless the pointer wandered off up or down.
      const moved = Math.hypot(ev.clientX - this._startX, ev.clientY - this._startY);
      if (moved <= SLOP * 2) fireEvent(this, 'slider-tap', {});
      return;
    }
    const value = this._pending ?? this.value;
    this._expirePending();
    fireEvent(this, 'value-changed', { value });
  }

  /** Browser took over (e.g. vertical scroll on touch): undo the change. */
  private _onPointerCancel(ev: PointerEvent) {
    if (!this._active) return;
    const dragged = this._dragging;
    this._endDrag(ev);
    if (!dragged) return;
    this._clearPending();
    fireEvent(this, 'value-changing', { value: undefined });
  }

  private _startDrag() {
    this._dragging = true;
    this.toggleAttribute('dragging', true);
  }

  private _endDrag(ev: PointerEvent) {
    this._active = false;
    this._dragging = false;
    this._locked = false;
    this.toggleAttribute('dragging', false);
    if (this._track.hasPointerCapture(ev.pointerId)) {
      this._track.releasePointerCapture(ev.pointerId);
    }
  }

  private _onKeyDown(ev: KeyboardEvent) {
    if (this.disabled) return;
    const big = Math.max(this.step, (this.max - this.min) / 10);
    const current = this._shown;
    if (this.relative && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      fireEvent(this, 'slider-tap', {});
      return;
    }
    let next: number;
    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + this.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - this.step;
        break;
      case 'PageUp':
        next = current + big;
        break;
      case 'PageDown':
        next = current - big;
        break;
      case 'Home':
        next = this.min;
        break;
      case 'End':
        next = this.max;
        break;
      default:
        return;
    }
    ev.preventDefault();
    next = this._round(next);
    this._setPending(next);
    fireEvent(this, 'value-changing', { value: next });
    // Debounce so holding an arrow key doesn't flood Home Assistant.
    window.clearTimeout(this._keyTimer);
    this._keyTimer = window.setTimeout(() => {
      this._expirePending();
      fireEvent(this, 'value-changed', { value: next });
    }, 400);
  }

  /**
   * Text inside the track. In fill mode it's drawn twice and clipped at the
   * edge of the fill, so each part has the right colour for what it sits on.
   */
  private _layered(text: string, side: 'start' | 'end', pct: number, cls = '') {
    if (this.mode !== 'fill') return html`<span class="text-layer ${side} ${cls}">${text}</span>`;
    return html`
      <span class="text-layer ${side} ${cls}" style="clip-path: inset(0 0 0 ${pct}%)">${text}</span>
      <span
        class="text-layer ${side} ${cls} on-fill"
        aria-hidden="true"
        style="clip-path: inset(0 ${100 - pct}% 0 0)"
        >${text}</span
      >
    `;
  }

  protected render() {
    const value = this._shown;
    const range = this.max - this.min;
    const f = range > 0 ? (value - this.min) / range : 0;
    const pct = f * 100;
    const text = this.formatValue ? this.formatValue(value) : String(value);
    const hideThumb = !this.thumb || (this.mode === 'fill' && value <= this.min);
    // Text sits on the fill once the fill is wide enough to hold it.
    const textOnFill = this.mode === 'fill' && f >= 0.2;

    if (this.mode === 'thin') {
      const off = value <= this.min;
      return html`
        <div class="thin">
          <div
            class="track"
            role="slider"
            tabindex=${this.disabled ? -1 : 0}
            aria-label=${this.label || nothing}
            aria-valuemin=${this.min}
            aria-valuemax=${this.max}
            aria-valuenow=${value}
            aria-valuetext=${off && this.emptyText ? this.emptyText : text}
            aria-disabled=${this.disabled ? 'true' : 'false'}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @keydown=${this._onKeyDown}
          >
            <div class="rail"></div>
            <div class="rail-fill" style="width: ${pct}%"></div>
            <div
              class="knob ${off ? 'off' : ''}"
              style="left: calc(${pct}% - ${f} * var(--_knob))"
            ></div>
          </div>
          ${this.showValue
            ? html`<span class="thin-value ${off ? 'empty' : ''}"
                >${off && this.emptyText ? this.emptyText : text}</span
              >`
            : nothing}
        </div>
      `;
    }

    return html`
      <div
        class="track"
        role="slider"
        tabindex=${this.disabled ? -1 : 0}
        aria-label=${this.label || nothing}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${value}
        aria-valuetext=${text}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
        @keydown=${this._onKeyDown}
      >
        ${this.mode === 'fill'
          ? html`<div class="fill" style="width: ${pct}%"></div>`
          : nothing}
        ${this.valueAt === 'end'
          ? html`${this.showValue && value > this.min
                ? this._layered(text, 'end', pct, 'strong')
                : this.emptyText && value <= this.min
                  ? this._layered(this.emptyText, 'end', pct)
                  : nothing}
              ${this.startText ? this._layered(this.startText, 'start', pct) : nothing}`
          : html`${this.showValue && value > this.min
                ? html`<span
                    class="value ${textOnFill ? 'on-fill' : ''}"
                    style=${textOnFill || this.mode !== 'fill'
                      ? ''
                      : `left: calc(${pct}% + 0.86rem)`}
                    >${text}</span
                  >`
                : this.emptyText && value <= this.min
                  ? html`<span class="value empty">${this.emptyText}</span>`
                  : nothing}
              ${this.endText ? this._layered(this.endText, 'end', pct) : nothing}`}
        <div
          class="thumb ${hideThumb ? 'hidden' : ''}"
          style="left: ${this.mode === 'fill'
            ? `max(0.43rem, calc(${pct}% - 0.57rem))`
            : `calc(0.57rem + (100% - 1.14rem) * ${f})`}"
        ></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --_height: var(--hac-slider-height, var(--control-slider-thickness, 2.571rem));
      --_radius: var(--hac-slider-radius, var(--hac-control-radius, 0.857rem));
    }
    .track {
      position: relative;
      height: var(--_height);
      border-radius: var(--_radius);
      background: var(
        --hac-slider-track-background,
        var(--hac-track, color-mix(in srgb, currentColor 15%, transparent))
      );
      overflow: hidden;
      cursor: pointer;
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      outline: none;
    }
    .track:focus-visible {
      box-shadow: 0 0 0 2px var(--hac-primary);
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: var(--hac-slider-color, var(--hac-primary));
      transition: width 180ms ease-out;
    }
    .thumb {
      position: absolute;
      top: 50%;
      width: var(--hac-space-1);
      height: 50%;
      border-radius: var(--hac-radius-s);
      transform: translate(-50%, -50%);
      background: var(--hac-slider-thumb-color, #fff);
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
      transition: left 180ms ease-out;
      pointer-events: none;
    }
    :host([mode='cursor']) .thumb {
      width: 0.429rem;
      height: calc(100% - var(--hac-space-2));
      border-radius: 0.214rem;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .thumb.hidden {
      opacity: 0;
    }
    .value {
      position: absolute;
      left: var(--hac-space-4);
      top: 50%;
      transform: translateY(-50%);
      font-size: var(--hac-font-size-m);
      font-weight: var(--hac-slider-value-weight, var(--hac-weight-medium));
      font-variant-numeric: tabular-nums;
      color: var(--hac-slider-value-color-track, var(--hac-text));
      pointer-events: none;
    }
    .value.on-fill {
      color: var(--hac-slider-value-color, #fff);
    }
    .value.empty {
      font-weight: var(--hac-weight-normal);
      color: var(--hac-text-secondary);
    }
    .text-layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      padding: 0 var(--hac-space-4);
      font-size: var(--hac-font-size-s);
      color: var(--hac-text-secondary);
      white-space: nowrap;
      pointer-events: none;
    }
    .text-layer.start {
      justify-content: flex-start;
    }
    .text-layer.end {
      justify-content: flex-end;
    }
    .text-layer.strong {
      font-size: var(--hac-font-size-m);
      font-weight: var(--hac-slider-value-weight, var(--hac-weight-medium));
      font-variant-numeric: tabular-nums;
      color: var(--hac-slider-value-color-track, var(--hac-text));
    }
    .text-layer.on-fill {
      color: var(--hac-slider-value-color, #fff);
    }
    /* ----- thin ----- */
    :host([mode='thin']) {
      --_knob: 1.143rem;
    }
    .thin {
      display: flex;
      align-items: center;
      gap: 0.429rem;
    }
    :host([mode='thin']) .track {
      flex: 1;
      min-width: 0;
      height: var(--hac-size-s);
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }
    :host([mode='thin']) .track:focus-visible {
      box-shadow: none;
      outline: 2px solid var(--hac-primary);
      outline-offset: 2px;
      border-radius: var(--hac-radius-s);
    }
    .rail,
    .rail-fill {
      position: absolute;
      left: 0;
      top: 50%;
      height: var(--hac-space-1);
      margin-top: -0.143rem;
      border-radius: var(--hac-radius-s);
    }
    .rail {
      right: 0;
      background: var(
        --hac-slider-track-background,
        var(--hac-track, color-mix(in srgb, currentColor 15%, transparent))
      );
    }
    .rail-fill {
      background: var(--hac-slider-color, var(--hac-primary));
      transition: width 180ms ease-out;
    }
    .knob {
      position: absolute;
      top: 50%;
      width: var(--_knob);
      height: var(--_knob);
      margin-top: calc(var(--_knob) / -2);
      border-radius: 50%;
      background: var(--hac-slider-color, var(--hac-primary));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
      transition: left 180ms ease-out;
      pointer-events: none;
    }
    .knob.off {
      background: color-mix(in srgb, var(--hac-text) 40%, transparent);
    }
    .thin-value {
      flex: none;
      width: 3rem;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: right;
      font-size: var(--hac-font-size-s);
      font-variant-numeric: tabular-nums;
      color: var(--hac-text);
      white-space: nowrap;
    }
    .thin-value.empty {
      color: var(--hac-text-secondary);
    }
    :host([dragging]) .rail-fill,
    :host([dragging]) .knob,
    :host([dragging]) .fill,
    :host([dragging]) .thumb {
      transition: none;
    }
    :host([disabled]) .track {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `;
}
