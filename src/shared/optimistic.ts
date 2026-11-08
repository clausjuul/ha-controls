import type { HassEntity } from './types';

interface Override {
  state?: string;
  attributes: Record<string, unknown>;
  expires: number;
  /** Keep until Home Assistant sends any new state (instead of a matching one). */
  untilChanged?: HassEntity;
}

export interface Patch {
  state?: string;
  attributes?: Record<string, unknown>;
}

/** Attributes we derive ourselves; Home Assistant may report them differently. */
const IGNORED = new Set(['rgb_color', 'color_mode', 'xy_color']);

function close(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= Math.max(3, Math.abs(b) * 0.02);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => close(v, b[i]));
  }
  return a === b;
}

/**
 * Optimistic entity states: what we expect Home Assistant to report after a
 * service call. Shown immediately, dropped once HA reports matching values
 * (or after a timeout, so a failed call snaps back).
 */
export class OptimisticStates {
  private _overrides = new Map<string, Override>();
  private _timer?: number;

  constructor(
    private readonly _onChange: () => void,
    private readonly _ttl = 5000,
  ) {}

  set(base: HassEntity, patch: Patch, options: { untilChanged?: boolean } = {}): void {
    const prev = this._overrides.get(base.entity_id);
    const keepPrev = prev && !options.untilChanged && prev.expires > Date.now();
    this._overrides.set(base.entity_id, {
      state: patch.state ?? (keepPrev ? prev!.state : undefined),
      attributes: { ...(keepPrev ? prev!.attributes : {}), ...patch.attributes },
      expires: Date.now() + this._ttl,
      untilChanged: options.untilChanged ? base : undefined,
    });
    this._schedule();
    this._onChange();
  }

  /** The entity as we expect it to be. */
  get(base: HassEntity | undefined): HassEntity | undefined {
    if (!base) return base;
    const o = this._overrides.get(base.entity_id);
    if (!o || o.expires <= Date.now()) return base;
    return {
      ...base,
      state: o.state ?? base.state,
      attributes: { ...base.attributes, ...o.attributes },
    };
  }

  /** Drop overrides that Home Assistant has caught up with. */
  reconcile(states: Record<string, HassEntity | undefined>): void {
    for (const [id, o] of this._overrides) {
      const base = states[id];
      if (!base || o.expires <= Date.now() || this._confirmed(base, o)) {
        this._overrides.delete(id);
      }
    }
  }

  clear(): void {
    this._overrides.clear();
    window.clearTimeout(this._timer);
  }

  private _confirmed(base: HassEntity, o: Override): boolean {
    if (o.untilChanged) return base !== o.untilChanged;
    if (o.state !== undefined && base.state !== o.state) return false;
    if (base.state === 'off') return true;
    return Object.entries(o.attributes).every(
      ([key, value]) => IGNORED.has(key) || close(base.attributes[key], value),
    );
  }

  /** Re-render when the next override expires, so failed calls snap back. */
  private _schedule() {
    window.clearTimeout(this._timer);
    let next = Infinity;
    for (const o of this._overrides.values()) next = Math.min(next, o.expires);
    if (next === Infinity) return;
    this._timer = window.setTimeout(() => {
      const now = Date.now();
      for (const [id, o] of this._overrides) if (o.expires <= now) this._overrides.delete(id);
      this._schedule();
      this._onChange();
    }, Math.max(0, next - Date.now()) + 20);
  }
}
