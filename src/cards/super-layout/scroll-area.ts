// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { CardConfig, ScrollAreaConfig, LovelaceCard } from "./types";
import { safeCreateCards, safeRebuildCard } from "./card-helpers";

class SuperScrollArea extends LitElement {
  @property() hass;
  @property() editMode = false;
  @property() _config: ScrollAreaConfig;
  @property() _cards: Array<LovelaceCard> = [];

  setConfig(config: ScrollAreaConfig) {
    this._config = {
      height: "400px",
      padding: "0",
      scroll_snap: false,
      scroll_snap_type: "y mandatory",
      scrollbar_hidden: false,
      direction: "vertical",
      ...config,
    };
  }

  async updated(changedProperties: Map<string, any>) {
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
      el, cardConfig, this._cards, this.hass,
      (el2, config) => this._rebuildCard(el2, config)
    );
  }

  getCardSize() {
    return 3;
  }

  render() {
    const dir = this._config.direction || "vertical";
    const isHorizontal = dir === "horizontal";
    const isBoth = dir === "both";

    const scrollSnapStyle = this._config.scroll_snap
      ? `scroll-snap-type: ${this._config.scroll_snap_type};`
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
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "super-scroll-area",
  name: "Super Scroll Area",
  preview: false,
  description:
    "A scrollable container for cards with configurable height, scroll snap, and custom scrollbar styling.",
});

// --- Scroll Area Editor ---
class SuperScrollAreaEditor extends LitElement {
  @property() _config: ScrollAreaConfig;
  @property() lovelace;
  @property() hass;
  @property() _selectedTab = 0;
  @property() _selectedCard = 0;
  @property() _cardGUIMode = true;
  @property() _cardGUIModeAvailable = true;

  setConfig(config) {
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

  _computeLabel(schema) {
    const labels = {
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

  _valueChanged(ev) {
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

  _editCard(ev) {
    ev.stopPropagation();
    if (ev.detail.name === "add-card") {
      this._selectedCard = (this._config.cards || []).length;
      return;
    }
    this._cardGUIMode = true;
    this._cardGUIModeAvailable = true;
    this._selectedCard = parseInt(ev.detail.name, 10);
  }

  _addCard(ev: CustomEvent) {
    ev.stopPropagation();
    const cards = [...(this._config.cards || [])];
    cards.push(ev.detail.config);
    this._config = { ...this._config, cards };
    this._selectedCard = cards.length - 1;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _updateCard(ev) {
    ev.stopPropagation();
    const cards = [...(this._config.cards || [])];
    cards[this._selectedCard] = ev.detail.config;
    this._config = { ...this._config, cards };
    this._cardGUIModeAvailable = ev.detail.guiModeAvailable;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _deleteCard() {
    const cards = [...(this._config.cards || [])];
    cards.splice(this._selectedCard, 1);
    this._config = { ...this._config, cards };
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _moveCard(ev) {
    const source = this._selectedCard;
    const target = source + ev.currentTarget.move;
    const cards = [...(this._config.cards || [])];
    const card = cards.splice(source, 1)[0];
    cards.splice(target, 0, card);
    this._config = { ...this._config, cards };
    this._selectedCard = target;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
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
    const cards = this._config.cards || [];
    const selected = this._selectedCard;
    const numcards = cards.length;

    return html`
      <div class="cards">
        <ha-tab-group @wa-tab-show=${this._editCard}>
          ${cards.map(
            (_card, i) => html`
              <ha-tab-group-tab slot="nav" .active=${selected == i} .panel=${i}>
                ${i + 1}
              </ha-tab-group-tab>
            `
          )}
          <ha-tab-group-tab
            slot="nav"
            .active=${selected == numcards}
            .panel=${"add-card"}
            id="add-card"
          >
            <ha-icon .icon=${"mdi:plus"}></ha-icon>
          </ha-tab-group-tab>
        </ha-tab-group>
        <div id="card-editor">
          ${selected < numcards
            ? html`
                <div class="card-options">
                  <ha-icon-button
                    .disabled=${selected === 0}
                    @click=${this._moveCard}
                    .move=${-1}
                  >
                    <ha-icon .icon=${"mdi:arrow-left"}></ha-icon>
                  </ha-icon-button>
                  <ha-icon-button
                    .disabled=${selected === numcards - 1}
                    @click=${this._moveCard}
                    .move=${1}
                  >
                    <ha-icon .icon=${"mdi:arrow-right"}></ha-icon>
                  </ha-icon-button>
                  <ha-icon-button @click=${this._deleteCard}>
                    <ha-icon .icon=${"mdi:delete"}></ha-icon>
                  </ha-icon-button>
                </div>
                <hui-card-element-editor
                  .hass=${this.hass}
                  .value=${cards[selected]}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._updateCard}
                ></hui-card-element-editor>
              `
            : html`
                <hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._addCard}
                ></hui-card-picker>
              `}
        </div>
      </div>
    `;
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
      #add-card {
        max-width: 32px;
        padding: 0;
      }
      .cards .card-options {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }
      #editor,
      #card-editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
    `;
  }
}

define("super-scroll-area-editor", SuperScrollAreaEditor);
