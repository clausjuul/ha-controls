import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fireEvent } from '../shared/types';
import { hsCss } from '../shared/color';

export interface WheelValue {
  hue: number;
  saturation: number;
}

/**
 * Hue/saturation colour wheel. The angle sets the hue (red at the top,
 * clockwise) and the distance from the centre sets the saturation.
 *
 * Events: `value-changing` while dragging, `value-changed` on release
 * (detail: { hue, saturation }).
 */
export class HacColorWheel extends LitElement {
  @property({ type: Number }) hue = 0;
  @property({ type: Number }) saturation = 100;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() label = '';

  @state() private _pending?: WheelValue;
  @query('.wheel') private _wheel!: HTMLElement;

  private _dragging = false;
  private _pendingTimer?: number;
  private _keyTimer?: number;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._pendingTimer);
    window.clearTimeout(this._keyTimer);
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    const fromHass =
      (changed.has('hue') && changed.get('hue') !== undefined) ||
      (changed.has('saturation') && changed.get('saturation') !== undefined);
    if (fromHass && !this._dragging) this._clearPending();
  }

  private get _shown(): WheelValue {
    return this._pending ?? { hue: this.hue, saturation: this.saturation };
  }

  private _fromPointer(ev: PointerEvent): WheelValue {
    const rect = this._wheel.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = ev.clientX - (rect.left + radius);
    const dy = ev.clientY - (rect.top + radius);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const distance = radius > 0 ? Math.hypot(dx, dy) / radius : 0;
    return {
      hue: Math.round((angle + 360) % 360),
      saturation: Math.round(Math.min(1, distance) * 100),
    };
  }

  private _setPending(v: WheelValue) {
    window.clearTimeout(this._pendingTimer);
    this._pending = v;
  }

  private _clearPending() {
    window.clearTimeout(this._pendingTimer);
    this._pending = undefined;
  }

  private _expirePending() {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => (this._pending = undefined), 5000);
  }

  private _onPointerDown(ev: PointerEvent) {
    if (this.disabled || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    this._wheel.setPointerCapture(ev.pointerId);
    this._dragging = true;
    this.toggleAttribute('dragging', true);
    const v = this._fromPointer(ev);
    this._setPending(v);
    fireEvent(this, 'value-changing', v);
  }

  private _onPointerMove(ev: PointerEvent) {
    if (!this._dragging) return;
    const v = this._fromPointer(ev);
    const p = this._pending;
    if (p && p.hue === v.hue && p.saturation === v.saturation) return;
    this._setPending(v);
    fireEvent(this, 'value-changing', v);
  }

  private _onPointerUp(ev: PointerEvent) {
    if (!this._dragging) return;
    this._endDrag(ev);
    const v = this._shown;
    this._expirePending();
    fireEvent(this, 'value-changed', v);
  }

  private _onPointerCancel(ev: PointerEvent) {
    if (!this._dragging) return;
    this._endDrag(ev);
    this._clearPending();
  }

  private _endDrag(ev: PointerEvent) {
    this._dragging = false;
    this.toggleAttribute('dragging', false);
    if (this._wheel.hasPointerCapture(ev.pointerId)) {
      this._wheel.releasePointerCapture(ev.pointerId);
    }
  }

  private _onKeyDown(ev: KeyboardEvent) {
    if (this.disabled) return;
    let { hue, saturation } = this._shown;
    switch (ev.key) {
      case 'ArrowRight':
        hue = (hue + 5) % 360;
        break;
      case 'ArrowLeft':
        hue = (hue + 355) % 360;
        break;
      case 'ArrowUp':
        saturation = Math.min(100, saturation + 5);
        break;
      case 'ArrowDown':
        saturation = Math.max(0, saturation - 5);
        break;
      default:
        return;
    }
    ev.preventDefault();
    const v = { hue, saturation };
    this._setPending(v);
    fireEvent(this, 'value-changing', v);
    window.clearTimeout(this._keyTimer);
    this._keyTimer = window.setTimeout(() => {
      this._expirePending();
      fireEvent(this, 'value-changed', v);
    }, 400);
  }

  protected render() {
    const { hue, saturation } = this._shown;
    const rad = (hue * Math.PI) / 180;
    const r = (saturation / 100) * 50;
    const x = 50 + Math.sin(rad) * r;
    const y = 50 - Math.cos(rad) * r;

    return html`
      <div
        class="wheel"
        role="slider"
        tabindex=${this.disabled ? -1 : 0}
        aria-label=${this.label || nothing}
        aria-valuemin="0"
        aria-valuemax="360"
        aria-valuenow=${hue}
        aria-valuetext=${`${hue}°, ${saturation}%`}
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
        @keydown=${this._onKeyDown}
      >
        <div
          class="marker"
          style="left: ${x}%; top: ${y}%; background: ${hsCss(hue, saturation)}"
        ></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: var(--hac-color-wheel-size, 20rem);
      margin: 0 auto;
    }
    .wheel {
      position: relative;
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(circle closest-side, #fff 0%, rgba(255, 255, 255, 0) 100%),
        conic-gradient(
          hsl(0, 100%, 50%),
          hsl(30, 100%, 50%),
          hsl(60, 100%, 50%),
          hsl(90, 100%, 50%),
          hsl(120, 100%, 50%),
          hsl(150, 100%, 50%),
          hsl(180, 100%, 50%),
          hsl(210, 100%, 50%),
          hsl(240, 100%, 50%),
          hsl(270, 100%, 50%),
          hsl(300, 100%, 50%),
          hsl(330, 100%, 50%),
          hsl(360, 100%, 50%)
        );
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
      cursor: crosshair;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      outline: none;
    }
    .wheel:focus-visible {
      box-shadow: 0 0 0 2px var(--primary-color, #03a9f4);
    }
    .marker {
      position: absolute;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
      transform: translate(-50%, -50%);
      box-sizing: border-box;
      pointer-events: none;
      transition: left 180ms ease-out, top 180ms ease-out;
    }
    :host([dragging]) .marker {
      width: 2.571rem;
      height: 2.571rem;
      transition: none;
    }
    :host([disabled]) .wheel {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}
