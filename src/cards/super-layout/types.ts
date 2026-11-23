import type { HomeAssistant } from "../../shared/types";

/** HA's hass object as the layouts see it (adds the sidebar state). */
export interface Hass extends HomeAssistant {
  dockedSidebar?: "docked" | "always_hidden" | "auto";
  themes?: unknown;
  localize: (key: string, ...args: unknown[]) => string;
}

/** HA's lovelace context object; only the fields the layouts touch. */
export interface Lovelace {
  editMode: boolean;
  [key: string]: unknown;
}

/** A child card element: a hui-card wrapper or the card element itself. */
export interface LovelaceCard extends HTMLElement {
  hass?: Hass;
  editMode?: boolean;
  setConfig?(config: CardConfig): void;
  getCardSize?(): Promise<number> | number;
}

export type HuiCard = LovelaceCard;

/** `show:` in a child card's view_layout. */
export type ShowConfig =
  | "always"
  | "never"
  | {
      mediaquery?: string;
      sidebar?: string;
    };

/** Per-card placement. Grid layouts also take any `grid-*` CSS property. */
export interface ViewLayout {
  show?: ShowConfig;
  column?: number;
  column_span?: number;
  row?: number;
  row_span?: number;
  sticky?: boolean;
  [cssProperty: string]: unknown;
}

export interface CardConfig {
  type: string;
  view_layout?: ViewLayout;
  [key: string]: unknown;
}

export interface CardConfigGroup {
  card: LovelaceCard;
  config: CardConfig;
  index: number;
  show?: boolean;
}

/** Layout options shared by all layouts; each layout reads its own keys. */
export interface LayoutOptions {
  margin?: string;
  padding?: string;
  height?: string;
  card_margin?: string;
  // column layouts
  reflow?: boolean;
  width?: number;
  column_widths?: string;
  max_width?: number;
  max_cols?: number;
  min_height?: number;
  rtl?: boolean;
  // grid layouts
  gap?: string;
  "justify-content"?: string;
  "align-content"?: string;
  fullscreen?: boolean;
  hide_header?: boolean;
  auto_hide_header?: boolean;
  mediaquery?: Record<string, Record<string, string>>;
  [cssProperty: string]: unknown;
}

export interface ViewConfig {
  title?: string;
  type?: string;
  cards?: CardConfig[];
  layout?: LayoutOptions;
  view_layout?: LayoutOptions;
}

export type ColumnViewConfig = ViewConfig;
export type AlignedGridViewConfig = ViewConfig;
export type GridViewConfig = ViewConfig;

export interface SuperLayoutCardConfig {
  type?: string;
  cards?: CardConfig[];
  entities?: CardConfig[];
  layout_type?: string;
  layout?: LayoutOptions;
  layout_options?: LayoutOptions; // legacy
  style?: Record<string, string>;
}

export interface ScrollAreaConfig {
  type?: string;
  height?: string;
  scroll_snap?: boolean;
  scroll_snap_type?: string;
  padding?: string;
  scrollbar_hidden?: boolean;
  direction?: "vertical" | "horizontal" | "both";
  cards?: CardConfig[];
}

export interface TabConfig {
  title?: string;
  icon?: string;
  cards?: CardConfig[];
}

export interface TabCardConfig {
  type?: string;
  tabs?: TabConfig[];
}

export interface CollapsibleCardConfig {
  type?: string;
  title?: string;
  icon?: string;
  initially_collapsed?: boolean;
  cards?: CardConfig[];
}

/** HA's `ha-form` schema entry, as used by the editors. */
export interface FormSchema {
  name: string;
  selector: Record<string, unknown>;
}

/** HA's `value-changed` / `config-changed` style events. */
export type ValueChangedEvent<T> = CustomEvent<{ value: T }>;
