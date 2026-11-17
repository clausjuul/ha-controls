// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
import { CardConfig, LovelaceCard } from "./types";

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
  cardHelpers: any,
  hass: any,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): LovelaceCard {
  try {
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
  cards: CardConfig[],
  hass: any,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): Promise<LovelaceCard[]> {
  if (!cards?.length) return [];
  const cardHelpers = await (window as any).loadCardHelpers();
  return cards.map((cardConfig) =>
    safeCreateCard(cardConfig, cardHelpers, hass, onRebuild)
  );
}

/**
 * Rebuilds a single card, replacing it in the cards array.
 */
export async function safeRebuildCard(
  el: LovelaceCard,
  cardConfig: CardConfig,
  cards: LovelaceCard[],
  hass: any,
  onRebuild: (el: LovelaceCard, config: CardConfig) => void
): Promise<LovelaceCard[]> {
  const cardHelpers = await (window as any).loadCardHelpers();
  const newEl = safeCreateCard(cardConfig, cardHelpers, hass, onRebuild);
  if (el.parentElement) {
    el.parentElement.replaceChild(newEl, el);
  }
  return cards.map((card) => (card === el ? newEl : card));
}
