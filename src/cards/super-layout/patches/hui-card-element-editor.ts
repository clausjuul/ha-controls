// Keeps a card's `view_layout` out of its own editor and puts it back on save,
// so card editors that reject unknown keys still work inside super layouts.
import type { CardConfig } from "../types";

/** A card's config editor element, with the layout data we park on it. */
interface CardConfigElement extends HTMLElement {
  setConfig(config: CardConfig): void;
  _layoutData?: CardConfig["view_layout"];
}

/** The parts of HA's hui-card-element-editor this patch touches. */
interface HuiCardElementEditor extends HTMLElement {
  _configElement?: CardConfigElement;
  getConfigElement(): Promise<CardConfigElement | undefined>;
  _handleUIConfigChanged(ev: CustomEvent<{ config: CardConfig }>): void;
}

customElements.whenDefined("hui-card-element-editor").then(() => {
  const ctor = customElements.get("hui-card-element-editor");
  const proto = ctor?.prototype as HuiCardElementEditor | undefined;
  // This patches every card editor in HA. If HA renames these internals,
  // skip the patch rather than break all card editors.
  if (
    !proto ||
    typeof proto.getConfigElement !== "function" ||
    typeof proto._handleUIConfigChanged !== "function"
  ) {
    console.warn("super-layout-card: hui-card-element-editor changed, view_layout patch skipped");
    return;
  }

  const getConfigElement = proto.getConfigElement;
  proto.getConfigElement = async function (this: HuiCardElementEditor) {
    const element = await getConfigElement.call(this);
    if (element) {
      const setConfig = element.setConfig;
      try {
        element.setConfig = function (this: CardConfigElement, config: CardConfig) {
          const newConfig: CardConfig = JSON.parse(JSON.stringify(config));
          this._layoutData = newConfig.view_layout;
          delete newConfig.view_layout;
          setConfig.call(this, newConfig);
        };
      } catch (error) {
        console.warn(error);
      }
    }
    return element;
  };

  const handleUIConfigChanged = proto._handleUIConfigChanged;
  proto._handleUIConfigChanged = function (
    this: HuiCardElementEditor,
    ev: CustomEvent<{ config: CardConfig }>
  ) {
    if (this._configElement?._layoutData)
      ev.detail.config.view_layout = this._configElement._layoutData;
    handleUIConfigChanged.call(this, ev);
  };
});
