// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { define } from '../../../shared/types';
import { CardConfigGroup } from "../types";
import { BaseColumnLayout } from "./base-column-layout";

class SuperMasonryLayout extends BaseColumnLayout {
  _usesCardSizes = true;

  /** Each card goes to the shortest column (columns under min_height first). */
  _assignColumns(cards: CardConfigGroup[], sizes: number[], columns: number) {
    const minHeight = this._config.layout?.min_height || 5;
    const lengths: number[] = new Array(columns).fill(0);
    const shortest = () => {
      let i = 0;
      for (let j = 0; j < columns; j++) {
        if (lengths[j] && lengths[j] < minHeight) return j;
        if (lengths[j] < lengths[i]) i = j;
      }
      return i;
    };
    return cards.map((_c, k) => {
      const col = shortest();
      lengths[col] += sizes[k];
      return col;
    });
  }
}

define("super-masonry-layout", SuperMasonryLayout);
