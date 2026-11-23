import { define } from '../../shared/types';
import { css, html, LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { CardConfig, FormSchema, Hass, Lovelace, LovelaceCard, ScrollAreaConfig, ValueChangedEvent } from "./types";
import { safeCreateCards, safeRebuildCard } from "./card-helpers";
import "./card-list-editor";

class SuperScrollArea extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property() editMode = false;
  @property({ attribute: false }) _config!: ScrollAreaConfig;
  @state() _cards: LovelaceCard[] = [];

  setConfig(config: ScrollAreaConfig) {
    this._config = {
      height: "400px",
      padding: "0",
      scroll_snap: false,
      scrollbar_hidden: false,
      direction: "vertical",
      ...config,
    };
  }

  async updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has("_config")) {
      await this._createCards();
    }

    if (changedProperties.has("hass")) {
      this._cards.forEach((card) => {
        card.hass = this.hass;
      });
    }
  }

  async _createCards() {
    this._cards = await safeCreateCards(
      this._config.cards,
      this.hass,
      (el, config) => this._rebuildCard(el, config)
    );
  }

  async _rebuildCard(el: LovelaceCard, cardConfig: CardConfig) {
    this._cards = await safeRebuildCard(
      el, cardConfig, () => this._cards, this.hass,
      (el2, config) => this._rebuildCard(el2, config)
    );
  }

  /** Full width in a sections view, any height (what HA used by default). */
  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 3 };
  }

  getCardSize() {
    return 3;
  }

  render() {
    const dir = this._config.direction || "vertical";
    const isHorizontal = dir === "horizontal";
    const isBoth = dir === "both";

    // Without an explicit type, snap along the scroll direction.
    const snapType =
      this._config.scroll_snap_type ||
      (isHorizontal ? "x mandatory" : isBoth ? "both mandatory" : "y mandatory");
    const scrollSnapStyle = this._config.scroll_snap
      ? `scroll-snap-type: ${snapType};`
      : "";
    const scrollbarStyle = this._config.scrollbar_hidden
      ? "scrollbar-width: none;"
      : "";

    const containerClass = `scroll-container ${dir}`;

    return html`
      <div
        class="${containerClass}"
        style="
          ${isHorizontal || isBoth ? "" : `max-height: ${this._config.height};`}
          ${isHorizontal ? `max-width: 100%; height: auto;` : ""}
          ${isBoth ? `max-height: ${this._config.height}; max-width: 100%;` : ""}
          padding: ${this._config.padding};
          ${scrollSnapStyle}
          ${scrollbarStyle}
          scroll-behavior: smooth;
        "
      >
        ${this._cards.map(
          (card, index) => {
            const cardConfig = this._config.cards?.[index];
            const isSticky = cardConfig?.view_layout?.sticky;
            const stickyStyle = isSticky
              ? `position: sticky; ${isHorizontal ? "left: 0;" : "top: 0;"} z-index: 1; background: var(--card-background-color, var(--ha-card-background, white));`
              : "";
            return html`
              <div
                class="scroll-item"
                style="
                  ${this._config.scroll_snap ? "scroll-snap-align: start;" : ""}
                  ${stickyStyle}
                  animation: fadeIn 0.3s ease-in;
                  animation-delay: ${Math.min(index * 0.05, 1)}s;
                  animation-fill-mode: both;
                "
              >
                ${card}
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .scroll-container {
        box-sizing: border-box;
        scroll-behavior: smooth;
      }
      .scroll-container.vertical {
        overflow-y: auto;
        overflow-x: hidden;
      }
      .scroll-container.horizontal {
        overflow-x: auto;
        overflow-y: hidden;
        display: flex;
        flex-direction: row;
        gap: 8px;
      }
      .scroll-container.both {
        overflow: auto;
      }
      .scroll-container::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .scroll-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .scroll-container::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2));
        border-radius: 3px;
      }
      .scroll-container::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-color-hover, rgba(0, 0, 0, 0.4));
      }
      .scroll-container.horizontal .scroll-item {
        flex: 0 0 auto;
        min-width: 250px;
      }
      hui-card:not([hidden]) {
        display: block;
      }
      .scroll-item:has(> hui-card[hidden]) {
        display: none;
      }
      .scroll-item {
        margin: var(--masonry-view-card-margin, 4px 4px 8px);
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("super-scroll-area-editor");
  }
  static getStubConfig() {
    return {
      height: "400px",
      direction: "vertical",
      cards: [],
    };
  }
}

