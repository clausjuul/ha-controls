// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { TabCardConfig, TabConfig, CardConfig, LovelaceCard } from "./types";
import { safeCreateCards, safeRebuildCard } from "./card-helpers";

class SuperTabCard extends LitElement {
  @property() hass;
  @property() editMode = false;
  @state() _activeTab = 0;
  @property() _config: TabCardConfig;
  @property() _tabCards: Array<Array<LovelaceCard>> = [];

  setConfig(config: TabCardConfig) {
    this._config = {
      tabs: [],
      ...config,
    };
    if (!this._config.tabs?.length) {
      throw new Error("Please define at least one tab");
    }
  }

  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has("_config")) {
      await this._createAllCards();
    }

    if (changedProperties.has("hass")) {
      this._tabCards.forEach((cards) => {
        cards.forEach((card) => {
          card.hass = this.hass;
        });
      });
    }
  }

  async _createAllCards() {
    const tabCards: Array<Array<LovelaceCard>> = [];
    for (const tab of this._config.tabs || []) {
      const cards = await safeCreateCards(
        tab.cards,
        this.hass,
        (el, config) => this._rebuildCard(el, config)
      );
      tabCards.push(cards);
    }
    this._tabCards = tabCards;
  }

  async _rebuildCard(el: LovelaceCard, cardConfig: CardConfig) {
    for (let t = 0; t < this._tabCards.length; t++) {
      const idx = this._tabCards[t].indexOf(el);
      if (idx !== -1) {
        this._tabCards[t] = await safeRebuildCard(
          el, cardConfig, this._tabCards[t], this.hass,
          (el2, config) => this._rebuildCard(el2, config)
        );
        this._tabCards = [...this._tabCards];
        return;
      }
    }
  }

  _selectTab(ev: CustomEvent) {
    ev.stopPropagation();
    this._activeTab = parseInt(ev.detail.name, 10);
  }

  getCardSize() {
    const activeCards = this._tabCards[this._activeTab] || [];
    let size = 1; // for tabs header
    for (const card of activeCards) {
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
    if (!this._config.tabs?.length) return html``;

    const activeCards = this._tabCards[this._activeTab] || [];

    return html`
      <ha-card>
        <div class="tabs-header">
          ${this._config.tabs.map((tab, i) => html`
            <div
              class="tab ${i === this._activeTab ? "active" : ""}"
              @click=${() => { this._activeTab = i; }}
            >
              ${tab.icon ? html`<ha-icon .icon=${tab.icon}></ha-icon>` : nothing}
              <span>${tab.title || `Tab ${i + 1}`}</span>
            </div>
          `)}
        </div>
        <div class="tab-content">
          ${activeCards.map(
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
      .tabs-header {
        display: flex;
        border-bottom: 2px solid var(--divider-color, #e0e0e0);
        background: var(--ha-card-background, var(--card-background-color, white));
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tabs-header::-webkit-scrollbar {
        display: none;
      }
      .tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px 16px;
        cursor: pointer;
        user-select: none;
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-text-color);
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: color 0.2s ease, border-color 0.2s ease;
        white-space: nowrap;
        min-width: 0;
      }
      .tab:hover {
        color: var(--primary-text-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      }
      .tab.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
      .tab ha-icon {
        --mdc-icon-size: 20px;
      }
      .tab-content {
        padding: 8px;
        animation: fadeIn 0.2s ease-in;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .card-item {
        margin: var(--masonry-view-card-margin, 4px 4px 8px);
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("super-tab-card-editor");
  }
  static getStubConfig() {
    return {
      tabs: [
        { title: "Tab 1", icon: "mdi:home", cards: [] },
        { title: "Tab 2", icon: "mdi:cog", cards: [] },
      ],
    };
  }
}

define("super-tab-card", SuperTabCard);
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "super-tab-card",
  name: "Super Tab Card",
  preview: false,
  description: "A tabbed container card that shows different cards in each tab.",
});

// --- Tab Card Editor ---
class SuperTabCardEditor extends LitElement {
  @property() _config: TabCardConfig;
  @property() lovelace;
  @property() hass;
  @state() _selectedMainTab = 0; // 0=Settings, 1=Tabs
  @state() _selectedTab = 0;
  @state() _selectedCard = 0;
  @state() _cardGUIModeAvailable = true;

  setConfig(config) {
    this._config = config;
  }

  _handleMainTabSwitch(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedMainTab = parseInt(ev.detail.name, 10);
  }

  _handleTabSwitch(ev: CustomEvent) {
    ev.stopPropagation();
    const name = ev.detail.name;
    if (name === "add-tab") {
      this._addTab();
      return;
    }
    this._selectedTab = parseInt(name, 10);
    this._selectedCard = 0;
  }

  _addTab() {
    const tabs = [...(this._config.tabs || [])];
    tabs.push({ title: `Tab ${tabs.length + 1}`, icon: "", cards: [] });
    this._config = { ...this._config, tabs };
    this._selectedTab = tabs.length - 1;
    this._fireConfigChanged();
  }

  _deleteTab() {
    const tabs = [...(this._config.tabs || [])];
    if (tabs.length <= 1) return;
    tabs.splice(this._selectedTab, 1);
    this._config = { ...this._config, tabs };
    this._selectedTab = Math.max(0, this._selectedTab - 1);
    this._fireConfigChanged();
  }

  _updateTabSettings(ev) {
    ev.stopPropagation();
    const tabs = [...(this._config.tabs || [])];
    tabs[this._selectedTab] = {
      ...tabs[this._selectedTab],
      ...ev.detail.value,
      cards: tabs[this._selectedTab].cards || [],
    };
    this._config = { ...this._config, tabs };
    this._fireConfigChanged();
  }

  _editCard(ev) {
    ev.stopPropagation();
    if (ev.detail.name === "add-card") {
      const tab = this._config.tabs?.[this._selectedTab];
      this._selectedCard = (tab?.cards || []).length;
      return;
    }
    this._cardGUIModeAvailable = true;
    this._selectedCard = parseInt(ev.detail.name, 10);
  }

  _addCard(ev: CustomEvent) {
    ev.stopPropagation();
    const tabs = [...(this._config.tabs || [])];
    const tab = { ...tabs[this._selectedTab] };
    const cards = [...(tab.cards || [])];
    cards.push(ev.detail.config);
    tab.cards = cards;
    tabs[this._selectedTab] = tab;
    this._config = { ...this._config, tabs };
    this._selectedCard = cards.length - 1;
    this._fireConfigChanged();
  }

  _updateCard(ev) {
    ev.stopPropagation();
    const tabs = [...(this._config.tabs || [])];
    const tab = { ...tabs[this._selectedTab] };
    const cards = [...(tab.cards || [])];
    cards[this._selectedCard] = ev.detail.config;
    tab.cards = cards;
    tabs[this._selectedTab] = tab;
    this._config = { ...this._config, tabs };
    this._cardGUIModeAvailable = ev.detail.guiModeAvailable;
    this._fireConfigChanged();
  }

  _deleteCard() {
    const tabs = [...(this._config.tabs || [])];
    const tab = { ...tabs[this._selectedTab] };
    const cards = [...(tab.cards || [])];
    cards.splice(this._selectedCard, 1);
    tab.cards = cards;
    tabs[this._selectedTab] = tab;
    this._config = { ...this._config, tabs };
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    this._fireConfigChanged();
  }

  _moveCard(ev) {
    const source = this._selectedCard;
    const target = source + ev.currentTarget.move;
    const tabs = [...(this._config.tabs || [])];
    const tab = { ...tabs[this._selectedTab] };
    const cards = [...(tab.cards || [])];
    const card = cards.splice(source, 1)[0];
    cards.splice(target, 0, card);
    tab.cards = cards;
    tabs[this._selectedTab] = tab;
    this._config = { ...this._config, tabs };
    this._selectedCard = target;
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-tab-group @wa-tab-show=${this._handleMainTabSwitch}>
          <ha-tab-group-tab slot="nav" .active=${this._selectedMainTab == 0} .panel=${0}>
            Tabs
          </ha-tab-group-tab>
          <ha-tab-group-tab slot="nav" .active=${this._selectedMainTab == 1} .panel=${1}>
            Cards
          </ha-tab-group-tab>
        </ha-tab-group>
        <div id="editor">
          ${this._selectedMainTab === 0
            ? this._renderTabsEditor()
            : this._renderCardsEditor()}
        </div>
      </div>
    `;
  }

  _renderTabsEditor() {
    const tabs = this._config.tabs || [];

    return html`
      <div class="tabs-editor">
        <ha-tab-group @wa-tab-show=${this._handleTabSwitch}>
          ${tabs.map(
            (tab, i) => html`
              <ha-tab-group-tab slot="nav" .active=${this._selectedTab == i} .panel=${i}>
                ${tab.title || `Tab ${i + 1}`}
              </ha-tab-group-tab>
            `
          )}
          <ha-tab-group-tab
            slot="nav"
            .active=${false}
            .panel=${"add-tab"}
            id="add-tab"
          >
            <ha-icon .icon=${"mdi:plus"}></ha-icon>
          </ha-tab-group-tab>
        </ha-tab-group>

        ${tabs[this._selectedTab]
          ? html`
              <div class="tab-settings">
                <ha-form
                  .hass=${this.hass}
                  .data=${tabs[this._selectedTab]}
                  .schema=${[
                    { name: "title", selector: { text: {} } },
                    { name: "icon", selector: { icon: {} } },
                  ]}
                  .computeLabel=${(schema) => {
                    const labels = { title: "Tab Title", icon: "Tab Icon" };
                    return labels[schema.name] || schema.name;
                  }}
                  @value-changed=${this._updateTabSettings}
                ></ha-form>
                <ha-button class="delete-tab" @click=${this._deleteTab} .disabled=${tabs.length <= 1}>
                  <ha-icon .icon=${"mdi:delete"}></ha-icon>
                  Delete Tab
                </ha-button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  _renderCardsEditor() {
    const tab = this._config.tabs?.[this._selectedTab];
    const cards = tab?.cards || [];
    const selected = this._selectedCard;
    const numcards = cards.length;

    return html`
      <div class="cards-editor">
        <div class="tab-selector">
          <span>Editing cards for: <strong>${tab?.title || `Tab ${this._selectedTab + 1}`}</strong></span>
        </div>
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
      #add-card, #add-tab {
        max-width: 32px;
        padding: 0;
      }
      .tab-settings {
        border: 1px solid var(--divider-color);
        padding: 12px;
        margin-bottom: 8px;
      }
      .delete-tab {
        margin-top: 8px;
        --mdc-theme-primary: var(--error-color, red);
      }
      .tab-selector {
        padding: 8px 0;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .cards-editor .card-options {
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

define("super-tab-card-editor", SuperTabCardEditor);
