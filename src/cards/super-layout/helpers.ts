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

export const SUPER_LAYOUT_CARD_SELECTOR_OPTIONS = [
  {
    value: "custom:super-masonry-layout",
    label: "Masonry (super-layout-card)",
  },
  {
    value: "custom:super-horizontal-layout",
    label: "Horizontal (super-layout-card)",
  },
  {
    value: "custom:super-vertical-layout",
    label: "Vertical (super-layout-card)",
  },
  {
    value: "custom:super-grid-layout",
    label: "Grid (super-layout-card)",
  },
  {
    value: "custom:super-aligned-grid-layout",
    label: "Aligned Grid (super-layout-card)",
  },
];
