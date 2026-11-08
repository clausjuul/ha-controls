import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fireEvent, type HomeAssistant } from '../../shared/types';
import { isEditorKey, localize } from '../../shared/localize';
import { DEFAULTS, entityId, rawEntities, type LightSliderCardConfig } from './config';

const SCHEMA = [
  {
    name: 'entities',
    required: true,
    selector: { entity: { multiple: true, filter: { domain: 'light' } } },
  },
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_color_temp', selector: { boolean: {} } },
      { name: 'show_color', selector: { boolean: {} } },
      { name: 'show_scenes', selector: { boolean: {} } },
      { name: 'expanded', selector: { boolean: {} } },
    ],
  },
  {
    name: 'scenes',
    selector: { entity: { multiple: true, filter: { domain: 'scene' } } },
  },
] as const;

type BoolKey = keyof typeof DEFAULTS;

interface FormData {
  entities: string[];
  name: string;
  icon: string;
  show_color_temp: boolean;
  show_color: boolean;
  show_scenes: boolean;
  expanded: boolean;
  scenes: string[];
}

export class LightSliderCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: LightSliderCardConfig;

  setConfig(config: LightSliderCardConfig): void {
    this._config = config;
  }

  private get _data(): FormData {
    const c = this._config!;
    return {
      entities: rawEntities(c).map(entityId),
      name: c.name ?? '',
      icon: c.icon ?? '',
      show_color_temp: c.show_color_temp ?? DEFAULTS.show_color_temp,
      show_color: c.show_color ?? DEFAULTS.show_color,
      show_scenes: c.show_scenes ?? DEFAULTS.show_scenes,
      expanded: c.expanded ?? DEFAULTS.expanded,
      scenes: c.scenes ?? [],
    };
  }

  private _computeLabel = (schema: { name: string }) => {
    const key = `editor.${schema.name}`;
    return isEditorKey(key) ? localize(this.hass)(key) : schema.name;
  };

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: Partial<FormData> }>) {
    ev.stopPropagation();
    if (!this._config) return;
    const data = ev.detail.value;

    // Keep per-light options (name/icon) for lights that are still selected.
    const existing = new Map(rawEntities(this._config).map((e) => [entityId(e), e]));
    const entities = (data.entities ?? []).map((id) => existing.get(id) ?? id);

    const config: LightSliderCardConfig = { ...this._config, entities };
    delete config.entity;

    for (const key of ['name', 'icon'] as const) {
      if (data[key]) config[key] = data[key];
      else delete config[key];
    }
    if (data.scenes?.length) config.scenes = data.scenes;
    else delete config.scenes;

    for (const key of Object.keys(DEFAULTS) as BoolKey[]) {
      const value = data[key];
      if (value === undefined || value === DEFAULTS[key]) delete config[key];
      else config[key] = value;
    }

    this._config = config;
    fireEvent(this, 'config-changed', { config });
  }
}
