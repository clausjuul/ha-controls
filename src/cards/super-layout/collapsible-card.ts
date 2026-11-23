// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { CollapsibleCardConfig, CardConfig, LovelaceCard } from "./types";
import { safeCreateCards, safeRebuildCard, sumCardSizes } from "./card-helpers";
import "./card-list-editor";

// Older versions defaulted (and wrote via the stub) icon: mdi:chevron-down,
// which duplicated the chevron on the right; treat it as "no icon".
const LEGACY_DEFAULT_ICON = "mdi:chevron-down";

class SuperCollapsibleCard extends LitElement {
  @property() hass;
  @property() editMode = false;
  @state() _collapsed = true;
  @property() _config: CollapsibleCardConfig;
  @property() _cards: Array<LovelaceCard> = [];

  setConfig(config: CollapsibleCardConfig) {
    this._config = {
      title: "Section",
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
      el, cardConfig, () => this._cards, this.hass,
      (el2, config) => this._rebuildCard(el2, config)
    );
  }

  _toggle() {
    this._collapsed = !this._collapsed;
  }

  getCardSize() {
    return this._collapsed ? 1 : 1 + sumCardSizes(this._cards);
  }

  _onHeaderKey(ev: KeyboardEvent) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    this._toggle();
  }

  render() {
    const expanded = !this._collapsed;
    return html`
      <ha-card>
        <div
          class="header"
          role="button"
          tabindex="0"
          aria-expanded=${expanded ? "true" : "false"}
          aria-controls="content"
          @click=${this._toggle}
          @keydown=${this._onHeaderKey}
        >
          ${this._config.icon && this._config.icon !== LEGACY_DEFAULT_ICON
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : nothing}
          <span class="title">${this._config.title}</span>
          <ha-icon
            class="chevron ${expanded ? "open" : ""}"
            .icon=${"mdi:chevron-down"}
          ></ha-icon>
        </div>
        <div id="content" class="content ${expanded ? "expanded" : "collapsed"}">
          <div class="content-inner" ?inert=${!expanded}>
            ${this._cards.map(
              (card) => html`<div class="card-item">${card}</div>`
            )}
          </div>
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
      .header:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
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
        transform: rotate(-90deg);
      }
      .chevron.open {
        transform: rotate(0deg);
      }
      /* Animates to the content's real height (no max-height guess). */
      .content {
        display: grid;
        grid-template-rows: 1fr;
        opacity: 1;
        transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
      }
      .content.collapsed {
        grid-template-rows: 0fr;
        opacity: 0;
      }
      .content-inner {
        min-height: 0;
        overflow: hidden;
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
    return document.createElement("super-collapsible-card-editor");
  }
  static getStubConfig() {
    return {
      title: "Section",
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

define("super-collapsible-card-editor", SuperCollapsibleCardEditor);
