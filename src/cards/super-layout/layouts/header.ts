// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
// Shared HA-header helpers for the grid layouts (fullscreen, hide_header,
// auto_hide_header). They reach into HA's internals, so keep them in one place.

const HIDE_STYLE_ID = "super-layout-hide-header";
const AUTO_HIDE_STYLE_ID = "super-layout-auto-hide-header";
const RETRY_MS = 500;

/** Viewport height that excludes mobile browser bars where supported. */
export const VH = CSS.supports?.("height", "100dvh") ? "100dvh" : "100vh";

export const getHuiRootShadow = (): ShadowRoot | undefined =>
  document
    .querySelector("home-assistant")
    ?.shadowRoot?.querySelector("home-assistant-main")
    ?.shadowRoot?.querySelector("ha-panel-lovelace")
    ?.shadowRoot?.querySelector("hui-root")?.shadowRoot ?? undefined;

export function getHeaderHeight(): number {
  const header = getHuiRootShadow()?.querySelector(".header") as HTMLElement;
  return header ? header.getBoundingClientRect().height : 56;
}

const addStyle = (root: ShadowRoot, id: string, css: string) => {
  if (root.querySelector(`#${id}`)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  root.appendChild(el);
};

/** Tries now and once more after a delay, for when hui-root renders late. */
const withRetry = (fn: () => boolean): (() => void) => {
  if (fn()) return () => {};
  const timer = setTimeout(fn, RETRY_MS);
  return () => clearTimeout(timer);
};

// Several layouts can ask to hide the header at once; only remove the style
// when the last of them lets go.
const hideHeaderOwners = new Set<object>();

/** Hides HA's header while `owner` holds it. Returns a function that cancels a pending retry. */
export function hideHeader(owner: object): () => void {
  hideHeaderOwners.add(owner);
  return withRetry(() => {
    if (!hideHeaderOwners.has(owner)) return true;
    const root = getHuiRootShadow();
    if (!root) return false;
    addStyle(root, HIDE_STYLE_ID, `.header { display: none !important; }`);
    return true;
  });
}

export function releaseHeader(owner: object) {
  if (!hideHeaderOwners.delete(owner) || hideHeaderOwners.size) return;
  getHuiRootShadow()?.querySelector(`#${HIDE_STYLE_ID}`)?.remove();
}

/**
 * Slides HA's header away while scrolling down. Attach once per connection;
 * attaching again first detaches the previous listener.
 */
export class AutoHideHeader {
  private _target: EventTarget | null = null;
  private _listener: (() => void) | null = null;
  private _cancelRetry: () => void = () => {};
  private _lastY = 0;

  attach(scrollTarget: EventTarget) {
    this.detach();
    this._cancelRetry = withRetry(() => {
      const root = getHuiRootShadow();
      const header = root?.querySelector(".header") as HTMLElement | null;
      if (!root || !header) return false;
      addStyle(
        root,
        AUTO_HIDE_STYLE_ID,
        `.header { transition: transform 0.3s ease, opacity 0.3s ease !important; }
         .header.auto-hidden { transform: translateY(-100%) !important; opacity: 0 !important; }`
      );
      this._lastY = 0;
      this._listener = () => {
        const y =
          scrollTarget === window
            ? window.scrollY
            : (scrollTarget as HTMLElement).scrollTop;
        header.classList.toggle("auto-hidden", y > this._lastY && y > 56);
        this._lastY = y;
      };
      this._target = scrollTarget;
      scrollTarget.addEventListener("scroll", this._listener, { passive: true });
      return true;
    });
  }

  detach() {
    this._cancelRetry();
    this._cancelRetry = () => {};
    if (this._target && this._listener) {
      this._target.removeEventListener("scroll", this._listener);
      const root = getHuiRootShadow();
      root?.querySelector(`#${AUTO_HIDE_STYLE_ID}`)?.remove();
      root?.querySelector(".header")?.classList.remove("auto-hidden");
    }
    this._target = null;
    this._listener = null;
  }
}
