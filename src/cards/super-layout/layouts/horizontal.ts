import { define } from '../../../shared/types';
import { CardConfigGroup } from "../types";
import { BaseColumnLayout } from "./base-column-layout";

class SuperHorizontalLayout extends BaseColumnLayout {
  /** Cards go left to right; a break starts again from the first column. */
  _assignColumns(cards: CardConfigGroup[], _sizes: number[], columns: number) {
    let i = 0;
    return cards.map((c) => {
      i += 1;
      if (c.config.view_layout?.column) i = c.config.view_layout.column;
      const col = (i - 1) % columns;
      if (this.isBreak(c.config)) i = 0;
      return col;
    });
  }
}

define("super-horizontal-layout", SuperHorizontalLayout);
