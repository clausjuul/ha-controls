import { define } from '../../shared/types';
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import type { FormSchema, Hass, ValueChangedEvent } from "./types";

interface GapCardConfig {
  type?: string;
  /** Height in px (default 50). */
  height?: number;
  /** Card size reported to layouts (default: height / 50, rounded up). */
  size?: number;
}

// SuperGapCard extends HTMLElement directly (not LitElement) since it needs no shadow DOM.
class SuperGapCard extends HTMLElement {
  height = 50;
  size = 1;

  setConfig(config: GapCardConfig) {
    this.height = config.height ?? 50;
    this.size = config.size ?? Math.ceil(this.height / 50);
    this.style.cssText = `
      display: block;
      height: ${this.height}px;
    `;
  }

  getCardSize() {
    return this.size;
  }

  static getConfigElement() {
    return document.createElement("super-gap-card-editor");
  }
  static getStubConfig() {
    return {};
  }
}

define("super-gap-card", SuperGapCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "super-gap-card",
  name: "Super Gap Card",
  preview: false,
  description: "Add a customizable gap in the layout.",
});

const LABELS: Record<string, string> = {
  height: "Height (px)",
  size: "Layout size",
};

class SuperGapCardEditor extends LitElement {
  @property({ attribute: false }) _config?: GapCardConfig;
  @property({ attribute: false }) hass?: Hass;

  setConfig(config: GapCardConfig) {
    this._config = config;
  }

  _schema: FormSchema[] = [
    {
      name: "height",
      selector: { number: { min: 0, max: 500, unit_of_measurement: "px", mode: "slider" } },
    },
    {
      name: "size",
      selector: { number: { min: 0, max: 20, mode: "slider" } },
    },
  ];

  _valueChanged(ev: ValueChangedEvent<GapCardConfig>) {
    ev.stopPropagation();
    const config = ev.detail.value;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config } })
    );
  }

  _computeLabel(schema: FormSchema): string {
    return LABELS[schema.name] || schema.name;
  }

  render() {
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
}

define("super-gap-card-editor", SuperGapCardEditor);
