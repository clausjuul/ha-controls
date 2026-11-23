// @ts-nocheck -- copied from super-layout-card; not yet ported to strict mode
export const loadHaYamlEditor = async () => {
  if (customElements.get("ha-yaml-editor")) return;

  // Load in ha-yaml-editor from developer-tools-service
  const ppResolver = document.createElement("partial-panel-resolver");
  const routes = (ppResolver as any).getRoutes([
    {
      component_name: "developer-tools",
      url_path: "a",
    },
  ]);
  await routes?.routes?.a?.load?.();
  const devToolsRouter = document.createElement("developer-tools-router");
  await (devToolsRouter as any)?.routerOptions?.routes?.service?.load?.();
};

export const loadHaForm = async () => {
  if (customElements.get("ha-form")) return;

  const helpers = await (window as any).loadCardHelpers?.();
  if (!helpers) return;
  const card = await helpers.createCardElement({ type: "entity" });
  if (!card) return;
  await card.getConfigElement();
};

/** Layout types implemented in ./layouts (element name: super-<type>-layout). */
export const SUPER_LAYOUT_TYPES = [
  { type: "masonry", label: "Masonry" },
  { type: "horizontal", label: "Horizontal" },
  { type: "vertical", label: "Vertical" },
  { type: "grid", label: "Grid" },
  { type: "aligned-grid", label: "Aligned Grid" },
];
