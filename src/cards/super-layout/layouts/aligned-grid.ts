// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../../shared/types';
import { css, html } from "lit";
import { property } from "lit/decorators.js";
import {
  AlignedGridViewConfig,
  CardConfig,
  CardConfigGroup,
  HuiCard,
  LovelaceCard,
} from "../types";
import { BaseLayout } from "./base-layout";
import { AutoHideHeader, getHeaderHeight, hideHeader, releaseHeader, VH } from "./header";

class SuperAlignedGridLayout extends BaseLayout {
  @property() _config: AlignedGridViewConfig;

  _autoHide = new AutoHideHeader();
  _cancelHideHeader = () => {};
  _mediaQueries: Array<MediaQueryList | null> = [];
  _mqListener = () => this._placeCards();

  async setConfig(config: AlignedGridViewConfig) {
    await super.setConfig(config);
    this._setupMediaQueryListeners();
    this._setGridStyles();
  }

  /** Per-card `show: {mediaquery}` listeners; rebuilt on reconnect. */
  _setupMediaQueryListeners() {
    this._cleanupMediaQueryListeners();
    this._mediaQueries = (this._config?.cards || []).map((card) => {
      const query =
        typeof card.view_layout?.show === "object"
          ? card.view_layout.show.mediaquery
          : undefined;
      if (!query) return null;
      const mq = window.matchMedia(query);
      mq.addEventListener("change", this._mqListener);
      return mq;
    });
  }

