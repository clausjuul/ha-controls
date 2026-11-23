// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../../shared/types';
import { CardConfigGroup } from "../types";
import { BaseColumnLayout } from "./base-column-layout";

interface LengthCol extends Node {
  length?: number;
}

class SuperMasonryLayout extends BaseColumnLayout {
  async _placeColumnCards(cols: Array<LengthCol>, cards: CardConfigGroup[]) {
    const min_height = this._config.layout?.min_height || 5;

    function shortestCol() {
      let i = 0;
      for (let j = 0; j < cols.length; j++) {
        if (cols[j].length && cols[j].length < min_height) return cols[j];
        if (cols[j].length < cols[i].length) i = j;
      }
      return cols[i];
    }

    // Ask every card for its size at once (each capped at 500 ms) instead of
    // one after the other, then place them in order as before.
    const sizes = await Promise.all(
      cards.map((c) =>
        c.card.getCardSize
          ? Promise.race([
              new Promise<number>((resolve) => resolve(c.card.getCardSize())).catch(() => 1),
              new Promise<number>((resolve) => setTimeout(() => resolve(1), 500)),
            ])
          : 1
      )
    );

    cards.forEach((c, i) => {
      const col = shortestCol();
      col.appendChild(this.getCardElement(c));
      col.length += sizes[i];
    });
  }
}

define("super-masonry-layout", SuperMasonryLayout);
