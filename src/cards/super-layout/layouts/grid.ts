import { define } from '../../../shared/types';
import { css, html, type PropertyValues } from "lit";
import type { GridViewConfig } from "../types";
import { BaseLayout } from "./base-layout";
import { AutoHideHeader, getHeaderHeight, hideHeader, releaseHeader, VH } from "./header";

class SuperGridLayout extends BaseLayout {
  // Layout breakpoints as [query list, layout overrides]. Kept as pairs because
  // MediaQueryList.media is normalised by the browser and may not match the
  // config key it came from.
  _layoutMQs: Array<[MediaQueryList, Record<string, string>]> = [];
  _layoutMqListener = () => this._setGridStyles();
  _autoHide = new AutoHideHeader();
  _cancelHideHeader = () => {};

  async setConfig(config: GridViewConfig) {
    await super.setConfig(config);
    this._setupMediaQueryListeners();
    this._setGridStyles();
  }

  /** Per-card listeners (BaseLayout) plus the layout's own breakpoints. */
  _setupMediaQueryListeners() {
    super._setupMediaQueryListeners();
    for (const [query, layout] of Object.entries(
      this._config?.layout?.mediaquery ?? {}
    )) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", this._layoutMqListener);
      this._layoutMQs.push([mq, layout ?? {}]);
    }
  }

  _cleanupMediaQueryListeners() {
    super._cleanupMediaQueryListeners();
    for (const [mq] of this._layoutMQs ?? []) {
      mq.removeEventListener("change", this._layoutMqListener);
    }
    this._layoutMQs = [];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) return;
    // Reattached after a DOM move: restore what disconnectedCallback removed,
    // and catch up on media queries that changed while detached.
    this._setupMediaQueryListeners();
    this._setGridStyles();
    this._setupAutoHideHeader();
    if (this._mediaQueries.some(Boolean)) this._makeLayout();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._autoHide.detach();
    this._cancelHideHeader();
    releaseHeader(this);
  }

  async updated(changedProperties: PropertyValues) {
    await super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._makeLayout();
    }
  }

  async firstUpdated() {
    this._setGridStyles();
    this._setupAutoHideHeader();

    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      :host {
        --layout-margin: ${this._config.layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${this._config.layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${this._config.layout?.height ?? "auto"};
        --layout-overflow: ${
          this._config.layout?.height !== undefined ? "auto" : "visible"
        };
      }`;
    this.shadowRoot?.appendChild(styleEl);
  }

  _applyFullscreen() {
    if (!this._config.layout?.fullscreen) return;
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;

    if (this._config.layout?.hide_header) {
      this._cancelHideHeader();
      this._cancelHideHeader = hideHeader(this);
      root.style.setProperty("height", `${VH}`);
    } else {
      root.style.setProperty("height", `calc(${VH} - ${getHeaderHeight()}px)`);
    }
    root.style.setProperty("overflow", "hidden");
  }

  _setupAutoHideHeader() {
    if (!this._config.layout?.auto_hide_header) return;
    this._autoHide.attach(this.shadowRoot?.querySelector("#root") || window);
  }

  _setGridStyles() {
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;
    const addStyles = (layout: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(layout)) {
        if (
          key.startsWith("grid") ||
          key === "place-items" ||
          key === "place-content"
        )
          root.style.setProperty(key, String(value));
      }
    };

    root.style.cssText = "";

    if (this._config.layout) addStyles(this._config.layout);

    const match = this._layoutMQs.find(([mq]) => mq.matches);
    if (match) addStyles(match[1]);

    // Re-apply fullscreen styles after grid styles reset
    this._applyFullscreen();
  }

  _makeLayout() {
    const root = this.shadowRoot?.querySelector("#root");
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    const cards = this._cardGroups().filter((c) => this.lovelace?.editMode || c.show);
    for (const card of cards) {
      const el = this.getCardElement(card);
      for (const [key, value] of Object.entries(card.config.view_layout ?? {})) {
        if (key.startsWith("grid") || key === "place-self")
          el.style.setProperty(key, String(value));
      }
      root.appendChild(el);
    }
  }

  render() {
    return html` <div id="root"></div>
      ${this._render_fab()}`;
  }
  static get styles() {
    return [
      this._fab_styles,
      this._card_theme_styles,
      this._hui_card_styles,
      css`
        :host {
          height: 100%;
          box-sizing: border-box;
        }
        #root {
          display: grid;
          justify-content: stretch;
          margin: var(--layout-margin);
          padding: var(--layout-padding);
          height: var(--layout-height);
          overflow-y: var(--layout-overflow);
        }
        #root > * {
          margin: var(--masonry-view-card-margin, 4px 4px 8px);
        }
      `,
    ];
  }
}

define("super-grid-layout", SuperGridLayout);
