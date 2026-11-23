import { define } from '../../shared/types';
import { LitElement, html, CSSResultArray, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type {
  FormSchema,
  Hass,
  LayoutOptions,
  Lovelace,
  SuperLayoutCardConfig,
  ValueChangedEvent,
} from "./types";
import { loadHaForm, SUPER_LAYOUT_TYPES } from "./helpers";
import "./grid-designer";
import "./card-list-editor";


// --- Dynamic schemas per layout type ---

const COMMON_LAYOUT_SCHEMA = [
  {
    name: "margin",
    selector: { text: {} },
  },
  {
    name: "padding",
    selector: { text: {} },
  },
  {
    name: "height",
    selector: { text: {} },
  },
  {
    name: "card_margin",
    selector: { text: {} },
  },
];

const COLUMN_LAYOUT_SCHEMA = [
  {
    name: "width",
    selector: {
      number: { min: 100, max: 2000, step: 10, unit_of_measurement: "px", mode: "slider" },
    },
  },
  {
    name: "max_width",
    selector: {
      number: { min: 100, max: 3000, step: 10, unit_of_measurement: "px", mode: "slider" },
    },
  },
  {
    name: "max_cols",
    selector: {
      number: { min: 1, max: 20, step: 1, mode: "slider" },
    },
  },
  {
    name: "column_widths",
    selector: { text: {} },
  },
  {
    name: "rtl",
    selector: { boolean: {} },
  },
  {
    name: "reflow",
    selector: { boolean: {} },
  },
];

const MASONRY_SCHEMA = [
  {
    name: "min_height",
    selector: {
      number: { min: 1, max: 50, step: 1, mode: "slider" },
    },
  },
];

const ALIGNED_GRID_SCHEMA = [
  {
    name: "column_widths",
    selector: { text: {} },
  },
  {
    name: "gap",
    selector: { text: {} },
  },
  {
    name: "justify-content",
    selector: {
      select: {
        options: [
          { value: "start", label: "Left" },
          { value: "center", label: "Center" },
          { value: "end", label: "Right" },
          { value: "space-between", label: "Space Between" },
          { value: "space-evenly", label: "Space Evenly" },
        ],
      },
    },
  },
  {
    name: "align-content",
    selector: {
      select: {
        options: [
          { value: "start", label: "Top" },
          { value: "center", label: "Center" },
          { value: "end", label: "Bottom" },
          { value: "space-between", label: "Space Between" },
          { value: "space-evenly", label: "Space Evenly" },
        ],
      },
    },
  },
  {
    name: "fullscreen",
    selector: { boolean: {} },
  },
  {
    name: "hide_header",
    selector: { boolean: {} },
  },
  {
    name: "auto_hide_header",
    selector: { boolean: {} },
  },
];

const GRID_SCHEMA = [
  {
    name: "grid-template-columns",
    selector: { text: {} },
  },
  {
    name: "grid-template-rows",
    selector: { text: {} },
  },
  {
    name: "grid-template-areas",
    selector: { text: { multiline: true } },
  },
  {
    name: "grid-gap",
    selector: { text: {} },
  },
  {
    name: "grid-auto-columns",
    selector: { text: {} },
  },
  {
    name: "grid-auto-rows",
    selector: { text: {} },
  },
  {
    name: "grid-auto-flow",
    selector: {
      select: {
        options: [
          { value: "", label: "Default" },
          { value: "row", label: "Row" },
          { value: "column", label: "Column" },
          { value: "row dense", label: "Row Dense" },
          { value: "column dense", label: "Column Dense" },
        ],
      },
    },
  },
  {
    name: "place-items",
    selector: {
      select: {
        options: [
          { value: "", label: "Default" },
          { value: "normal", label: "Normal" },
          { value: "start", label: "Start" },
          { value: "end", label: "End" },
          { value: "center", label: "Center" },
          { value: "stretch", label: "Stretch" },
          { value: "baseline", label: "Baseline" },
        ],
      },
    },
  },
  {
    name: "place-content",
    selector: {
      select: {
        options: [
          { value: "", label: "Default" },
          { value: "normal", label: "Normal" },
          { value: "start", label: "Start" },
          { value: "end", label: "End" },
          { value: "center", label: "Center" },
          { value: "stretch", label: "Stretch" },
          { value: "space-between", label: "Space Between" },
          { value: "space-around", label: "Space Around" },
          { value: "space-evenly", label: "Space Evenly" },
          { value: "baseline", label: "Baseline" },
        ],
      },
    },
  },
  {
    name: "fullscreen",
    selector: { boolean: {} },
  },
  {
    name: "hide_header",
    selector: { boolean: {} },
  },
  {
    name: "auto_hide_header",
    selector: { boolean: {} },
  },
];

/**
 * The grid layout applies the first matching breakpoint, so order plain
 * max-width queries narrowest first; anything else keeps its place at the end.
 */
function sortBreakpoints<T>(mq: Record<string, T>): Record<string, T> {
  const width = (q: string) => {
    const m = q.match(/^\(\s*max-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/);
    return m ? parseFloat(m[1]) : Infinity;
  };
  return Object.fromEntries(
    Object.entries(mq).sort(([a], [b]) => width(a) - width(b))
  );
}

function normalizeLayoutType(layoutType: string | undefined): string {
  return (layoutType || "").replace("custom:", "").replace("super-", "").replace("-layout", "");
}

function getLayoutSchemaForType(layoutType: string | undefined): FormSchema[] {
  const type = normalizeLayoutType(layoutType) || "masonry";

  switch (type) {
    case "grid":
      return [...GRID_SCHEMA, ...COMMON_LAYOUT_SCHEMA];
    case "aligned-grid":
      return [...ALIGNED_GRID_SCHEMA, ...COMMON_LAYOUT_SCHEMA];
    case "masonry":
      return [...COLUMN_LAYOUT_SCHEMA, ...MASONRY_SCHEMA, ...COMMON_LAYOUT_SCHEMA];
    case "horizontal":
    case "vertical":
      return [...COLUMN_LAYOUT_SCHEMA, ...COMMON_LAYOUT_SCHEMA];
    default:
      return COMMON_LAYOUT_SCHEMA;
  }
}

const LAYOUT_LABELS: Record<string, string> = {
  width: "Column Width (px)",
  max_width: "Max Column Width (px)",
  max_cols: "Max Columns",
  column_widths: "Column Widths (CSS grid-template-columns)",
  rtl: "Right-to-Left",
  reflow: "Reflow on card visibility change",
  min_height: "Min Column Height (units)",
  margin: "Layout Margin (CSS)",
  padding: "Layout Padding (CSS)",
  height: "Layout Height (CSS)",
  card_margin: "Card Margin (CSS)",
  "grid-template-columns": "Grid Template Columns",
  "grid-template-rows": "Grid Template Rows",
  "grid-template-areas": "Grid Template Areas",
  "grid-gap": "Grid Gap",
  "grid-auto-columns": "Grid Auto Columns",
  "grid-auto-rows": "Grid Auto Rows",
  "grid-auto-flow": "Grid Auto Flow",
  "place-items": "Place Items",
  "place-content": "Place Content",
  fullscreen: "Fullscreen (fill viewport height)",
  hide_header: "Hide HA Header (kiosk mode)",
  auto_hide_header: "Auto-hide header on scroll",
  gap: "Gap (CSS)",
  "justify-content": "Horizontal Alignment",
  "align-content": "Vertical Alignment",
  column: "Column (1-based, optional)",
  column_span: "Column Span",
  row: "Row (1-based, optional)",
  row_span: "Row Span",
};

class SuperLayoutCardEditor extends LitElement {
  @state() _config!: SuperLayoutCardConfig;
  @property({ attribute: false }) lovelace?: Lovelace;
  @property({ attribute: false }) hass?: Hass;

  @state() _selectedTab = 0;

  // Values are the short type names; existing configs may use any spelling
  // ("masonry", "super-masonry", "custom:super-masonry-layout"), so the form
  // shows the normalised name and writes the full custom: form back.
  _typeSchema = [
    {
      name: "layout_type",
      selector: {
        select: {
          mode: "dropdown",
          options: SUPER_LAYOUT_TYPES.map(({ type, label }) => ({
            value: type,
            label,
          })),
        },
      },
    },
  ];

  setConfig(config: SuperLayoutCardConfig) {
    this._config = config;
  }

  async firstUpdated() {
    loadHaForm();
    await this._preloadCardEditors();
  }

  async _preloadCardEditors() {
    const helpers = await window.loadCardHelpers?.();
    if (!helpers) return;

    // The stack card's editor brings in HA's card editor elements.
    const verticalStackCard = helpers.createCardElement({
      type: "vertical-stack",
      cards: [],
    });

    await customElements.whenDefined("hui-vertical-stack-card");
    const ctor = verticalStackCard?.constructor as
      | { getConfigElement?: () => Promise<unknown> }
      | undefined;
    await ctor?.getConfigElement?.();
  }

  _handleSwitchTab(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedTab = parseInt(ev.detail.name, 10);
  }

  _typeValueChanged(ev: ValueChangedEvent<{ layout_type?: string }>) {
    ev.stopPropagation();
    const type = ev.detail.value?.layout_type;
    if (!type) return;
    // Keep only the layout options the new type understands.
    const allowed = new Set(getLayoutSchemaForType(type).map((f) => f.name));
    if (type === "grid") allowed.add("mediaquery");
    const layout = Object.fromEntries(
      Object.entries(this._config.layout || {}).filter(([k]) => allowed.has(k))
    );
    this._config = {
      ...this._config,
      layout_type: `custom:super-${type}-layout`,
      layout,
    };
    // Reset tab selection when layout type changes
    this._selectedTab = 0;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _layoutValueChanged(ev: ValueChangedEvent<LayoutOptions>) {
    ev.stopPropagation();
    const layoutValues = ev.detail.value;
    // Clean out empty string values
    const cleanLayout: LayoutOptions = {};
    for (const [key, value] of Object.entries(layoutValues)) {
      if (value !== "" && value !== undefined && value !== null) {
        cleanLayout[key] = value;
      }
    }
    this._config = { ...this._config, layout: cleanLayout };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _computeTypeLabel(schema: FormSchema): string {
    if (schema.name === "layout_type") return "Layout Type";
    return schema.name;
  }

  _computeLayoutLabel(schema: FormSchema): string {
    return LAYOUT_LABELS[schema.name] || schema.name;
  }

  _isGridLayout(): boolean {
    return normalizeLayoutType(this._config?.layout_type) === "grid";
  }

  _isAlignedGridLayout(): boolean {
    return normalizeLayoutType(this._config?.layout_type) === "aligned-grid";
  }

  @state() _selectedBreakpoint = 0;

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    const isGrid = this._isGridLayout();
    // Tab indices: Layout=0, GridDesigner=1(grid only), Responsive=grid?2:1, Style=grid?3:2, Cards=grid?4:3
    let tabIndex = 0;
    const layoutTab = tabIndex++;
    const gridDesignerTab = isGrid ? tabIndex++ : -1;
    const responsiveTab = isGrid ? tabIndex++ : -1;
    const styleTab = tabIndex++;
    const cardsTab = tabIndex++;

    const tabRenderers: Record<number, () => unknown> = {};
    tabRenderers[layoutTab] = this._renderLayoutEditor;
    if (isGrid) {
      tabRenderers[gridDesignerTab] = this._renderGridDesigner;
      tabRenderers[responsiveTab] = this._renderResponsiveEditor;
    }
    tabRenderers[styleTab] = this._renderStyleEditor;
    tabRenderers[cardsTab] = this._renderCardsEditor;

    return html`
      <div class="card-config">
        <ha-tab-group @wa-tab-show=${this._handleSwitchTab}>
          <ha-tab-group-tab slot="nav" .active=${this._selectedTab == layoutTab} .panel=${layoutTab}>
            Layout
          </ha-tab-group-tab>
          ${isGrid
            ? html`
              <ha-tab-group-tab slot="nav" .active=${this._selectedTab == gridDesignerTab} .panel=${gridDesignerTab}>
                Grid
              </ha-tab-group-tab>
              <ha-tab-group-tab slot="nav" .active=${this._selectedTab == responsiveTab} .panel=${responsiveTab}>
                Responsive
              </ha-tab-group-tab>
            `
            : nothing}
          <ha-tab-group-tab slot="nav" .active=${this._selectedTab == styleTab} .panel=${styleTab}>
            Style
          </ha-tab-group-tab>
          <ha-tab-group-tab slot="nav" .active=${this._selectedTab == cardsTab} .panel=${cardsTab}>
            Cards
          </ha-tab-group-tab>
        </ha-tab-group>
        <div id="editor">
          ${tabRenderers[this._selectedTab]?.bind(this)() ?? nothing}
        </div>
      </div>
    `;
  }

  _renderLayoutEditor() {
    const typeSchema = this._typeSchema;
    const typeData = this._config.layout_type
      ? { layout_type: normalizeLayoutType(this._config.layout_type) }
      : {};
    const layoutSchema = getLayoutSchemaForType(this._config.layout_type);
    const layoutData = this._config.layout || {};

    return html`
      <div class="layout-section">
        <ha-form
          .hass=${this.hass}
          .data=${typeData}
          .schema=${typeSchema}
          .computeLabel=${this._computeTypeLabel}
          @value-changed=${this._typeValueChanged}
        ></ha-form>
      </div>

      <div class="layout-section">
        <h3 class="section-title">Layout Options</h3>
        <ha-form
          .hass=${this.hass}
          .data=${layoutData}
          .schema=${layoutSchema}
          .computeLabel=${this._computeLayoutLabel}
          @value-changed=${this._layoutValueChanged}
        ></ha-form>
      </div>
    `;
  }

  _renderGridDesigner() {
    return html`
      <super-grid-designer
        .config=${this._config.layout || {}}
        .cards=${this._config.cards || []}
        @config-changed=${this._gridDesignerConfigChanged}
        @cards-changed=${this._gridDesignerCardsChanged}
      ></super-grid-designer>
    `;
  }

  _gridDesignerConfigChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const layout = ev.detail.layout;
    // Merge with existing layout, keeping non-grid properties
    const existingLayout = this._config.layout || {};
    const merged = { ...existingLayout, ...layout };
    // Clean empty values
    for (const [key, value] of Object.entries(merged)) {
      if (value === "" || value === undefined || value === null) {
        delete merged[key];
      }
    }
    this._config = { ...this._config, layout: merged };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _gridDesignerCardsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const cards = ev.detail.cards;
    this._config = { ...this._config, cards };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  // --- Responsive Breakpoints Editor (#1) ---

  static PRESET_BREAKPOINTS = [
    { label: "Mobile (≤480px)", query: "(max-width: 480px)" },
    { label: "Tablet (≤768px)", query: "(max-width: 768px)" },
    { label: "Desktop (≤1024px)", query: "(max-width: 1024px)" },
    { label: "Large (≤1440px)", query: "(max-width: 1440px)" },
  ];

  _renderResponsiveEditor() {
    const mediaquery = this._config.layout?.mediaquery || {};
    const breakpoints = Object.entries(mediaquery);

    return html`
      <div class="responsive-editor">
        <p class="section-desc">
          Define layout overrides for different screen sizes. When a media query matches,
          those grid properties override the base layout.
        </p>

        ${breakpoints.map(([query, layout]) => html`
          <div class="breakpoint-item">
            <div class="breakpoint-header">
              <span class="breakpoint-query">${query}</span>
              <ha-icon-button @click=${() => this._deleteBreakpoint(query)}>
                <ha-icon .icon=${"mdi:delete"}></ha-icon>
              </ha-icon-button>
            </div>
            <ha-form
              .hass=${this.hass}
              .data=${layout}
              .schema=${[
                { name: "grid-template-columns", selector: { text: {} } },
                { name: "grid-template-rows", selector: { text: {} } },
                { name: "grid-gap", selector: { text: {} } },
              ]}
              .computeLabel=${(schema: FormSchema) => LAYOUT_LABELS[schema.name] || schema.name}
              @value-changed=${(ev: ValueChangedEvent<Record<string, unknown>>) => this._updateBreakpoint(query, ev)}
            ></ha-form>
          </div>
        `)}

        <div class="add-breakpoint">
          <h4>Add Breakpoint</h4>
          <div class="preset-buttons">
            ${SuperLayoutCardEditor.PRESET_BREAKPOINTS.map((bp) => html`
              <ha-button
                @click=${() => this._addBreakpoint(bp.query)}
                .disabled=${mediaquery[bp.query] !== undefined}
              >
                ${bp.label}
              </ha-button>
            `)}
          </div>
          <div class="custom-breakpoint">
            <ha-textfield
              id="custom-mq"
              label="Custom media query"
              placeholder="(max-width: 600px)"
            ></ha-textfield>
            <ha-button @click=${this._addCustomBreakpoint}>Add</ha-button>
          </div>
        </div>
      </div>
    `;
  }

  _addBreakpoint(query: string) {
    const layout = { ...(this._config.layout || {}) };
    const mediaquery = { ...(layout.mediaquery || {}) };
    mediaquery[query] = {
      "grid-template-columns": "1fr",
    };
    layout.mediaquery = sortBreakpoints(mediaquery);
    this._config = { ...this._config, layout };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _addCustomBreakpoint() {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>("#custom-mq");
    const query = input?.value?.trim();
    if (query) {
      this._addBreakpoint(query);
      if (input) input.value = "";
    }
  }

  _deleteBreakpoint(query: string) {
    const layout = { ...(this._config.layout || {}) };
    const mediaquery = { ...(layout.mediaquery || {}) };
    delete mediaquery[query];
    if (Object.keys(mediaquery).length === 0) {
      delete layout.mediaquery;
    } else {
      layout.mediaquery = mediaquery;
    }
    this._config = { ...this._config, layout };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _updateBreakpoint(query: string, ev: CustomEvent) {
    ev.stopPropagation();
    const layout = { ...(this._config.layout || {}) };
    const mediaquery = { ...(layout.mediaquery || {}) };
    const bpLayout = { ...(mediaquery[query] || {}), ...ev.detail.value };
    // Clean empty values
    for (const [key, value] of Object.entries(bpLayout)) {
      if (value === "" || value === undefined || value === null) {
        delete bpLayout[key];
      }
    }
    mediaquery[query] = bpLayout;
    layout.mediaquery = mediaquery;
    this._config = { ...this._config, layout };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  // --- Style Editor (#9) ---

  _renderStyleEditor() {
    const style = this._config.style || {};

    return html`
      <div class="style-editor">
        <p class="section-desc">
          Add custom CSS properties to the layout container. Use HA CSS variables for theming.
        </p>
        <ha-form
          .hass=${this.hass}
          .data=${style}
          .schema=${[
            { name: "background", selector: { text: {} } },
            { name: "border-radius", selector: { text: {} } },
            { name: "box-shadow", selector: { text: {} } },
            { name: "border", selector: { text: {} } },
            { name: "padding", selector: { text: {} } },
            { name: "margin", selector: { text: {} } },
          ]}
          .computeLabel=${(schema: FormSchema) => {
            const labels: Record<string, string> = {
              background: "Background",
              "border-radius": "Border Radius",
              "box-shadow": "Box Shadow",
              border: "Border",
              padding: "Padding",
              margin: "Margin",
            };
            return labels[schema.name] || schema.name;
          }}
          @value-changed=${this._styleValueChanged}
        ></ha-form>

        <h4 style="margin-top: 16px;">Custom Properties</h4>
        ${Object.entries(style)
          .filter(([key]) => !["background", "border-radius", "box-shadow", "border", "padding", "margin"].includes(key))
          .map(([key, value]) => html`
            <div class="custom-style-row">
              <span>${key}: ${value}</span>
              <ha-icon-button @click=${() => this._removeStyleProperty(key)}>
                <ha-icon .icon=${"mdi:delete"}></ha-icon>
              </ha-icon-button>
            </div>
          `)}

        <div class="add-style-row">
          <ha-textfield id="style-key" label="Property" placeholder="opacity"></ha-textfield>
          <ha-textfield id="style-value" label="Value" placeholder="0.9"></ha-textfield>
          <ha-button @click=${this._addStyleProperty}>Add</ha-button>
        </div>
      </div>
    `;
  }

  _styleValueChanged(ev: ValueChangedEvent<Record<string, unknown>>) {
    ev.stopPropagation();
    const newValues = ev.detail.value;
    const style = { ...(this._config.style || {}) };
    // Merge known properties
    for (const [key, value] of Object.entries(newValues)) {
      if (value !== "" && value !== undefined && value !== null) {
        style[key] = value as string;
      } else {
        delete style[key];
      }
    }
    this._config = { ...this._config, style: Object.keys(style).length ? style : undefined };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _addStyleProperty() {
    const keyEl = this.shadowRoot?.querySelector<HTMLInputElement>("#style-key");
    const valueEl = this.shadowRoot?.querySelector<HTMLInputElement>("#style-value");
    const key = keyEl?.value?.trim();
    const value = valueEl?.value?.trim();
    if (key && value) {
      const style = { ...(this._config.style || {}), [key]: value };
      this._config = { ...this._config, style };
      this.dispatchEvent(
        new CustomEvent("config-changed", { detail: { config: this._config } })
      );
      if (keyEl) keyEl.value = "";
      if (valueEl) valueEl.value = "";
    }
  }

  _removeStyleProperty(key: string) {
    const style = { ...(this._config.style || {}) };
    delete style[key];
    this._config = { ...this._config, style: Object.keys(style).length ? style : undefined };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  // --- Card Visibility Editor (#2) ---

  _renderCardVisibility(cardIndex: number) {
    const card = this._config.cards?.[cardIndex];
    if (!card) return nothing;

    const viewLayout = card.view_layout || {};
    const showValue = typeof viewLayout.show === "string"
      ? viewLayout.show
      : viewLayout.show?.mediaquery
        ? "mediaquery"
        : viewLayout.show?.sidebar
          ? "sidebar"
          : "always";

    return html`
      <div class="visibility-section">
        <h4 class="section-title">Card Visibility</h4>
        <ha-form
          .hass=${this.hass}
          .data=${{
            show_mode: showValue,
            mediaquery: typeof viewLayout.show === "object" ? viewLayout.show?.mediaquery || "" : "",
            sidebar: typeof viewLayout.show === "object" ? viewLayout.show?.sidebar || "" : "",
          }}
          .schema=${[
            {
              name: "show_mode",
              selector: {
                select: {
                  options: [
                    { value: "always", label: "Always visible" },
                    { value: "never", label: "Never visible" },
                    { value: "mediaquery", label: "Screen size (media query)" },
                    { value: "sidebar", label: "Sidebar state" },
                  ],
                },
              },
            },
            {
              name: "mediaquery",
              selector: {
                select: {
                  options: [
                    { value: "(max-width: 480px)", label: "Mobile only (≤480px)" },
                    { value: "(max-width: 768px)", label: "Mobile + Tablet (≤768px)" },
                    { value: "(min-width: 769px)", label: "Desktop only (≥769px)" },
                    { value: "(min-width: 1024px)", label: "Large screens (≥1024px)" },
                  ],
                  custom_value: true,
                },
              },
            },
            {
              name: "sidebar",
              selector: {
                select: {
                  options: [
                    { value: "", label: "Any" },
                    { value: "shown", label: "Only when sidebar is shown" },
                    { value: "hidden", label: "Only when sidebar is hidden" },
                  ],
                },
              },
            },
          ]}
          .computeLabel=${(schema: FormSchema) => {
            const labels: Record<string, string> = {
              show_mode: "Visibility",
              mediaquery: "Media Query",
              sidebar: "Sidebar condition",
            };
            return labels[schema.name] || schema.name;
          }}
          @value-changed=${(ev: ValueChangedEvent<Record<string, unknown>>) => this._updateCardVisibility(cardIndex, ev)}
        ></ha-form>
      </div>
    `;
  }

  _updateCardVisibility(cardIndex: number, ev: CustomEvent) {
    ev.stopPropagation();
    const values = ev.detail.value;
    const cards = [...(this._config.cards || [])];
    const card = { ...cards[cardIndex] };
    const viewLayout = { ...(card.view_layout || {}) };

    if (values.show_mode === "always") {
      delete viewLayout.show; // the default
    } else if (values.show_mode === "never") {
      viewLayout.show = "never";
    } else if (values.show_mode === "mediaquery") {
      viewLayout.show = { mediaquery: values.mediaquery || "(max-width: 768px)" };
    } else if (values.show_mode === "sidebar") {
      viewLayout.show = { sidebar: values.sidebar || "shown" };
    }

    if (Object.keys(viewLayout).length) card.view_layout = viewLayout;
    else delete card.view_layout;
    cards[cardIndex] = card;
    this._config = { ...this._config, cards };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  // --- Per-card placement editor (aligned-grid layout only) ---

  _renderCardPlacement(cardIndex: number) {
    const card = this._config.cards?.[cardIndex];
    if (!card) return nothing;

    const vl = card.view_layout || {};
    const data = {
      column: typeof vl.column === "number" ? vl.column : "",
      column_span: typeof vl.column_span === "number" ? vl.column_span : "",
      row: typeof vl.row === "number" ? vl.row : "",
      row_span: typeof vl.row_span === "number" ? vl.row_span : "",
    };

    return html`
      <div class="visibility-section">
        <h4 class="section-title">Card Placement</h4>
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${[
            { name: "column", selector: { number: { min: 1, max: 20, step: 1, mode: "box" } } },
            { name: "column_span", selector: { number: { min: 1, max: 20, step: 1, mode: "box" } } },
            { name: "row", selector: { number: { min: 1, max: 50, step: 1, mode: "box" } } },
            { name: "row_span", selector: { number: { min: 1, max: 50, step: 1, mode: "box" } } },
          ]}
          .computeLabel=${(schema: FormSchema) => LAYOUT_LABELS[schema.name] || schema.name}
          @value-changed=${(ev: ValueChangedEvent<Record<string, unknown>>) => this._updateCardPlacement(cardIndex, ev)}
        ></ha-form>
      </div>
    `;
  }

  _updateCardPlacement(cardIndex: number, ev: CustomEvent) {
    ev.stopPropagation();
    const values = ev.detail.value;
    const cards = [...(this._config.cards || [])];
    const card = { ...cards[cardIndex] };
    const viewLayout = { ...(card.view_layout || {}) };

    for (const key of ["column", "column_span", "row", "row_span"] as const) {
      const v = values[key];
      if (typeof v === "number" && v > 0) {
        viewLayout[key] = v;
      } else {
        delete viewLayout[key];
      }
    }

    card.view_layout = viewLayout;
    cards[cardIndex] = card;
    this._config = { ...this._config, cards };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config } })
    );
  }

  _renderCardsEditor() {
    if (this._config.entities) {
      return html`
        This card has the <code>entities</code> parameter set. You cannot
        manually select cards.
      `;
    }
    return html`
      <super-card-list-editor
        .hass=${this.hass}
        .lovelace=${this.lovelace}
        .cards=${this._config.cards || []}
        .renderExtra=${(i: number) => html`
          ${this._renderCardVisibility(i)}
          ${this._isAlignedGridLayout() ? this._renderCardPlacement(i) : nothing}
        `}
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

  static get styles(): CSSResultArray {
    return [
      css`
        mwc-tab-bar {
          border-bottom: 1px solid var(--divider-color);
        }

        .layout-section {
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          margin: 16px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color);
        }

        .section-desc {
          font-size: 13px;
          color: var(--secondary-text-color);
          margin: 0 0 12px 0;
        }

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

        a {
          color: var(--primary-color);
        }

        /* Responsive Breakpoints Editor */
        .breakpoint-item {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .breakpoint-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .breakpoint-query {
          font-family: monospace;
          font-size: 13px;
          color: var(--primary-color);
          background: var(--secondary-background-color, #f5f5f5);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .preset-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .custom-breakpoint {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .custom-breakpoint ha-textfield {
          flex: 1;
        }

        /* Style Editor */
        .style-editor .custom-style-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 4px;
          margin-bottom: 4px;
          font-family: monospace;
          font-size: 13px;
        }
        .add-style-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          margin-top: 8px;
        }
        .add-style-row ha-textfield {
          flex: 1;
        }

        /* Card Visibility */
        .visibility-section {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color);
        }
      `,
    ];
  }
}

define("super-layout-card-editor", SuperLayoutCardEditor);
