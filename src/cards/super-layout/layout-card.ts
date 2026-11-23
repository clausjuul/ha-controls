import { define } from '../../shared/types';
import { css, html, LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { BaseLayout } from "./layouts/base-layout";
import type { CardConfig, Hass, Lovelace, LovelaceCard, SuperLayoutCardConfig } from "./types";
import { computeCardSize, safeCreateCards, safeRebuildCard } from "./card-helpers";

class SuperLayoutCard extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ type: Boolean }) editMode = false;
  @property({ type: Boolean }) isPanel = false;
  @state() _config!: SuperLayoutCardConfig;
  @state() _cards: LovelaceCard[] = [];
  /** A super-*-layout element, or HA's hui-masonry-view when no type is set. */
  @state() _layoutElement?: BaseLayout;

  @state() _layoutType = "hui-masonry-view";
  _build = 0;

  setConfig(config: SuperLayoutCardConfig) {
    this._config = { ...config };

    if (this._config.entities) {
      this._config.cards = this._config.entities.map((e) =>
        e.type ? e : { ...e, type: "entity" }
      );
    }

    let configType = config.layout_type;
    if (configType) {
      if (!configType?.endsWith("-layout")) configType += "-layout";
      if (configType.startsWith("custom:"))
        configType = configType.substring("custom:".length);
      // Auto-prefix with super- if not already
      if (!configType.startsWith("super-") && !configType.startsWith("hui-"))
        configType = "super-" + configType;
      // Unknown types (e.g. "sidebar"/"panel" from older editor versions)
      // would create an empty unknown element; fall back to masonry instead.
      if (configType.startsWith("super-") && !customElements.get(configType)) {
        console.warn(
          `super-layout-card: unknown layout_type "${config.layout_type}", using masonry`
        );
        configType = "super-masonry-layout";
      }
    } else {
      configType = "hui-masonry-view";
    }
    this._layoutType = configType;
  }

  async updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has("_layoutType") ||
      changedProperties.has("_config")
    ) {
      const viewConfig = {
        type: this._layoutType,
        layout: this._config.layout || this._config.layout_options,
        cards: this._config.cards,
      };
      // Config can change again (e.g. while typing in the editor) before the
      // cards below are created; only the newest build may take over.
      const build = ++this._build;
      const layoutElement = document.createElement(this._layoutType) as BaseLayout;
      layoutElement.setConfig?.(viewConfig);
      const cards = await this._createCards();
      if (build !== this._build) return;
      this._layoutElement = layoutElement;
      cards.forEach((card) => (card.hass = this.hass)); // hass may have moved on
      this._cards = cards;
      this._layoutElement.hass = this.hass;
      this._layoutElement.narrow = false;
      this._layoutElement.lovelace = {
        ...this._getLovelace(),
        editMode: false,
      };
      this._layoutElement.index = 1;
    }

    if (changedProperties.has("hass")) {
      this._cards.forEach((card) => {
        card.hass = this.hass;
      });
      if (this._layoutElement) this._layoutElement.hass = this.hass;
    }
    if (changedProperties.has("_cards")) {
      if (this._layoutElement) this._layoutElement.cards = this._cards;
    }
    if (changedProperties.has("editMode")) {
      if (this._layoutElement)
        this._layoutElement.lovelace = {
          ...this._getLovelace(),
          editMode: false,
        };
    }
  }

  /** Walks up through shadow roots to the nearest element with `lovelace`. */
  _getLovelace(): Lovelace | undefined {
    let node: Node | null = this;
    for (let depth = 0; node && depth <= 50; depth++) {
      const lovelace = (node as Node & { lovelace?: Lovelace }).lovelace;
      if (lovelace) return lovelace;
      if ((node as Element).localName === "home-assistant") return undefined;
      node = node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode;
    }
    return undefined;
  }

  async _createCards(): Promise<Array<LovelaceCard>> {
    if (!this._config.cards?.length) return [];
    return safeCreateCards(this._config.cards, this.hass, (el, config) =>
      this._rebuildCard(el, config)
    );
  }

  async _rebuildCard(el: LovelaceCard, cardConfig: CardConfig) {
    this._cards = await safeRebuildCard(
      el, cardConfig, () => this._cards, this.hass,
      (el2, config) => this._rebuildCard(el2, config)
    );
  }

  /**
   * The layout's own estimate (tallest column, or measured height) when it
   * has one; otherwise all cards stacked, as before.
   */
  async getCardSize(): Promise<number> {
    const estimate = await this._layoutElement?.estimateCardSize?.();
    if (estimate) return Math.max(1, estimate);
    const sizes = await Promise.all(this._cards.map(computeCardSize));
    return Math.max(1, sizes.reduce((a, b) => a + b, 0));
  }

  /** Full width in a sections view, any height (what HA used by default). */
  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 3 };
  }

  render() {
    const customStyle = this._config.style
      ? Object.entries(this._config.style)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ")
      : "";
    return html`<div style="${customStyle}">${this._layoutElement}</div>`;
  }

  static get styles() {
    return css`
      :host(:not(:first-child)) {
        margin-top: 0 !important;
      }
      :host(:not(:last-child)) {
        margin-bottom: 0 !important;
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("super-layout-card-editor");
  }
  static getStubConfig() {
    return {
      layout_type: "masonry",
      layout: {},
      cards: [],
    };
  }
}

define("super-layout-card", SuperLayoutCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "super-layout-card",
  name: "Super Layout Card",
  preview: false,
  description:
    "Advanced layout card with native editor, scroll areas, and fullscreen grid support.",
});
