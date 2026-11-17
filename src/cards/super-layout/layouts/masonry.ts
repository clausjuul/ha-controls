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

    for (const c of cards) {
      const col = shortestCol();
      col.appendChild(this.getCardElement(c));

      col.length += c.card.getCardSize
        ? await (Promise.race([
            c.card.getCardSize(),
            new Promise((resolve) => setTimeout(() => resolve(1), 500)),
          ]) as Promise<number>)
        : 1;
    }
  }
}

define("super-masonry-layout", SuperMasonryLayout);
