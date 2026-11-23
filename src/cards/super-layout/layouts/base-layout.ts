// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import {
  CardConfig,
  CardConfigGroup,
  HuiCard,
  LovelaceCard,
  ViewConfig,
} from "../types";

const CARD_THEME_VARS = ["border-radius", "border-width", "box-shadow"];

export class BaseLayout extends LitElement {
  @property() cards: Array<LovelaceCard | HuiCard> = [];
  @property() index: number;
  @property() narrow: boolean;
  @property() hass;
  @property() lovelace: any;
  @property() _editMode: boolean = false;
  _editorLoaded = false;

  @property() _config: ViewConfig;

  async setConfig(config: ViewConfig) {
    this._config = { ...config };
    if (this._config.view_layout && this._config.layout === undefined) {
      this._config.layout = this._config.view_layout;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._syncCardTheme();
  }

  /**
   * Some theme injectors add `* { --ha-card-border-radius: var(--ha-border-radius-square);
   * --ha-card-border-width: 0; --ha-card-box-shadow: none }` to shadow roots, which
   * flattens every card inside the layout. Copy the theme's real values from the
   * document root onto the host so `_card_theme_styles` can restore them.
   */
  _syncCardTheme() {
    const root = getComputedStyle(document.documentElement);
    for (const name of CARD_THEME_VARS) {
      const value = root.getPropertyValue(`--ha-card-${name}`).trim();
      if (value) this.style.setProperty(`--super-layout-card-${name}`, value);
      else this.style.removeProperty(`--super-layout-card-${name}`);
    }
  }

  async updated(changedProperties: Map<string, any>) {
    if (changedProperties.get("hass")?.themes !== this.hass?.themes) {
      this._syncCardTheme();
    }
    if (
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode != changedProperties.get("lovelace")?.editMode
    ) {
      if (this.lovelace?.editMode && !this._editorLoaded) {
        this._editorLoaded = true;
        {
          const loader = document.createElement("hui-masonry-view");
          (loader as any).lovelace = { editMode: true };
          (loader as any).willUpdate(new Map());
        }
      }
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
    }
  }

  _shouldShow(card: LovelaceCard | HuiCard, config: CardConfig, index: number) {
    if (config.view_layout?.show === "always") return true;
    if (config.view_layout?.show === "never") return false;
    if (
      config.view_layout?.show?.sidebar === "shown" &&
      (this.hass?.dockedSidebar === "auto" || this.narrow)
    )
      return false;
    if (
      config.view_layout?.show?.sidebar === "hidden" &&
      this.hass?.dockedSidebar === "docked" &&
      !this.narrow
    )
      return false;
    return true;
  }

  /**
   * Height in card-size units (about 50px each), measured once rendered.
   * Column layouts override this with a placement-based estimate.
   */
  async estimateCardSize(): Promise<number | undefined> {
    const height = this.getBoundingClientRect().height;
    return height > 0 ? Math.ceil(height / 50) : undefined;
  }

  getCardElement(card: CardConfigGroup) {
    if (!this.lovelace?.editMode) return card.card;
    const wrapper = document.createElement("hui-card-options") as any;
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index, card.index];
    card.card.editMode = true;
    wrapper.appendChild(card.card);
    if (card.show === false) wrapper.style.border = "1px solid red";
    return wrapper;
  }

  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
  }

  _render_fab() {
    if (!this.lovelace?.editMode) return html``;
    return html`
      <ha-fab .label=${"Add card"} extended @click=${this._addCard}>
        <ha-icon slot="icon" .icon=${"mdi:plus"}></ha-icon>
      </ha-fab>
    `;
  }

  /** Restores theme card variables on everything inside the layout (see `_syncCardTheme`). */
  static get _card_theme_styles() {
    return css`
      #root,
      #columns,
      #root *,
      #columns * {
        --ha-card-border-radius: var(--super-layout-card-border-radius);
        --ha-card-border-width: var(--super-layout-card-border-width);
        --ha-card-box-shadow: var(--super-layout-card-box-shadow);
      }
    `;
  }

  /** hui-card (the child card wrapper) is inline by default. */
  static get _hui_card_styles() {
    return css`
      hui-card:not([hidden]) {
        display: block;
      }
    `;
  }

  static get _fab_styles() {
    return css`
      ha-fab {
        position: fixed;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }
    `;
  }
}
