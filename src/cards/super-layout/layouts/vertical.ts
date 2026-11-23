import { define } from '../../../shared/types';
import { CardConfigGroup } from "../types";
import { BaseColumnLayout } from "./base-column-layout";

class SuperVerticalLayout extends BaseColumnLayout {
  /** Cards stack in one column; a break moves on to the next column. */
  _assignColumns(cards: CardConfigGroup[], _sizes: number[], columns: number) {
    let i = 1;
    return cards.map((c) => {
      if (c.config.view_layout?.column) i = c.config.view_layout.column;
      const col = (i - 1) % columns;
      if (this.isBreak(c.config)) i += 1;
      return col;
    });
  }
}

define("super-vertical-layout", SuperVerticalLayout);
