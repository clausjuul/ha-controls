import type { CardConfig, Hass, LovelaceCard } from "./types";

/** HA's card helpers (window.loadCardHelpers). */
interface CardHelpers {
  createCardElement(config: CardConfig): LovelaceCard;
}

/** HA's card wrapper element (hui-card). */
interface HuiCardElement extends LovelaceCard {
  preview: boolean;
  config: CardConfig;
  load(): void;
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
  }
}

const loadCardHelpers = async (): Promise<CardHelpers> => {
  if (!window.loadCardHelpers) throw new Error("loadCardHelpers is not available");
  return window.loadCardHelpers();
};

/**
 * Creates an error card element that displays an error message.
 * Mimics HA's hui-error-card behavior.
 */
export function createErrorCard(error: string, config: CardConfig): LovelaceCard {
  const el = document.createElement("ha-card") as unknown as LovelaceCard;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "padding: 16px;";

  const header = document.createElement("div");
  header.style.cssText = "color: var(--error-color, red); font-weight: bold; margin-bottom: 8px;";
  header.textContent = "⚠ Card Error";

  const message = document.createElement("div");
  message.style.cssText = "font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px;";
  message.textContent = error;

  const pre = document.createElement("pre");
  pre.style.cssText = "font-size: 11px; background: var(--code-editor-background-color, #f5f5f5); padding: 8px; border-radius: 4px; overflow: auto; max-height: 100px;";
  pre.textContent = JSON.stringify(config, null, 2);

  wrapper.appendChild(header);
  wrapper.appendChild(message);
  wrapper.appendChild(pre);
  el.appendChild(wrapper);

  el.setConfig = () => {};
  return el;
}

/**
 * Safely creates a card element, returning an error card on failure.
 */
export function safeCreateCard(
  cardConfig: CardConfig,
  cardHelpers: CardHelpers,
  hass: Hass | undefined,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): LovelaceCard {
  try {
    // HA's own wrapper (2024.6+) handles `visibility:` conditions, error cards
    // and rebuilding late-loaded custom cards, like the built-in stacks do.
    if (customElements.get("hui-card")) {
      const el = document.createElement("hui-card") as HuiCardElement;
      el.hass = hass;
      el.preview = false;
      el.config = cardConfig;
      el.load();
      return el;
    }
    const el = cardHelpers.createCardElement(cardConfig);
    el.addEventListener("ll-rebuild", (ev: Event) => {
      ev.stopPropagation();
      onRebuild(el, cardConfig);
    });
    el.hass = hass;
    return el;
  } catch (error) {
    console.error("Error creating card:", error, cardConfig);
    return createErrorCard(
      error instanceof Error ? error.message : String(error),
      cardConfig
    );
  }
}

/**
 * Creates all cards from config, with error boundaries.
 */
export async function safeCreateCards(
  cards: CardConfig[] | undefined,
  hass: Hass | undefined,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): Promise<LovelaceCard[]> {
  if (!cards?.length) return [];
  const cardHelpers = await loadCardHelpers();
  return cards.map((cardConfig) =>
    safeCreateCard(cardConfig, cardHelpers, hass, onRebuild)
  );
}

/**
 * Rebuilds a single card, replacing it in the cards array.
 *
 * `getCards` is read after the await: several cards often ask to be rebuilt at
 * once (custom cards that load late), and mapping an array captured before the
 * await would let each rebuild overwrite the others.
 */
export async function safeRebuildCard(
  el: LovelaceCard,
  cardConfig: CardConfig,
  getCards: () => LovelaceCard[],
  hass: Hass | undefined,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): Promise<LovelaceCard[]> {
  const cardHelpers = await loadCardHelpers();
  const newEl = safeCreateCard(cardConfig, cardHelpers, hass, onRebuild);
  if (el.parentElement) {
    el.parentElement.replaceChild(newEl, el);
  }
  return getCards().map((card) => (card === el ? newEl : card));
}

/** A card's getCardSize(), awaited but capped at 500 ms; 1 when unknown. */
export async function computeCardSize(card: LovelaceCard | undefined): Promise<number> {
  if (!card?.getCardSize) return 1;
  try {
    const size = await Promise.race([
      Promise.resolve(card.getCardSize()),
      new Promise<number>((resolve) => setTimeout(() => resolve(1), 500)),
    ]);
    return typeof size === "number" && Number.isFinite(size) ? size : 1;
  } catch {
    return 1;
  }
}