define("super-scroll-area", SuperScrollArea);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "super-scroll-area",
  name: "Super Scroll Area",
  preview: false,
  description:
    "A scrollable container for cards with configurable height, scroll snap, and custom scrollbar styling.",
});

// --- Scroll Area Editor ---
class SuperScrollAreaEditor extends LitElement {
  @property({ attribute: false }) _config!: ScrollAreaConfig;
  @property({ attribute: false }) lovelace?: Lovelace;
  @property({ attribute: false }) hass?: Hass;
  @property() _selectedTab = 0;

  setConfig(config: ScrollAreaConfig) {
    this._config = config;
  }

  _schema = [
    {
      name: "height",
      selector: { text: {} },
    },
    {
      name: "padding",
      selector: { text: {} },
    },
    {
      name: "direction",
      selector: {
        select: {
          options: [
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
            { value: "both", label: "Both" },
          ],
        },
      },
    },
    {
      name: "scroll_snap",
      selector: { boolean: {} },
    },
    {
      name: "scroll_snap_type",
      selector: {
        select: {
          options: [
            { value: "y mandatory", label: "Vertical (mandatory)" },
            { value: "y proximity", label: "Vertical (proximity)" },
            { value: "x mandatory", label: "Horizontal (mandatory)" },
            { value: "x proximity", label: "Horizontal (proximity)" },
          ],
        },
      },
    },
    {
      name: "scrollbar_hidden",
      selector: { boolean: {} },
    },
  ];

  _computeLabel(schema: FormSchema): string {
    const labels: Record<string, string> = {
      height: "Height (CSS value, e.g. 400px, 50vh)",
      padding: "Padding (CSS value)",
      direction: "Scroll direction",
      scroll_snap: "Enable scroll snap",
      scroll_snap_type: "Scroll snap type",
      scrollbar_hidden: "Hide scrollbar",
    };
    return labels[schema.name] || schema.name;
  }

  _handleSwitchTab(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedTab = parseInt(ev.detail.name, 10);
  }

  _valueChanged(ev: ValueChangedEvent<Partial<ScrollAreaConfig>>) {
    ev.stopPropagation();
    const newValues = ev.detail.value;
    const config = {
      ...this._config,
      ...newValues,
      cards: this._config.cards || [],
    };
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config } })
    );
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-tab-group @wa-tab-show=${this._handleSwitchTab}>
          <ha-tab-group-tab slot="nav" .active=${this._selectedTab == 0} .panel=${0}>
            Settings
          </ha-tab-group-tab>
          <ha-tab-group-tab slot="nav" .active=${this._selectedTab == 1} .panel=${1}>
            Cards
          </ha-tab-group-tab>
        </ha-tab-group>
        <div id="editor">
          ${this._selectedTab === 0
            ? this._renderSettingsEditor()
            : this._renderCardsEditor()}
        </div>
      </div>
    `;
  }

  _renderSettingsEditor() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _renderCardsEditor() {
    return html`
      <super-card-list-editor
        .hass=${this.hass}
        .lovelace=${this.lovelace}
        .cards=${this._config.cards || []}
        @cards-changed=${this._cardsChanged}
      ></super-card-list-editor>
    `;
  }

  _cardsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._config = { ...this._config, cards: ev.detail.cards };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  static get styles() {
    return css`
      ha-tab-group {
        margin-top: -16px;
        margin-bottom: 16px;
      }
      ha-tab-group-tab {
        flex: 1;
      }
      ha-tab-group-tab::part(base) {
        width: 100%;
        justify-content: center;
      }
      #editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
    `;
  }
}

define("super-scroll-area-editor", SuperScrollAreaEditor);
