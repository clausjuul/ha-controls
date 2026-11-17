// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../../shared/types';
import { css, html } from "lit";
import { property } from "lit/decorators.js";
import {
  CardConfig,
  CardConfigGroup,
  GridViewConfig,
  HuiCard,
  LovelaceCard,
} from "../types";
import { BaseLayout } from "./base-layout";

class SuperGridLayout extends BaseLayout {
  _mediaQueries: Array<MediaQueryList | null> = [];
  _layoutMQs: Array<MediaQueryList | null> = [];
  _mqListeners: Array<() => void> = [];
  _layoutMqListeners: Array<() => void> = [];
  @property() _config: GridViewConfig;

  async setConfig(config: GridViewConfig) {
    // Clean up previous listeners before re-configuring
    this._cleanupMediaQueryListeners();

    await super.setConfig(config);

    for (const card of this._config.cards || []) {
      if (
        typeof card.view_layout?.show !== "string" &&
        card.view_layout?.show?.mediaquery
      ) {
        const mq = window.matchMedia(`${card.view_layout.show.mediaquery}`);
        const listener = () => this._placeCards();
        this._mediaQueries.push(mq);
        this._mqListeners.push(listener);
        mq.addEventListener("change", listener);
      } else {
        this._mediaQueries.push(null);
        this._mqListeners.push(null);
      }
    }

    if (this._config.layout?.mediaquery) {
      for (const [query, layout] of Object.entries(
        this._config.layout?.mediaquery
      )) {
        const mq = window.matchMedia(query);
        const listener = () => this._setGridStyles();
        this._layoutMQs.push(mq);
        this._layoutMqListeners.push(listener);
        mq.addEventListener("change", listener);
      }
    }
    this._setGridStyles();
  }

  _cleanupMediaQueryListeners() {
    this._mediaQueries.forEach((mq, i) => {
      if (mq && this._mqListeners[i]) {
        mq.removeEventListener("change", this._mqListeners[i]);
      }
    });
    this._layoutMQs.forEach((mq, i) => {
      if (mq && this._layoutMqListeners[i]) {
        mq.removeEventListener("change", this._layoutMqListeners[i]);
      }
    });
    this._mediaQueries = [];
    this._layoutMQs = [];
    this._mqListeners = [];
    this._layoutMqListeners = [];
  }

