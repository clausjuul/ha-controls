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
import { AutoHideHeader, getHeaderHeight, hideHeader, releaseHeader } from "./header";

class SuperGridLayout extends BaseLayout {
  _mediaQueries: Array<MediaQueryList | null> = [];
  _mqListeners: Array<() => void> = [];
  // Layout breakpoints as [query list, layout overrides]. Kept as pairs because
  // MediaQueryList.media is normalised by the browser and may not match the
  // config key it came from.
  _layoutMQs: Array<[MediaQueryList, Record<string, any>]> = [];
  _layoutMqListener = () => this._setGridStyles();
  _autoHide = new AutoHideHeader();
  _cancelHideHeader = () => {};
  @property() _config: GridViewConfig;

  async setConfig(config: GridViewConfig) {
    await super.setConfig(config);
    this._setupMediaQueryListeners();
    this._setGridStyles();
  }

  /**
   * (Re)creates media query listeners. Called from setConfig and again on
   * reconnect, since disconnectedCallback removes them and HA moves cards
   * around in the DOM (view cache, masonry reflow).
   */
  _setupMediaQueryListeners() {
    this._cleanupMediaQueryListeners();

    for (const card of this._config?.cards || []) {
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

    for (const [query, layout] of Object.entries(
      this._config?.layout?.mediaquery ?? {}
    )) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", this._layoutMqListener);
      this._layoutMQs.push([mq, layout ?? {}]);
    }
  }

  _cleanupMediaQueryListeners() {
    this._mediaQueries.forEach((mq, i) => {
      if (mq && this._mqListeners[i]) {
        mq.removeEventListener("change", this._mqListeners[i]);
      }
    });
    for (const [mq] of this._layoutMQs) {
      mq.removeEventListener("change", this._layoutMqListener);
    }
    this._mediaQueries = [];
    this._mqListeners = [];
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
    if (this._mediaQueries.some(Boolean)) this._placeCards();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupMediaQueryListeners();
    this._autoHide.detach();
    this._cancelHideHeader();
    releaseHeader(this);
  }

  async updated(changedProperties) {
    await super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._placeCards();
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
    this.shadowRoot.appendChild(styleEl);
  }

  _applyFullscreen() {
    if (!this._config.layout?.fullscreen) return;
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;

    if (this._config.layout?.hide_header) {
      this._cancelHideHeader();
      this._cancelHideHeader = hideHeader(this);
      root.style.setProperty("height", "100vh");
    } else {
      root.style.setProperty("height", `calc(100vh - ${getHeaderHeight()}px)`);
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
    const addStyles = (layout) => {
      for (const [key, value] of Object.entries(layout ?? {})) {
        if (
          key.startsWith("grid") ||
          key === "place-items" ||
          key === "place-content"
        )
          root.style.setProperty(key, value as any as string);
      }
    };

    root.style.cssText = "";

    if (this._config.layout) addStyles(this._config.layout);

    const match = this._layoutMQs.find(([mq]) => mq.matches);
    if (match) addStyles(match[1]);

    // Re-apply fullscreen styles after grid styles reset
    this._applyFullscreen();
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