  _cleanupMediaQueryListeners() {
    for (const mq of this._mediaQueries) {
      mq?.removeEventListener("change", this._mqListener);
    }
    this._mediaQueries = [];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) return;
    // Reattached after a DOM move: restore what disconnectedCallback removed.
    this._setupMediaQueryListeners();
    this._setGridStyles();
    this._setupAutoHideHeader();
    if (this._mediaQueries.some(Boolean)) this._placeCards();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupMediaQueryListeners();
    this._autoHide.detach();
    this._cancelHideHeader();
    releaseHeader(this);
  }

  async updated(changedProperties) {
    await super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._placeCards();
    }
  }

  async firstUpdated() {
    this._setGridStyles();
    this._setupAutoHideHeader();

    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      :host {
        --layout-margin: ${this._config.layout?.margin ?? "0px 4px 0px 4px"};
        --layout-padding: ${this._config.layout?.padding ?? "4px 0px 4px 0px"};
        --layout-height: ${this._config.layout?.height ?? "auto"};
        --layout-overflow: ${
          this._config.layout?.height !== undefined ? "auto" : "visible"
        };
      }`;
    this.shadowRoot.appendChild(styleEl);
  }

  _setGridStyles() {
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;
    const layout = this._config.layout || {};

    root.style.cssText = "";
    root.style.setProperty(
      "grid-template-columns",
      layout.column_widths || "1fr"
    );
    root.style.setProperty("gap", layout.gap || "8px");
    root.style.setProperty("justify-content", layout["justify-content"] || "start");
    root.style.setProperty("align-content", layout["align-content"] || "start");

    this._applyFullscreen();
  }

  _applyFullscreen() {
    if (!this._config.layout?.fullscreen) return;
    const root = this.shadowRoot?.querySelector("#root") as HTMLElement;
    if (!root) return;

    if (this._config.layout?.hide_header) {
      this._cancelHideHeader();
      this._cancelHideHeader = hideHeader(this);
      root.style.setProperty("height", `${VH}`);
    } else {
      root.style.setProperty("height", `calc(${VH} - ${getHeaderHeight()}px)`);
    }
    root.style.setProperty("overflow", "auto");
  }

  _setupAutoHideHeader() {
    if (!this._config.layout?.auto_hide_header) return;
    this._autoHide.attach(this.shadowRoot?.querySelector("#root") || window);
  }

  _shouldShow(card: LovelaceCard | HuiCard, config: CardConfig, index: number) {
    if (!super._shouldShow(card, config, index)) return false;
    return this._mediaQueries[index]?.matches ?? true;
  }

  _placeCards() {
    const root = this.shadowRoot?.querySelector("#root");
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);

    const layout = this._config.layout || {};
    const numCols = (layout.column_widths || "1fr")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const bottomFill = layout["align-content"] === "end";

    const cards: CardConfigGroup[] = this.cards.map((card, index) => {
      const config = this._config.cards[index];
      return {
        card,
        config,
        index,
        show: this._shouldShow(card, config, index),
      };
    });

    const visible = cards.filter((c) => this.lovelace?.editMode || c.show);

    if (bottomFill) {
      const placements = this._computeBottomFillPlacements(visible, numCols);
      for (let i = 0; i < visible.length; i++) {
        const card = visible[i];
        const p = placements[i];
        const el = this.getCardElement(card);
        el.style.setProperty("grid-column-start", String(p.col));
        el.style.setProperty("grid-row-start", String(p.row));
        if (p.cs > 1) el.style.setProperty("grid-column-end", `span ${p.cs}`);
        if (p.rs > 1) el.style.setProperty("grid-row-end", `span ${p.rs}`);
        root.appendChild(el);
      }
      return;
    }

    // Default (non-bottom) alignment: let CSS handle auto-flow.
    for (const card of visible) {
      const el = this.getCardElement(card);
      const vl = card.config?.view_layout ?? {};
      if (typeof vl.column === "number" && vl.column > 0) {
        el.style.setProperty("grid-column-start", String(vl.column));
      }
      if (typeof vl.column_span === "number" && vl.column_span > 0) {
        el.style.setProperty("grid-column-end", `span ${vl.column_span}`);
      }
      if (typeof vl.row === "number" && vl.row > 0) {
        el.style.setProperty("grid-row-start", String(vl.row));
      }
      if (typeof vl.row_span === "number" && vl.row_span > 0) {
        el.style.setProperty("grid-row-end", `span ${vl.row_span}`);
      }
      root.appendChild(el);
    }
  }

  // Pre-compute placements so the bottom-fill anchor remains valid even when
  // cards declare column/row/spans. Manual positions are honored; remaining
  // cards are filled from the bottom-most row upward, sized cards placed
  // largest-first to reduce fragmentation. Grid grows in row count until all
  // cards fit.
  _computeBottomFillPlacements(
    visible: CardConfigGroup[],
    numCols: number
  ): Array<{ col: number; row: number; cs: number; rs: number }> {
    type Slot = {
      idx: number;
      col: number | null;
      row: number | null;
      cs: number;
      rs: number;
    };
    const slots: Slot[] = visible.map((c, idx) => {
      const vl = c.config?.view_layout ?? {};
      const col =
        typeof vl.column === "number" && vl.column > 0 ? vl.column : null;
      const row = typeof vl.row === "number" && vl.row > 0 ? vl.row : null;
      const cs =
        typeof vl.column_span === "number" && vl.column_span > 0
          ? Math.min(vl.column_span, numCols)
          : 1;
      const rs =
        typeof vl.row_span === "number" && vl.row_span > 0 ? vl.row_span : 1;
      return { idx, col, row, cs, rs };
    });

    const manualMaxRow = slots
      .filter((s) => s.row !== null)
      .reduce((max, s) => Math.max(max, (s.row as number) + s.rs - 1), 0);
    const autoCells = slots
      .filter((s) => s.col === null || s.row === null)
      .reduce((sum, s) => sum + s.cs * s.rs, 0);
    let numRows = Math.max(
      manualMaxRow,
      Math.ceil(autoCells / numCols) || 0,
      1
    );

    const attempt = (rows: number) => {
      const occ = new Set<string>();
      const key = (r: number, c: number) => `${r},${c}`;
      const mark = (col: number, row: number, cs: number, rs: number) => {
        for (let r = row; r < row + rs; r++) {
          for (let c = col; c < col + cs; c++) {
            occ.add(key(r, c));
          }
        }
      };
      const free = (col: number, row: number, cs: number, rs: number) => {
        if (col < 1 || col + cs - 1 > numCols || row < 1 || row + rs - 1 > rows)
          return false;
        for (let r = row; r < row + rs; r++) {
          for (let c = col; c < col + cs; c++) {
            if (occ.has(key(r, c))) return false;
          }
        }
        return true;
      };

      const out: Array<{ col: number; row: number; cs: number; rs: number } | null> =
        new Array(slots.length).fill(null);

      // 1. Explicit placements (col + row)
      for (const s of slots) {
        if (s.col !== null && s.row !== null) {
          if (!free(s.col, s.row, s.cs, s.rs)) return null;
          out[s.idx] = { col: s.col, row: s.row, cs: s.cs, rs: s.rs };
          mark(s.col, s.row, s.cs, s.rs);
        }
      }

      // 2. Auto placements; largest first to reduce fragmentation
      const autoSlots = slots
        .filter((s) => s.col === null || s.row === null)
        .sort((a, b) => b.cs * b.rs - a.cs * a.rs);

      for (const s of autoSlots) {
        let placed = false;
        // Scan from bottom row upward; left-to-right inside each row
        for (let row = rows - s.rs + 1; row >= 1 && !placed; row--) {
          for (let col = 1; col <= numCols - s.cs + 1 && !placed; col++) {
            if (free(col, row, s.cs, s.rs)) {
              out[s.idx] = { col, row, cs: s.cs, rs: s.rs };
              mark(col, row, s.cs, s.rs);
              placed = true;
            }
          }
        }
        if (!placed) return null;
      }

      return out as Array<{ col: number; row: number; cs: number; rs: number }>;
    };

    let result = attempt(numRows);
    let safety = 0;
    while (!result && safety < 200) {
      numRows += 1;
      result = attempt(numRows);
      safety++;
    }
    return result ?? slots.map(() => ({ col: 1, row: 1, cs: 1, rs: 1 }));
  }

  render() {
    return html` <div id="root"></div>
      ${this._render_fab()}`;
  }

  static get styles() {
    return [
      this._fab_styles,
      this._card_theme_styles,
      this._hui_card_styles,
      css`
        :host {
          height: 100%;
          box-sizing: border-box;
        }
        #root {
          display: grid;
          margin: var(--layout-margin);
          padding: var(--layout-padding);
          height: var(--layout-height);
          overflow-y: var(--layout-overflow);
        }
        #root > * {
          margin: var(--masonry-view-card-margin, 0);
        }
      `,
    ];
  }
}

define("super-aligned-grid-layout", SuperAlignedGridLayout);
