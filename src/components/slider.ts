import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fireEvent } from '../shared/types';

/**
 * Horizontal slider shared by all ha-controls cards.
 *
 * Events:
 *  - `value-changing` while dragging ({ value })
 *  - `value-changed` when the user lets go / stops pressing keys ({ value })
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
  /** `fill` = bar fills up to the value. `cursor` = only a handle (for gradients). */
  @property({ reflect: true }) mode: 'fill' | 'cursor' = 'fill';
  @property() label = '';
  @property({ attribute: false }) formatValue?: (value: number) => string;

  /** Value chosen by the user that Home Assistant hasn't confirmed yet. */
  @state() private _pending?: number;
  @query('.track') private _track!: HTMLElement;

  private _dragging = false;
  private _pendingTimer?: number;
  private _keyTimer?: number;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._pendingTimer);
    window.clearTimeout(this._keyTimer);
  }

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
    this._dragging = true;
    this.toggleAttribute('dragging', true);
    this._setPending(this._valueFromPointer(ev));
    fireEvent(this, 'value-changing', { value: this._pending });
  }

  private _onPointerMove(ev: PointerEvent) {
    if (!this._dragging) return;
    const v = this._valueFromPointer(ev);
    if (v === this._pending) return;
    this._setPending(v);
    fireEvent(this, 'value-changing', { value: v });
  }

  private _onPointerUp(ev: PointerEvent) {
    if (!this._dragging) return;
    this._endDrag(ev);
    const value = this._pending ?? this.value;
    this._expirePending();
    fireEvent(this, 'value-changed', { value });
  }

  /** Browser took over (e.g. vertical scroll on touch): undo the change. */
  private _onPointerCancel(ev: PointerEvent) {
    if (!this._dragging) return;
    this._endDrag(ev);
    this._clearPending();
    fireEvent(this, 'value-changing', { value: undefined });
  }

  private _endDrag(ev: PointerEvent) {
    this._dragging = false;
    this.toggleAttribute('dragging', false);
    if (this._track.hasPointerCapture(ev.pointerId)) {
      this._track.releasePointerCapture(ev.pointerId);
    }
  }

  private _onKeyDown(ev: KeyboardEvent) {
    if (this.disabled) return;
    const big = Math.max(this.step, (this.max - this.min) / 10);
    const current = this._shown;
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

  protected render() {
    const value = this._shown;
    const range = this.max - this.min;
    const f = range > 0 ? (value - this.min) / range : 0;
    const pct = f * 100;
    const text = this.formatValue ? this.formatValue(value) : String(value);
    const hideThumb = this.mode === 'fill' && value <= this.min;

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
        <div
          class="thumb ${hideThumb ? 'hidden' : ''}"
          style="left: ${this.mode === 'fill'
            ? `max(6px, calc(${pct}% - 8px))`
            : `calc(8px + (100% - 16px) * ${f})`}"
        ></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --_height: var(--hac-slider-height, 36px);
      --_radius: var(--hac-slider-radius, 12px);
    }
    .track {
      position: relative;
      height: var(--_height);
      border-radius: var(--_radius);
      background: var(
        --hac-slider-track-background,
        color-mix(in srgb, var(--primary-text-color, #000) 12%, transparent)
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
      box-shadow: 0 0 0 2px var(--primary-color, #03a9f4);
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: var(--hac-slider-color, var(--primary-color, #03a9f4));
      transition: width 180ms ease-out;
    }
    .thumb {
      position: absolute;
      top: 50%;
      width: 4px;
      height: 50%;
      border-radius: 2px;
      transform: translate(-50%, -50%);
      background: var(--hac-slider-thumb-color, #fff);
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
      transition: left 180ms ease-out;
      pointer-events: none;
    }
    :host([mode='cursor']) .thumb {
      width: 6px;
      height: calc(100% - 8px);
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .thumb.hidden {
      opacity: 0;
    }
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
