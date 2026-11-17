// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

// SuperGapCard extends HTMLElement directly (not LitElement) since it needs no shadow DOM.
// LitElement and html are used by SuperGapCardEditor below.
class SuperGapCard extends HTMLElement {
  height: number;
  size: number;

  setConfig(config) {
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
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "super-gap-card",
  name: "Super Gap Card",
  preview: false,
  description: "Add a customizable gap in the layout.",
});

class SuperGapCardEditor extends LitElement {
  @property() _config;
  @property() hass;

  setConfig(config) {
    this._config = config;
  }

  _schema = [
    {
      name: "height",
      selector: { number: { min: 0, max: 500, unit_of_measurement: "px", mode: "slider" } },
    },
    {
      name: "size",
      selector: { number: { min: 0, max: 20, mode: "slider" } },
    },
  ];

  _valueChanged(ev) {
    ev.stopPropagation();
    const config = ev.detail.value;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config } })
    );
  }

  _computeLabel(schema) {
    const labels = {
      height: "Height (px)",
      size: "Layout size",
    };
    return labels[schema.name] || schema.name;
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
