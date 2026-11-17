// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
export interface LovelaceCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  setConfig(config: any): void;
  getCardSize?(): Promise<number> | number;
}

export interface HuiCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  getCardSize?(): Promise<number> | number;
}

export interface CardConfig {
  type: string;
  view_layout?: {
    show?:
      | "always"
      | "never"
      | {
          mediaquery?: string;
          sidebar?: string;
        };
    column?: number;
    column_span?: number;
    row?: number;
    row_span?: number;
    sticky?: boolean;
  };
}

export interface CardConfigGroup {
  card: LovelaceCard | HuiCard;
  config: CardConfig;
  index: number;
  show?: boolean;
}

export interface ViewConfig {
  title?: string;
  type?: string;
  cards?: Array<CardConfig>;
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
  };
  view_layout?: {};
}

export interface ColumnViewConfig extends ViewConfig {
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
    reflow?: boolean;
    width?: number;
    column_widths: string;
    max_width?: number;
    max_cols?: number;
    min_height?: number;
    rtl?: boolean;
    card_margin?: string;
  };
}

export interface AlignedGridViewConfig extends ViewConfig {
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
    card_margin?: string;
    column_widths?: string;
    gap?: string;
    "justify-content"?: string;
    "align-content"?: string;
    fullscreen?: boolean;
    hide_header?: boolean;
    auto_hide_header?: boolean;
  };
}

export interface GridViewConfig extends ViewConfig {
  layout?: {
    margin?: string;
    padding?: string;
    height?: string;
    fullscreen?: boolean;
    hide_header?: boolean;
    auto_hide_header?: boolean;
    mediaquery?: Array<Record<string, any>>;
  };
}

export interface SuperLayoutCardConfig {
  cards?: Array<CardConfig>;
  entities?: Array<CardConfig>;
  layout_type?: string;
  layout?: any;
  layout_options?: any; // legacy
  style?: Record<string, string>;
}

export interface ScrollAreaConfig {
  height?: string;
  scroll_snap?: boolean;
  scroll_snap_type?: string;
  padding?: string;
  scrollbar_hidden?: boolean;
  direction?: "vertical" | "horizontal" | "both";
  cards?: Array<CardConfig>;
}

export interface TabCardConfig {
  tabs?: Array<TabConfig>;
}

export interface TabConfig {
  title?: string;
  icon?: string;
  cards?: Array<CardConfig>;
}

export interface CollapsibleCardConfig {
  title?: string;
  icon?: string;
  initially_collapsed?: boolean;
  cards?: Array<CardConfig>;
}
