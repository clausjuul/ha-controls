// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../shared/types';
import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";

// Area colors for visual distinction
const AREA_COLORS = [
  "rgba(66, 133, 244, 0.35)",   // blue
  "rgba(234, 67, 53, 0.35)",    // red
  "rgba(52, 168, 83, 0.35)",    // green
  "rgba(251, 188, 4, 0.35)",    // yellow
  "rgba(171, 71, 188, 0.35)",   // purple
  "rgba(255, 112, 67, 0.35)",   // orange
  "rgba(0, 172, 193, 0.35)",    // teal
  "rgba(124, 179, 66, 0.35)",   // lime
  "rgba(236, 64, 122, 0.35)",   // pink
  "rgba(38, 166, 154, 0.35)",   // cyan
];

const AREA_COLORS_SOLID = [
  "rgba(66, 133, 244, 0.7)",
  "rgba(234, 67, 53, 0.7)",
  "rgba(52, 168, 83, 0.7)",
  "rgba(251, 188, 4, 0.7)",
  "rgba(171, 71, 188, 0.7)",
  "rgba(255, 112, 67, 0.7)",
  "rgba(0, 172, 193, 0.7)",
  "rgba(124, 179, 66, 0.7)",
  "rgba(236, 64, 122, 0.7)",
  "rgba(38, 166, 154, 0.7)",
];

const SIZE_PRESETS = ["1fr", "2fr", "3fr", "auto", "min-content", "max-content"];

interface GridDesignerState {
  columns: string[];
  rows: string[];
  areas: string[][];
  gap: string;
}

class SuperGridDesigner extends LitElement {
  @property({ attribute: false }) config: any = {};
  @property({ attribute: false }) cards: any[] = [];

  @state() _columns: string[] = ["1fr", "1fr"];
  @state() _rows: string[] = ["auto", "auto"];
  @state() _areas: string[][] = [];
  @state() _gap = "8px";
  @state() _dragStart: { row: number; col: number } | null = null;
  @state() _dragEnd: { row: number; col: number } | null = null;
  @state() _currentAreaName = "";
  @state() _namingMode = false;
  @state() _editingSize: { type: "col" | "row"; index: number } | null = null;
  @state() _customSizeValue = "";

