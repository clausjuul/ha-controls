// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { CollapsibleCardConfig, CardConfig, LovelaceCard } from "./types";
import { safeCreateCards, safeRebuildCard } from "./card-helpers";

class SuperCollapsibleCard extends LitElement {
  @property() hass;
  @property() editMode = false;
  @state() _collapsed = true;
  @property() _config: CollapsibleCardConfig;
  @property() _cards: Array<LovelaceCard> = [];

  setConfig(config: CollapsibleCardConfig) {
    this._config = {
      title: "Section",
      icon: "mdi:chevron-down",
      initially_collapsed: true,
      ...config,
    };
    this._collapsed = this._config.initially_collapsed;
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

  _toggle() {
    this._collapsed = !this._collapsed;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cards = [];
  }

  getCardSize() {
    if (this._collapsed) return 1;
    let size = 1;
    for (const card of this._cards) {
      if (card.getCardSize) {
        try {
          const s = card.getCardSize();
          size += typeof s === "number" ? s : 1;
        } catch {
          size += 1;
        }
      } else {
        size += 1;
      }
    }
    return size;
  }

  render() {
    const iconName = this._collapsed ? "mdi:chevron-right" : "mdi:chevron-down";

    return html`
      <ha-card>
        <div class="header" @click=${this._toggle}>
          <ha-icon .icon=${this._config.icon || iconName}></ha-icon>
          <span class="title">${this._config.title}</span>
          <ha-icon class="chevron ${this._collapsed ? "" : "open"}" .icon=${iconName}></ha-icon>
        </div>
        <div class="content ${this._collapsed ? "collapsed" : "expanded"}">
          ${this._cards.map(
            (card) => html`<div class="card-item">${card}</div>`
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        user-select: none;
        gap: 8px;
        background: var(--ha-card-background, var(--card-background-color, white));
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .header:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .title {
        flex: 1;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .chevron {
        transition: transform 0.3s ease;
      }
      .chevron.open {
        transform: rotate(0deg);
      }
      .content {
        overflow: hidden;
        transition: max-height 0.3s ease, opacity 0.3s ease;
      }
      .content.collapsed {
        max-height: 0;
        opacity: 0;
      }
      .content.expanded {
        max-height: 5000px;
        opacity: 1;
      }
      .card-item {
        margin: var(--masonry-view-card-margin, 4px 4px 8px);
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("super-collapsible-card-editor");
  }
  static getStubConfig() {
    return {
      title: "Section",
      icon: "mdi:chevron-down",
      initially_collapsed: true,
      cards: [],
    };
  }
}

define("super-collapsible-card", SuperCollapsibleCard);
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "super-collapsible-card",
  name: "Super Collapsible Card",
  preview: false,
  description: "A foldable card section with configurable title, icon, and child cards.",
});

// --- Collapsible Card Editor ---
class SuperCollapsibleCardEditor extends LitElement {
  @property() _config: CollapsibleCardConfig;
  @property() lovelace;
  @property() hass;
  @state() _selectedTab = 0;
  @state() _selectedCard = 0;
  @state() _cardGUIModeAvailable = true;

  setConfig(config) {
    this._config = config;
  }

  _schema = [
    {
      name: "title",
      selector: { text: {} },
    },
    {
      name: "icon",
      selector: { icon: {} },
    },
    {
      name: "initially_collapsed",
      selector: { boolean: {} },
    },
  ];

  _computeLabel(schema) {
    const labels = {
      title: "Title",
      icon: "Icon",
      initially_collapsed: "Start collapsed",
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

define("super-collapsible-card-editor", SuperCollapsibleCardEditor);
