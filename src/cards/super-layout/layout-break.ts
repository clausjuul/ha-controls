import { define } from '../../shared/types';
class SuperLayoutBreak extends HTMLElement {
  setConfig() {
    this.style.display = "none";
    const display = document.createElement("ha-card");
    display.innerHTML = "BREAK";
    display.style.cssText = `
      background: red;
      text-align: center;
      font-size: large;
      color: white;
      padding: 16px;
      `;
    this.appendChild(display);
  }
  getCardSize() {
    return 0;
  }
  set editMode(editMode: boolean) {
    this.style.display = editMode ? "block" : "none";
  }

  static getConfigElement() {
    return document.createElement("super-layout-break-editor");
  }
  static getStubConfig() {
    return {};
  }
}

define("super-layout-break", SuperLayoutBreak);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "super-layout-break",
  name: "Super Layout Break",
  preview: false,
  description:
    "Forces a break in the layout flow. For use with super-layout-card.",
});

class SuperLayoutBreakEditor extends HTMLElement {
  setConfig() {
    const div = document.createElement("div");
    div.innerHTML = "BREAK";
    this.appendChild(div);
  }
}

define("super-layout-break-editor", SuperLayoutBreakEditor);
