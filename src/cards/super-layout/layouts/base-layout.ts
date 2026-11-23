import { css, html, LitElement, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type {
  CardConfig,
  CardConfigGroup,
  Hass,
  LovelaceCard,
  Lovelace,
  ViewConfig,
} from "../types";

/** HA's edit-mode wrapper around a card in a view. */
interface HuiCardOptions extends HTMLElement {
  hass?: Hass;
  lovelace?: Lovelace;
  path?: [number, number];
}

const CARD_THEME_VARS = ["border-radius", "border-width", "box-shadow"];

export class BaseLayout extends LitElement {
  @property({ attribute: false }) cards: LovelaceCard[] = [];
  @property({ attribute: false }) index = 0;
  @property({ attribute: false }) narrow = false;
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) lovelace?: Lovelace;
  @property({ attribute: false }) _editMode = false;
  _editorLoaded = false;

  // Set by setConfig before the element is used.
  @property({ attribute: false }) _config!: ViewConfig;

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

  async updated(changedProperties: PropertyValues) {
    const oldHass = changedProperties.get("hass") as Hass | undefined;
    if (oldHass?.themes !== this.hass?.themes) {
      this._syncCardTheme();
    }
    if (
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !=
        (changedProperties.get("lovelace") as Lovelace | undefined)?.editMode
    ) {
      if (this.lovelace?.editMode && !this._editorLoaded) {
        this._editorLoaded = true;
        // Rendering a masonry view in edit mode makes HA load its card
        // editing elements (hui-card-options etc.).
        const loader = document.createElement("hui-masonry-view") as HTMLElement & {
          lovelace?: Partial<Lovelace>;
          willUpdate?(changed: Map<string, unknown>): void;
        };
        loader.lovelace = { editMode: true };
        loader.willUpdate?.(new Map());
      }
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
    }
  }

  /** Per card: its `show.mediaquery` list, or null. */
  _mediaQueries: Array<MediaQueryList | null> = [];
  _mqListener = () => this._makeLayout();

  /** Places the cards; each layout implements it. */
  _makeLayout(): void | Promise<void> {}

  /**
   * (Re)creates the per-card `show.mediaquery` listeners. Called from
   * setConfig and again on reconnect, since disconnectedCallback removes them
   * and HA moves cards around in the DOM (view cache, masonry reflow).
   */
  _setupMediaQueryListeners() {
    this._cleanupMediaQueryListeners();
    this._mediaQueries = (this._config?.cards ?? []).map((card) => {
      const show = card.view_layout?.show;
      const query = typeof show === "object" ? show.mediaquery : undefined;
      if (!query) return null;
      const mq = window.matchMedia(query);
      mq.addEventListener("change", this._mqListener);
      return mq;
    });
  }

  _cleanupMediaQueryListeners() {
    for (const mq of this._mediaQueries) {
      mq?.removeEventListener("change", this._mqListener);
    }
    this._mediaQueries = [];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupMediaQueryListeners();
  }

  /** The child cards paired with their config and visibility. */
  _cardGroups(): CardConfigGroup[] {
    return this.cards.map((card, index) => {
      const config = this._config.cards?.[index] ?? { type: "" };
      return { card, config, index, show: this._shouldShow(card, config, index) };
    });
  }

  _shouldShow(_card: LovelaceCard, config: CardConfig, index: number): boolean {
    const show = config.view_layout?.show;
    if (this._mediaQueries[index]?.matches === false) return false;
    if (show === "always" || show === undefined) return true;
    if (show === "never") return false;
    if (
      show.sidebar === "shown" &&
      (this.hass?.dockedSidebar === "auto" || this.narrow)
    )
      return false;
    if (
      show.sidebar === "hidden" &&
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

  getCardElement(card: CardConfigGroup): HTMLElement {
    if (!this.lovelace?.editMode) return card.card;
    const wrapper = document.createElement("hui-card-options") as HuiCardOptions;
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
