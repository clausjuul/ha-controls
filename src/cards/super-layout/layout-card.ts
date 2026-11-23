// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { BaseColumnLayout } from "./layouts/base-column-layout";
import { CardConfig, SuperLayoutCardConfig, LovelaceCard } from "./types";
import { safeCreateCards, safeRebuildCard, sumCardSizes } from "./card-helpers";

class SuperLayoutCard extends LitElement {
  @property() hass;
  @property() editMode = false;
  @property() isPanel = false;
  @property() _config: SuperLayoutCardConfig;
  @property() _cards: Array<LovelaceCard> = [];
  @property() _layoutElement?: BaseColumnLayout;

  @property() _layoutType?: string;
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

  async updated(changedProperties: Map<string, any>) {
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
      const layoutElement = document.createElement(
        this._layoutType
      ) as BaseColumnLayout;
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

  _getLovelace(el: any = this, depth = 0) {
    if (depth > 50) return undefined;
    if (el.lovelace) return el.lovelace;
    if (el.localName === "home-assistant") return undefined;
    if (el.parentElement && (el.parentElement as any).host)
      return this._getLovelace((el.parentElement as any).host, depth + 1);
    if (el.parentNode && (el.parentNode as any).host)
      return this._getLovelace((el.parentNode as any).host, depth + 1);
    if (el.parentElement) return this._getLovelace(el.parentElement, depth + 1);
    if (el.parentNode) return this._getLovelace(el.parentNode, depth + 1);
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

  getCardSize(): number {
    return Math.max(1, sumCardSizes(this._cards));
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
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "super-layout-card",
  name: "Super Layout Card",
  preview: false,
  description:
    "Advanced layout card with native editor, scroll areas, and fullscreen grid support.",
});
