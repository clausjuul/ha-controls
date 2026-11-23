/**
 * Makes sure `ha-form` is defined: HA loads it lazily, and creating an entity
 * card's editor pulls it in.
 */
export const loadHaForm = async (): Promise<void> => {
  if (customElements.get("ha-form")) return;
  const helpers = await window.loadCardHelpers?.();
  const card = helpers?.createCardElement({ type: "entity" });
  const ctor = card?.constructor as { getConfigElement?: () => Promise<unknown> } | undefined;
  await ctor?.getConfigElement?.();
};

/** Layout types implemented in ./layouts (element name: super-<type>-layout). */
export const SUPER_LAYOUT_TYPES = [
  { type: "masonry", label: "Masonry" },
  { type: "horizontal", label: "Horizontal" },
  { type: "vertical", label: "Vertical" },
  { type: "grid", label: "Grid" },
  { type: "aligned-grid", label: "Aligned Grid" },
];
