import { define } from './shared/types';
import { HacSlider } from './components/slider';
import {
  CARD_TAG,
  EDITOR_TAG,
  LightSliderCard,
} from './cards/light-slider/light-slider-card';
import { LightSliderCardEditor } from './cards/light-slider/light-slider-card-editor';

declare const __VERSION__: string;

const REPO_URL = 'https://github.com/Clausjuul/ha-controls';

// Shared components
define('hac-slider', HacSlider);

// Cards
define(CARD_TAG, LightSliderCard);
define(EDITOR_TAG, LightSliderCardEditor);

window.customCards = window.customCards ?? [];
const cards = [
  {
    type: CARD_TAG,
    name: 'Light Slider Card',
    description: 'Horizontal brightness slider for one or more lights, with color temperature and color.',
    preview: true,
    documentationURL: `${REPO_URL}#light-slider-card`,
  },
];
for (const card of cards) {
  if (!window.customCards.some((c) => c.type === card.type)) window.customCards.push(card);
}

console.info(
  `%c HA-CONTROLS %c v${__VERSION__} `,
  'color: white; background: #03a9f4; font-weight: 700;',
  'color: #03a9f4; background: white; font-weight: 700;',
);