  private _areaColorMap: Map<string, number> = new Map();
  private _nextColorIndex = 0;
  private _initialized = false;

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has("config") && !this._initialized) {
      this._parseConfig();
      this._initialized = true;
    }
  }

  _parseConfig() {
    const layout = this.config || {};

    // Parse columns
    if (layout["grid-template-columns"]) {
      this._columns = this._parseCSSValues(layout["grid-template-columns"]);
    }

    // Parse rows
    if (layout["grid-template-rows"]) {
      this._rows = this._parseCSSValues(layout["grid-template-rows"]);
    }

    // Parse gap
    if (layout["grid-gap"]) {
      this._gap = layout["grid-gap"];
    }

    // Parse areas
    if (layout["grid-template-areas"]) {
      this._areas = this._parseGridAreas(layout["grid-template-areas"]);
      // Build color map from existing areas
      for (const row of this._areas) {
        for (const cell of row) {
          if (cell && cell !== "." && !this._areaColorMap.has(cell)) {
            this._areaColorMap.set(cell, this._nextColorIndex++);
          }
        }
      }
    }

    // Initialize areas grid if empty
    if (this._areas.length === 0) {
      this._initEmptyAreas();
    }
  }

  _parseCSSValues(value: string): string[] {
    if (!value) return ["1fr"];
    // Handle values like "1fr 2fr minmax(200px, 1fr)"
    const result: string[] = [];
    let current = "";
    let parenDepth = 0;
    for (const char of value.trim()) {
      if (char === "(") parenDepth++;
      if (char === ")") parenDepth--;
      if (char === " " && parenDepth === 0) {
        if (current.trim()) result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result.length > 0 ? result : ["1fr"];
  }

  _parseGridAreas(value: string): string[][] {
    if (!value) return [];
    // Parse: "header header" "left right" "footer footer"
    const rows: string[][] = [];
    const matches = value.match(/"([^"]*)"/g);
    if (matches) {
      for (const match of matches) {
        const row = match.replace(/"/g, "").trim().split(/\s+/);
        rows.push(row);
      }
    }
    return rows;
  }

  _initEmptyAreas() {
    this._areas = [];
    for (let r = 0; r < this._rows.length; r++) {
      const row: string[] = [];
      for (let c = 0; c < this._columns.length; c++) {
        row.push(".");
      }
      this._areas.push(row);
    }
  }

  _getAreaColor(name: string): string {
    if (!name || name === ".") return "transparent";
    if (!this._areaColorMap.has(name)) {
      this._areaColorMap.set(name, this._nextColorIndex++ % AREA_COLORS.length);
    }
    return AREA_COLORS[this._areaColorMap.get(name)! % AREA_COLORS.length];
  }

  _getAreaColorSolid(name: string): string {
    if (!name || name === ".") return "var(--divider-color)";
    if (!this._areaColorMap.has(name)) {
      this._areaColorMap.set(name, this._nextColorIndex++ % AREA_COLORS_SOLID.length);
    }
    return AREA_COLORS_SOLID[this._areaColorMap.get(name)! % AREA_COLORS_SOLID.length];
  }

  _uniqueAreaNames(): string[] {
    const names = new Set<string>();
    for (const row of this._areas) {
      for (const cell of row) {
        if (cell && cell !== ".") names.add(cell);
      }
    }
    return Array.from(names);
  }

  // --- Column/Row management ---

  _addColumn() {
    this._columns = [...this._columns, "1fr"];
    for (let r = 0; r < this._areas.length; r++) {
      this._areas[r] = [...this._areas[r], "."];
    }
    this._areas = [...this._areas];
    this._emitConfig();
  }

  _removeColumn(index: number) {
    if (this._columns.length <= 1) return;
    this._columns = this._columns.filter((_, i) => i !== index);
    for (let r = 0; r < this._areas.length; r++) {
      this._areas[r] = this._areas[r].filter((_, i) => i !== index);
    }
    this._areas = [...this._areas];
    this._emitConfig();
  }

  _addRow() {
    this._rows = [...this._rows, "auto"];
    const newRow = this._columns.map(() => ".");
    this._areas = [...this._areas, newRow];
    this._emitConfig();
  }

  _removeRow(index: number) {
    if (this._rows.length <= 1) return;
    this._rows = this._rows.filter((_, i) => i !== index);
    this._areas = this._areas.filter((_, i) => i !== index);
    this._emitConfig();
  }

  _changeColumnSize(index: number, value: string) {
    this._columns = this._columns.map((v, i) => (i === index ? value : v));
    this._emitConfig();
  }

  _changeRowSize(index: number, value: string) {
    this._rows = this._rows.map((v, i) => (i === index ? value : v));
    this._emitConfig();
  }

  _openCustomSize(type: "col" | "row", index: number) {
    const current = type === "col" ? this._columns[index] : this._rows[index];
    this._editingSize = { type, index };
    this._customSizeValue = current;
  }

  _confirmCustomSize() {
    if (!this._editingSize) return;
    const { type, index } = this._editingSize;
    const value = this._customSizeValue.trim() || "1fr";
    if (type === "col") {
      this._changeColumnSize(index, value);
    } else {
      this._changeRowSize(index, value);
    }
    this._editingSize = null;
    this._customSizeValue = "";
  }

  _cancelCustomSize() {
    this._editingSize = null;
    this._customSizeValue = "";
  }

  // --- Area naming via click/drag ---

  _cellMouseDown(row: number, col: number) {
    if (!this._namingMode || !this._currentAreaName.trim()) return;
    this._dragStart = { row, col };
    this._dragEnd = { row, col };
  }

  _cellMouseEnter(row: number, col: number) {
    if (this._dragStart) {
      this._dragEnd = { row, col };
    }
  }

  _cellMouseUp() {
    if (!this._dragStart || !this._dragEnd || !this._currentAreaName.trim()) {
      this._dragStart = null;
      this._dragEnd = null;
      return;
    }

    const name = this._currentAreaName.trim();
    const startRow = Math.min(this._dragStart.row, this._dragEnd.row);
    const endRow = Math.max(this._dragStart.row, this._dragEnd.row);
    const startCol = Math.min(this._dragStart.col, this._dragEnd.col);
    const endCol = Math.max(this._dragStart.col, this._dragEnd.col);

    // Validate: areas must be rectangular
    // First clear existing cells with this name
    for (let r = 0; r < this._areas.length; r++) {
      for (let c = 0; c < this._areas[r].length; c++) {
        if (this._areas[r][c] === name) {
          this._areas[r][c] = ".";
        }
      }
    }

    // Apply new area
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        this._areas[r][c] = name;
      }
    }

    this._areas = [...this._areas];
    this._dragStart = null;
    this._dragEnd = null;
    this._emitConfig();
  }

  _clearArea(name: string) {
    for (let r = 0; r < this._areas.length; r++) {
      for (let c = 0; c < this._areas[r].length; c++) {
        if (this._areas[r][c] === name) {
          this._areas[r][c] = ".";
        }
      }
    }
    this._areas = [...this._areas];
    this._areaColorMap.delete(name);
    this._emitConfig();
  }

  _clearCell(row: number, col: number) {
    if (this._namingMode) return; // Don't clear while naming
    this._areas[row][col] = ".";
    this._areas = [...this._areas];
    this._emitConfig();
  }

  // --- Gap control ---

  _gapChanged(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    this._gap = value + "px";
    this._emitConfig();
  }

  // --- Card assignment ---

  _cardAreaChanged(cardIndex: number, areaName: string) {
    const cards = [...this.cards];
    if (!cards[cardIndex]) return;
    cards[cardIndex] = {
      ...cards[cardIndex],
      view_layout: {
        ...(cards[cardIndex].view_layout || {}),
        "grid-area": areaName || undefined,
      },
    };
    // Clean up: if area is empty, remove grid-area
    if (!areaName) {
      const vl = { ...(cards[cardIndex].view_layout || {}) };
      delete vl["grid-area"];
      cards[cardIndex] = { ...cards[cardIndex], view_layout: Object.keys(vl).length > 0 ? vl : undefined };
    }
    this.dispatchEvent(
      new CustomEvent("cards-changed", { detail: { cards } })
    );
  }

  // --- Config generation & emit ---

  _generateConfig(): any {
    const layout: any = { ...this.config };

    layout["grid-template-columns"] = this._columns.join(" ");
    layout["grid-template-rows"] = this._rows.join(" ");
    layout["grid-gap"] = this._gap;

    // Generate grid-template-areas only if any named areas
    const hasAreas = this._areas.some((row) => row.some((c) => c !== "."));
    if (hasAreas) {
      layout["grid-template-areas"] = this._areas
        .map((row) => `"${row.join(" ")}"`)
        .join(" ");
    } else {
      delete layout["grid-template-areas"];
    }

    return layout;
  }

  _emitConfig() {
    const layout = this._generateConfig();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { layout },
      })
    );
  }

  // --- Drag highlight helpers ---

  _isCellInDrag(row: number, col: number): boolean {
    if (!this._dragStart || !this._dragEnd) return false;
    const startRow = Math.min(this._dragStart.row, this._dragEnd.row);
    const endRow = Math.max(this._dragStart.row, this._dragEnd.row);
    const startCol = Math.min(this._dragStart.col, this._dragEnd.col);
    const endCol = Math.max(this._dragStart.col, this._dragEnd.col);
    return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
  }

  // --- Rendering ---

  render() {
    return html`
      <div class="grid-designer">
        <!-- Grid Preview -->
        <div class="section">
          <div class="section-title">
            <ha-icon icon="mdi:grid"></ha-icon>
            Grid Preview
          </div>

          <!-- Scrollable area: column headers + canvas stay aligned -->
          <div class="grid-canvas-wrapper">
            <!-- Column headers with sizes -->
            <div class="col-headers" style="grid-template-columns: 40px ${this._columns.join(" ")} 32px;">
              <div class="corner"></div>
              ${this._columns.map(
                (size, i) => html`
                  <div class="col-header">
                    <select
                      .value=${SIZE_PRESETS.includes(size) ? size : "__custom__"}
                      @change=${(ev: Event) => {
                        const val = (ev.target as HTMLSelectElement).value;
                        if (val === "__custom__") {
                          this._openCustomSize("col", i);
                        } else {
                          this._changeColumnSize(i, val);
                        }
                      }}
                    >
                      ${SIZE_PRESETS.map(
                        (p) => html`<option .value=${p} ?selected=${size === p}>${p}</option>`
                      )}
                      <option value="__custom__" ?selected=${!SIZE_PRESETS.includes(size)}>
                        ${!SIZE_PRESETS.includes(size) ? size : "Custom..."}
                      </option>
                    </select>
                    ${this._columns.length > 1
                      ? html`<button class="remove-btn" @click=${() => this._removeColumn(i)} title="Remove column" aria-label="Remove column">×</button>`
                      : nothing}
                  </div>
                `
              )}
              <button class="add-btn" @click=${this._addColumn} title="Add column" aria-label="Add column">
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>

            <!-- Grid canvas -->
            <div
              class="grid-canvas"
              style="
                grid-template-columns: 40px ${this._columns.join(" ")};
                grid-template-rows: ${this._rows.join(" ")};
                gap: ${this._gap};
              "
              @mouseup=${this._cellMouseUp}
              @mouseleave=${() => {
                if (this._dragStart) {
                  this._dragStart = null;
                  this._dragEnd = null;
                }
              }}
            >
              ${this._rows.map(
                (rowSize, r) => html`
                  <!-- Row header -->
                  <div class="row-header" style="grid-row: ${r + 1}; grid-column: 1;">
                    <select
                      .value=${SIZE_PRESETS.includes(rowSize) ? rowSize : "__custom__"}
                      @change=${(ev: Event) => {
                        const val = (ev.target as HTMLSelectElement).value;
                        if (val === "__custom__") {
                          this._openCustomSize("row", r);
                        } else {
                          this._changeRowSize(r, val);
                        }
                      }}
                    >
                      ${SIZE_PRESETS.map(
                        (p) => html`<option .value=${p} ?selected=${rowSize === p}>${p}</option>`
                      )}
                      <option value="__custom__" ?selected=${!SIZE_PRESETS.includes(rowSize)}>
                        ${!SIZE_PRESETS.includes(rowSize) ? rowSize : "Custom..."}
                      </option>
                    </select>
                    ${this._rows.length > 1
                      ? html`<button class="remove-btn" @click=${() => this._removeRow(r)} title="Remove row" aria-label="Remove row">×</button>`
                      : nothing}
                  </div>
                  <!-- Cells -->
                  ${this._columns.map((_, c) => {
                    const areaName = this._areas[r]?.[c] || ".";
                    const inDrag = this._isCellInDrag(r, c);
                    const bgColor = inDrag
                      ? "rgba(66, 133, 244, 0.5)"
                      : this._getAreaColor(areaName);
                    const cardIndex = this._getCardForArea(areaName);
                    return html`
                      <div
                        class="grid-cell ${this._namingMode ? "naming" : ""} ${areaName !== "." ? "has-area" : ""}"
                        style="
                          grid-row: ${r + 1};
                          grid-column: ${c + 2};
                          background: ${bgColor};
                        "
                        @mousedown=${() => this._cellMouseDown(r, c)}
                        @mouseenter=${() => this._cellMouseEnter(r, c)}
                        @contextmenu=${(e: Event) => {
                          e.preventDefault();
                          this._clearCell(r, c);
                        }}
                      >
                        <span class="cell-label">
                          ${areaName !== "."
                            ? html`
                                <span class="area-name">${areaName}</span>
                                ${cardIndex >= 0
                                  ? html`<span class="card-badge">Card ${cardIndex + 1}</span>`
                                  : nothing}
                              `
                            : html`<span class="cell-dot">·</span>`}
                        </span>
                      </div>
                    `;
                  })}
                `
              )}
            </div>

            <!-- Add row button -->
            <div class="add-row-container">
              <button class="add-btn add-row-btn" @click=${this._addRow} title="Add row" aria-label="Add row">
                <ha-icon icon="mdi:plus"></ha-icon>
                <span>Row</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Custom size dialog -->
        ${this._editingSize
          ? html`
              <div class="custom-size-dialog">
                <label>Custom ${this._editingSize.type === "col" ? "column" : "row"} size:</label>
                <input
                  type="text"
                  .value=${this._customSizeValue}
                  @input=${(ev: Event) => {
                    this._customSizeValue = (ev.target as HTMLInputElement).value;
                  }}
                  @keydown=${(ev: KeyboardEvent) => {
                    if (ev.key === "Enter") this._confirmCustomSize();
                    if (ev.key === "Escape") this._cancelCustomSize();
                  }}
                  placeholder="e.g. minmax(200px, 1fr)"
                />
                <div class="dialog-buttons">
                  <button class="dialog-btn confirm" @click=${this._confirmCustomSize}>Apply</button>
                  <button class="dialog-btn cancel" @click=${this._cancelCustomSize}>Cancel</button>
                </div>
              </div>
            `
          : nothing}

        <!-- Area Naming -->
        <div class="section">
          <div class="section-title">
            <ha-icon icon="mdi:label-outline"></ha-icon>
            Area Naming
          </div>
          <div class="naming-controls">
            <div class="naming-input-row">
              <input
                type="text"
                class="area-name-input"
                .value=${this._currentAreaName}
                @input=${(ev: Event) => {
                  this._currentAreaName = (ev.target as HTMLInputElement).value
                    .replace(/[^a-zA-Z0-9_-]/g, "");
                }}
                placeholder="Area name (e.g. header)"
                aria-label="Area name"
                ?disabled=${!this._namingMode}
              />
              <button
                class="naming-toggle ${this._namingMode ? "active" : ""}"
                @click=${() => {
                  this._namingMode = !this._namingMode;
                  if (!this._namingMode) {
                    this._dragStart = null;
                    this._dragEnd = null;
                  }
                }}
              >
                <ha-icon icon=${this._namingMode ? "mdi:cursor-default-click" : "mdi:draw"}></ha-icon>
                ${this._namingMode ? "Drawing..." : "Draw Areas"}
              </button>
            </div>
            ${this._namingMode
              ? html`<div class="naming-hint">
                  Click and drag on the grid to assign the area name. Right-click a cell to clear it.
                </div>`
              : nothing}
          </div>

          <!-- Existing areas -->
          ${this._uniqueAreaNames().length > 0
            ? html`
                <div class="area-chips">
                  ${this._uniqueAreaNames().map(
                    (name) => html`
                      <div
                        class="area-chip"
                        style="border-left: 4px solid ${this._getAreaColorSolid(name)};"
                      >
                        <span class="chip-name">${name}</span>
                        <button
                          class="chip-use"
                          @click=${() => {
                            this._currentAreaName = name;
                            this._namingMode = true;
                          }}
                          title="Select this area for drawing"
                        >
                          <ha-icon icon="mdi:draw"></ha-icon>
                        </button>
                        <button
                          class="chip-remove"
                          @click=${() => this._clearArea(name)}
                          title="Remove area"
                        >
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>
                      </div>
                    `
                  )}
                </div>
              `
            : nothing}
        </div>

        <!-- Gap Control -->
        <div class="section">
          <div class="section-title">
            <ha-icon icon="mdi:arrow-expand-horizontal"></ha-icon>
            Grid Gap
          </div>
          <div class="gap-control">
            <input
              type="range"
              min="0"
              max="32"
              .value=${parseInt(this._gap) || 0}
              @input=${this._gapChanged}
              class="gap-slider"
            />
            <span class="gap-value">${this._gap}</span>
          </div>
        </div>

        <!-- Card Assignment -->
        ${this.cards && this.cards.length > 0 && this._uniqueAreaNames().length > 0
          ? html`
              <div class="section">
                <div class="section-title">
                  <ha-icon icon="mdi:cards-outline"></ha-icon>
                  Card → Area Assignment
                </div>
                <div class="card-assignments">
                  ${this.cards.map(
                    (card, i) => html`
                      <div class="card-assignment">
                        <div class="card-info">
                          <span class="card-number">${i + 1}</span>
                          <span class="card-type">${card.type || "unknown"}</span>
                        </div>
                        <select
                          .value=${card.view_layout?.["grid-area"] || ""}
                          @change=${(ev: Event) => {
                            this._cardAreaChanged(i, (ev.target as HTMLSelectElement).value);
                          }}
                        >
                          <option value="">— None —</option>
                          ${this._uniqueAreaNames().map(
                            (name) => html`
                              <option
                                .value=${name}
                                ?selected=${card.view_layout?.["grid-area"] === name}
                              >
                                ${name}
                              </option>
                            `
                          )}
                        </select>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  _getCardForArea(areaName: string): number {
    if (!areaName || areaName === "." || !this.cards) return -1;
    return this.cards.findIndex(
      (card) => card.view_layout?.["grid-area"] === areaName
    );
  }

  static styles = css`
    :host {
      display: block;
      --designer-bg: var(--card-background-color, #1c1c1c);
      --designer-border: var(--divider-color, #333);
      --designer-text: var(--primary-text-color, #fff);
      --designer-text-secondary: var(--secondary-text-color, #aaa);
      --designer-primary: var(--primary-color, #4285f4);
      --designer-radius: 8px;
    }

    .grid-designer {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section {
      background: var(--designer-bg);
      border: 1px solid var(--designer-border);
      border-radius: var(--designer-radius);
      padding: 12px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--designer-text);
      margin-bottom: 10px;
    }
    .section-title ha-icon {
      --mdc-icon-size: 18px;
      color: var(--designer-primary);
    }

    /* Column headers */
    .col-headers {
      display: grid;
      gap: 4px;
      align-items: end;
      margin-bottom: 4px;
    }
    .corner {
      width: 40px;
    }
    .col-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 0;
    }
    .col-header select,
    .row-header select {
      width: 100%;
      max-width: 100px;
      padding: 2px 4px;
      font-size: 11px;
      background: var(--designer-bg);
      color: var(--designer-text);
      border: 1px solid var(--designer-border);
      border-radius: 4px;
      cursor: pointer;
    }

    /* Grid canvas */
    .grid-canvas-wrapper {
      position: relative;
      overflow-x: auto;
      overflow-y: visible;
      max-width: 100%;
    }
    .grid-canvas-wrapper .col-headers,
    .grid-canvas-wrapper .grid-canvas {
      width: max-content;
      min-width: 100%;
    }
    .grid-canvas {
      display: grid;
      min-height: 120px;
      user-select: none;
      border: 2px dashed var(--designer-border);
      border-radius: 6px;
      padding: 4px;
    }

    .row-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 2px;
    }
    .row-header select {
      max-width: 70px;
      writing-mode: horizontal-tb;
    }

    .grid-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      border: 1px dashed var(--designer-border);
      border-radius: 4px;
      transition: background 0.15s ease;
      cursor: default;
      position: relative;
    }
    .grid-cell.naming {
      cursor: crosshair;
    }
    .grid-cell.naming:hover {
      border-color: var(--designer-primary);
      box-shadow: inset 0 0 0 2px rgba(66, 133, 244, 0.3);
    }
    .grid-cell.has-area {
      border-style: solid;
    }

    .cell-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
    }
    .area-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--designer-text);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    .card-badge {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
    }
    .cell-dot {
      font-size: 18px;
      color: var(--designer-text-secondary);
      opacity: 0.4;
    }

    /* Add/Remove buttons */
    .add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px;
      background: none;
      border: 1px dashed var(--designer-border);
      border-radius: 4px;
      color: var(--designer-text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .add-btn:hover {
      border-color: var(--designer-primary);
      color: var(--designer-primary);
      background: rgba(66, 133, 244, 0.1);
    }
    .add-btn ha-icon {
      --mdc-icon-size: 16px;
    }

    .add-row-container {
      display: flex;
      justify-content: center;
      margin-top: 4px;
    }
    .add-row-btn {
      padding: 4px 16px;
      font-size: 12px;
    }

    .remove-btn {
      width: 18px;
      height: 18px;
      padding: 0;
      font-size: 14px;
      line-height: 1;
      background: none;
      border: none;
      color: var(--designer-text-secondary);
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .remove-btn:hover {
      background: rgba(234, 67, 53, 0.2);
      color: #ea4335;
    }

    /* Custom size dialog */
    .custom-size-dialog {
      background: var(--designer-bg);
      border: 1px solid var(--designer-primary);
      border-radius: var(--designer-radius);
      padding: 12px;
      margin: -8px 0;
    }
    .custom-size-dialog label {
      font-size: 12px;
      color: var(--designer-text-secondary);
      display: block;
      margin-bottom: 6px;
    }
    .custom-size-dialog input {
      width: 100%;
      padding: 6px 8px;
      font-size: 13px;
      background: var(--designer-bg);
      color: var(--designer-text);
      border: 1px solid var(--designer-border);
      border-radius: 4px;
      box-sizing: border-box;
      margin-bottom: 8px;
    }
    .dialog-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .dialog-btn {
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid var(--designer-border);
      border-radius: 4px;
      cursor: pointer;
      background: none;
      color: var(--designer-text);
    }
    .dialog-btn.confirm {
      background: var(--designer-primary);
      border-color: var(--designer-primary);
      color: #fff;
    }
    .dialog-btn.cancel:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* Naming controls */
    .naming-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .naming-input-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .area-name-input {
      flex: 1;
      padding: 6px 8px;
      font-size: 13px;
      background: var(--designer-bg);
      color: var(--designer-text);
      border: 1px solid var(--designer-border);
      border-radius: 4px;
    }
    .area-name-input:disabled {
      opacity: 0.5;
    }
    .naming-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      font-size: 12px;
      background: none;
      border: 1px solid var(--designer-border);
      border-radius: 4px;
      color: var(--designer-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .naming-toggle:hover {
      border-color: var(--designer-primary);
    }
    .naming-toggle.active {
      background: rgba(66, 133, 244, 0.15);
      border-color: var(--designer-primary);
      color: var(--designer-primary);
    }
    .naming-toggle ha-icon {
      --mdc-icon-size: 16px;
    }
    .naming-hint {
      font-size: 11px;
      color: var(--designer-text-secondary);
      font-style: italic;
      padding: 4px 0;
    }

    /* Area chips */
    .area-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .area-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px 4px 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      font-size: 12px;
    }
    .chip-name {
      color: var(--designer-text);
      font-weight: 500;
    }
    .chip-use,
    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      color: var(--designer-text-secondary);
      cursor: pointer;
      border-radius: 50%;
    }
    .chip-use:hover {
      background: rgba(66, 133, 244, 0.2);
      color: var(--designer-primary);
    }
    .chip-remove:hover {
      background: rgba(234, 67, 53, 0.2);
      color: #ea4335;
    }
    .chip-use ha-icon,
    .chip-remove ha-icon {
      --mdc-icon-size: 14px;
    }

    /* Gap control */
    .gap-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .gap-slider {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      border-radius: 2px;
      background: var(--designer-border);
      outline: none;
    }
    .gap-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--designer-primary);
      cursor: pointer;
    }
    .gap-value {
      font-size: 13px;
      color: var(--designer-text);
      min-width: 40px;
      text-align: right;
    }

    /* Card assignments */
    .card-assignments {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card-assignment {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      border: 1px solid var(--designer-border);
    }
    .card-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .card-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--designer-primary);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .card-type {
      font-size: 12px;
      color: var(--designer-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-assignment select {
      padding: 4px 6px;
      font-size: 12px;
      background: var(--designer-bg);
      color: var(--designer-text);
      border: 1px solid var(--designer-border);
      border-radius: 4px;
      cursor: pointer;
      min-width: 100px;
    }
  `;
}

define("super-grid-designer", SuperGridDesigner);
