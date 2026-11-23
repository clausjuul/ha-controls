// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { css, html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";
import { CardConfig } from "./types";

/**
 * The child-card list used by every super-layout editor: one tab per card plus
 * an add tab, move/delete buttons, the GUI/YAML toggle, HA's card editor and
 * the card picker. Fires `cards-changed` with `{ cards }`; the parent owns the
 * array. `renderExtra(index)` adds content below the selected card's editor.
 */
class SuperCardListEditor extends LitElement {
  @property({ attribute: false }) hass;
  @property({ attribute: false }) lovelace;
  @property({ attribute: false }) cards: CardConfig[] = [];
  @property({ attribute: false }) renderExtra?: (index: number) => unknown;

  @state() _selected = 0;
  @state() _guiMode = true;
  @state() _guiModeAvailable = true;

  @query("hui-card-element-editor") _cardEditor?;

  willUpdate() {
    const max = (this.cards || []).length;
    if (this._selected > max) this._selected = max;
  }

  _emit(cards: CardConfig[], selected: number) {
    this._selected = selected;
    this.dispatchEvent(new CustomEvent("cards-changed", { detail: { cards } }));
  }

  _selectTab(ev: CustomEvent) {
    ev.stopPropagation();
    const name = ev.detail.name;
    this._selected = name === "add-card" ? this.cards.length : parseInt(name, 10);
    this._guiMode = true;
    this._guiModeAvailable = true;
    if (this._cardEditor) this._cardEditor.GUImode = true;
  }

  _add(ev: CustomEvent) {
    ev.stopPropagation();
    this._emit([...this.cards, ev.detail.config], this.cards.length);
  }

  _update(ev: CustomEvent) {
    ev.stopPropagation();
    const cards = [...this.cards];
    cards[this._selected] = ev.detail.config;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    this._emit(cards, this._selected);
  }

  _move(delta: number) {
    const source = this._selected;
    const target = source + delta;
    const cards = [...this.cards];
    cards.splice(target, 0, cards.splice(source, 1)[0]);
    this._emit(cards, target);
  }

  _delete() {
    const cards = [...this.cards];
    cards.splice(this._selected, 1);
    this._emit(cards, Math.max(0, this._selected - 1));
  }

  _guiModeChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._guiMode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  render() {
    const cards = this.cards || [];
    const selected = this._selected;
    const count = cards.length;
    return html`
      <ha-tab-group @wa-tab-show=${this._selectTab}>
        ${cards.map(
          (_card, i) => html`
            <ha-tab-group-tab slot="nav" .active=${selected === i} .panel=${i}>
              ${i + 1}
            </ha-tab-group-tab>
          `
        )}
        <ha-tab-group-tab
          slot="nav"
          .active=${selected === count}
          .panel=${"add-card"}
          id="add-card"
        >
          <ha-icon .icon=${"mdi:plus"}></ha-icon>
        </ha-tab-group-tab>
      </ha-tab-group>
      <div id="card-editor">
        ${selected < count
          ? html`
              <div class="card-options">
                <ha-button
                  class="gui-mode-button"
                  .disabled=${!this._guiModeAvailable}
                  @click=${() => this._cardEditor?.toggleMode()}
                >
                  ${this.hass.localize(
                    this._guiMode
                      ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                      : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                  )}
                </ha-button>
                <ha-icon-button
                  .label=${"Move left"}
                  .disabled=${selected === 0}
                  @click=${() => this._move(-1)}
                >
                  <ha-icon .icon=${"mdi:arrow-left"}></ha-icon>
                </ha-icon-button>
                <ha-icon-button
                  .label=${"Move right"}
                  .disabled=${selected === count - 1}
                  @click=${() => this._move(1)}
                >
                  <ha-icon .icon=${"mdi:arrow-right"}></ha-icon>
                </ha-icon-button>
                <ha-icon-button .label=${"Delete"} @click=${this._delete}>
                  <ha-icon .icon=${"mdi:delete"}></ha-icon>
                </ha-icon-button>
              </div>
              <hui-card-element-editor
                .hass=${this.hass}
                .value=${cards[selected]}
                .lovelace=${this.lovelace}
                @config-changed=${this._update}
                @GUImode-changed=${this._guiModeChanged}
              ></hui-card-element-editor>
              ${this.renderExtra?.(selected) ?? nothing}
            `
          : html`
              <hui-card-picker
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                @config-changed=${this._add}
              ></hui-card-picker>
            `}
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-tab-group {
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
      .card-options {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
      }
      .gui-mode-button {
        margin-right: auto;
      }
      #card-editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
    `;
  }
}

define("super-card-list-editor", SuperCardListEditor);
