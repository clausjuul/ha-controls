// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { TabCardConfig, TabConfig, CardConfig, LovelaceCard } from "./types";
import { computeCardSize, safeCreateCards, safeRebuildCard } from "./card-helpers";
import "./card-list-editor";

class SuperTabCard extends LitElement {
  @property() hass;
  @property() editMode = false;
  @state() _activeTab = 0;
  @property() _config: TabCardConfig;
  @property() _tabCards: Array<Array<LovelaceCard> | undefined> = [];

  setConfig(config: TabCardConfig) {
    this._config = {
      tabs: [],
      ...config,
    };
    if (!this._config.tabs?.length) {
      throw new Error("Please define at least one tab");
    }
    if (this._activeTab >= this._config.tabs.length) this._activeTab = 0;
  }

  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has("_config")) {
      // Cards are created per tab when it is first shown (see _ensureTab).
      this._build++;
      this._creating.clear();
      this._tabCards = [];
    }

    if (changedProperties.has("_config") || changedProperties.has("_activeTab")) {
      await this._ensureTab(this._activeTab);
      // A tab shown again missed the hass updates while it was hidden.
      this._tabCards[this._activeTab]?.forEach((card) => (card.hass = this.hass));
    }

    if (changedProperties.has("hass")) {
      // Only the visible tab needs live updates.
      this._tabCards[this._activeTab]?.forEach((card) => (card.hass = this.hass));
    }
  }

  _build = 0;
  _creating = new Set<number>();

  async _ensureTab(index: number) {
    if (this._tabCards[index] || this._creating.has(index)) return;
    const tab = this._config.tabs?.[index];
    if (!tab) return;
    const build = this._build;
    this._creating.add(index);
    const cards = await safeCreateCards(tab.cards, this.hass, (el, config) =>
      this._rebuildCard(el, config)
    );
    if (build !== this._build) return; // config changed meanwhile
    this._creating.delete(index);
    const tabCards = [...this._tabCards];
    tabCards[index] = cards;
    this._tabCards = tabCards;
  }

  async _rebuildCard(el: LovelaceCard, cardConfig: CardConfig) {
    for (let t = 0; t < this._tabCards.length; t++) {
      if (this._tabCards[t]?.includes(el)) {
        const rebuilt = await safeRebuildCard(
          el, cardConfig, () => this._tabCards[t] ?? [], this.hass,
          (el2, config) => this._rebuildCard(el2, config)
        );
        const tabCards = [...this._tabCards];
        tabCards[t] = rebuilt;
        this._tabCards = tabCards;
        return;
      }
    }
  }

  /** Full width in a sections view, any height (what HA used by default). */
  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 3 };
  }

  async getCardSize(): Promise<number> {
    const sizes = await Promise.all(
      (this._tabCards[this._activeTab] || []).map(computeCardSize)
    );
    return 1 + sizes.reduce((a, b) => a + b, 0);
  }

  _onTabKey(ev: KeyboardEvent) {
    const count = this._config.tabs?.length ?? 0;
    const keys = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (!(ev.key in keys) || !count) return;
    ev.preventDefault();
    const step = keys[ev.key];
    this._activeTab = Number.isFinite(step)
      ? (this._activeTab + step + count) % count
      : step < 0 ? 0 : count - 1;
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(".tab.active") as HTMLElement)?.focus()
    );
  }

  render() {
    if (!this._config.tabs?.length) return html``;

    const activeCards = this._tabCards[this._activeTab] || [];

    return html`
      <ha-card>
        <div class="tabs-header" role="tablist" @keydown=${this._onTabKey}>
          ${this._config.tabs.map((tab, i) => html`
            <div
              class="tab ${i === this._activeTab ? "active" : ""}"
              role="tab"
              aria-selected=${i === this._activeTab ? "true" : "false"}
              tabindex=${i === this._activeTab ? "0" : "-1"}
              @click=${() => { this._activeTab = i; }}
            >
              ${tab.icon ? html`<ha-icon .icon=${tab.icon}></ha-icon>` : nothing}
              <span>${tab.title || `Tab ${i + 1}`}</span>
            </div>
          `)}
        </div>
        <div class="tab-content" role="tabpanel">
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
      .tab:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
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
      hui-card:not([hidden]) {
        display: block;
      }
      .card-item:has(> hui-card[hidden]) {
        display: none;
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

  _moveTab(delta: number) {
    const tabs = [...(this._config.tabs || [])];
    const target = this._selectedTab + delta;
    if (target < 0 || target >= tabs.length) return;
    tabs.splice(target, 0, tabs.splice(this._selectedTab, 1)[0]);
    this._config = { ...this._config, tabs };
    this._selectedTab = target;
    this._fireConfigChanged();
  }

  _cardsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const tabs = [...(this._config.tabs || [])];
    tabs[this._selectedTab] = { ...tabs[this._selectedTab], cards: ev.detail.cards };
    this._config = { ...this._config, tabs };
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
                <div class="tab-actions">
                  <ha-icon-button
                    .label=${"Move tab left"}
                    .disabled=${this._selectedTab === 0}
                    @click=${() => this._moveTab(-1)}
                  >
                    <ha-icon .icon=${"mdi:arrow-left"}></ha-icon>
                  </ha-icon-button>
                  <ha-icon-button
                    .label=${"Move tab right"}
                    .disabled=${this._selectedTab === tabs.length - 1}
                    @click=${() => this._moveTab(1)}
                  >
                    <ha-icon .icon=${"mdi:arrow-right"}></ha-icon>
                  </ha-icon-button>
                  <ha-button class="delete-tab" @click=${this._deleteTab} .disabled=${tabs.length <= 1}>
                    <ha-icon .icon=${"mdi:delete"}></ha-icon>
                    Delete Tab
                  </ha-button>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  _renderCardsEditor() {
    const tab = this._config.tabs?.[this._selectedTab];
    return html`
      <div class="cards-editor">
        <div class="tab-selector">
          <span>Editing cards for: <strong>${tab?.title || `Tab ${this._selectedTab + 1}`}</strong></span>
        </div>
        ${keyed(
          this._selectedTab,
          html`<super-card-list-editor
            .hass=${this.hass}
            .lovelace=${this.lovelace}
            .cards=${tab?.cards || []}
            @cards-changed=${this._cardsChanged}
          ></super-card-list-editor>`
        )}
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
      #add-tab {
        max-width: 32px;
        padding: 0;
      }
      .tab-settings {
        border: 1px solid var(--divider-color);
        padding: 12px;
        margin-bottom: 8px;
      }
      .tab-actions {
        display: flex;
        align-items: center;
        margin-top: 8px;
      }
      .delete-tab {
        margin-left: auto;
        --mdc-theme-primary: var(--error-color, red);
      }
      .tab-selector {
        padding: 8px 0;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      #editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
    `;
  }
}

define("super-tab-card-editor", SuperTabCardEditor);
