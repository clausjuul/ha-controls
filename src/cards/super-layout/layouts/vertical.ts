// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../../shared/types';
import { CardConfigGroup } from "../types";
import { BaseColumnLayout } from "./base-column-layout";

class SuperVerticalLayout extends BaseColumnLayout {
  async _placeColumnCards(cols: Array<Node>, cards: CardConfigGroup[]) {
    let i = 1;
    for (const c of cards) {
      if (c.config.view_layout?.column) i = c.config.view_layout.column;
      const col = cols[(i - 1) % cols.length];
      col.appendChild(this.getCardElement(c));
      if (this.isBreak(c.config)) {
        i = i + 1;
      }
    }
  }
}

define("super-vertical-layout", SuperVerticalLayout);
