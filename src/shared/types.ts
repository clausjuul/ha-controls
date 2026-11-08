// Minimal Home Assistant frontend types used by the cards in this repo.

export interface HassEntity {
  entity_id: string;
  state: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<unknown>;
  locale?: { language: string };
  language?: string;
}

export interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

export function fireEvent<T>(node: EventTarget, type: string, detail?: T): void {
  node.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
}

export function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, ctor);
}