  async updated(changedProperties) {
    await super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._placeCards();
    }
  }

  async firstUpdated() {
    this._setGridStyles();
    this._applyFullscreen();
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
    this.shadowRoot.appendChild(styleEl);
  }

  _applyFullscreen() {
    if (!this._config.layout?.fullscreen) return;

    // Detect header height
    const headerHeight = this._getHeaderHeight();

    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (root) {
      root.style.setProperty(
        "height",
        `calc(100vh - ${headerHeight}px)`
      );
      root.style.setProperty("overflow", "hidden");
    }

    // Optionally hide the HA header
    if (this._config.layout?.hide_header) {
      this._hideHeader();
    }
  }

  _getHeaderHeight(): number {
    // Try to detect the HA toolbar height
    const toolbar = document.querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")
      ?.shadowRoot?.querySelector("ha-panel-lovelace")
      ?.shadowRoot?.querySelector("hui-root")
      ?.shadowRoot?.querySelector(".header") as HTMLElement;

    if (toolbar) {
      return toolbar.getBoundingClientRect().height;
    }
    // Default HA header height
    return 56;
  }

  _hideHeader() {
    const applyHideStyle = () => {
      const root = document.querySelector("home-assistant")
        ?.shadowRoot?.querySelector("home-assistant-main")
        ?.shadowRoot?.querySelector("ha-panel-lovelace")
        ?.shadowRoot?.querySelector("hui-root")
        ?.shadowRoot;

      if (root) {
        let styleEl = root.querySelector("#super-layout-hide-header") as HTMLStyleElement;
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = "super-layout-hide-header";
          styleEl.innerHTML = `
            .header { display: none !important; }
          `;
          root.appendChild(styleEl);
        }

        // Also adjust our own height since header is hidden
        const gridRoot = this.shadowRoot?.querySelector("#root") as HTMLElement;
        if (gridRoot) {
          gridRoot.style.setProperty("height", "100vh");
        }
      }
    };
    // Apply immediately and also after a short delay (for late-loading elements)
    applyHideStyle();
    setTimeout(applyHideStyle, 500);
  }

  _lastScrollY = 0;
  _scrollListener: (() => void) | null = null;

  _setupAutoHideHeader() {
    if (!this._config.layout?.auto_hide_header) return;

    const getHuiRoot = () =>
      document.querySelector("home-assistant")
        ?.shadowRoot?.querySelector("home-assistant-main")
        ?.shadowRoot?.querySelector("ha-panel-lovelace")
        ?.shadowRoot?.querySelector("hui-root")
        ?.shadowRoot;

    const applyAutoHide = () => {
      const root = getHuiRoot();
      if (!root) return;

      let styleEl = root.querySelector("#super-layout-auto-hide-header") as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "super-layout-auto-hide-header";
        styleEl.innerHTML = `
          .header {
            transition: transform 0.3s ease, opacity 0.3s ease !important;
          }
          .header.auto-hidden {
            transform: translateY(-100%) !important;
            opacity: 0 !important;
          }
        `;
        root.appendChild(styleEl);
      }

      const header = root.querySelector(".header") as HTMLElement;
      if (!header) return;

      const scrollTarget = this.shadowRoot?.querySelector("#root") || window;
      this._scrollListener = () => {
        const currentScrollY = scrollTarget === window
          ? window.scrollY
          : (scrollTarget as HTMLElement).scrollTop;

        if (currentScrollY > this._lastScrollY && currentScrollY > 56) {
          header.classList.add("auto-hidden");
        } else {
          header.classList.remove("auto-hidden");
        }
        this._lastScrollY = currentScrollY;
      };

      (scrollTarget as EventTarget).addEventListener("scroll", this._scrollListener, { passive: true });
    };

    applyAutoHide();
    setTimeout(applyAutoHide, 500);
  }

  _cleanupAutoHideHeader() {
    if (this._scrollListener) {
      const scrollTarget = this.shadowRoot?.querySelector("#root") || window;
      (scrollTarget as EventTarget).removeEventListener("scroll", this._scrollListener);
      this._scrollListener = null;
    }
    const root = document.querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")
      ?.shadowRoot?.querySelector("ha-panel-lovelace")
      ?.shadowRoot?.querySelector("hui-root")
      ?.shadowRoot;
    if (root) {
      const styleEl = root.querySelector("#super-layout-auto-hide-header");
      if (styleEl) styleEl.remove();
      const header = root.querySelector(".header");
      if (header) header.classList.remove("auto-hidden");
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupMediaQueryListeners();
    this._cleanupAutoHideHeader();
    // Remove header-hiding style when this layout is removed
    if (this._config?.layout?.hide_header) {
      const root = document.querySelector("home-assistant")
        ?.shadowRoot?.querySelector("home-assistant-main")
        ?.shadowRoot?.querySelector("ha-panel-lovelace")
        ?.shadowRoot?.querySelector("hui-root")
        ?.shadowRoot;
      if (root) {
        const styleEl = root.querySelector("#super-layout-hide-header");
        if (styleEl) styleEl.remove();
      }
    }
  }

  _setGridStyles() {
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;
    const addStyles = (layout) => {
      for (const [key, value] of Object.entries(layout)) {
        if (
          key.startsWith("grid") ||
          key === "grid" ||
          key === "place-items" ||
          key === "place-content"
        )
          root.style.setProperty(key, value as any as string);
      }
    };

    root.style.cssText = "";

    if (this._config.layout) addStyles(this._config.layout);

    for (const q of this._layoutMQs) {
      if (q.matches) {
        addStyles(this._config.layout.mediaquery[q.media]);
        break;
      }
    }

    // Re-apply fullscreen styles after grid styles reset
    if (this._config.layout?.fullscreen) {
      this._applyFullscreen();
    }
  }

  _shouldShow(card: LovelaceCard | HuiCard, config: CardConfig, index: number) {
    if (!super._shouldShow(card, config, index)) return false;

    const mq = this._mediaQueries[index];
    if (!mq) return true;
    if (mq.matches) return true;
    return false;
  }

  _placeCards() {
    const root = this.shadowRoot?.querySelector("#root");
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    let cards: CardConfigGroup[] = this.cards.map((card, index) => {
      const config = this._config.cards[index];
      return {
        card,
        config,
        index,
        show: this._shouldShow(card, config, index),
      };
    });

    for (const card of cards.filter((c) => this.lovelace?.editMode || c.show)) {
      const el = this.getCardElement(card);
      for (const [key, value] of Object.entries(
        card.config?.view_layout ?? {}
      )) {
        if (key.startsWith("grid") || key === "place-self")
          el.style.setProperty(key, value as string);
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
