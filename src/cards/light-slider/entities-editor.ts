import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { fireEvent, type HomeAssistant } from '../../shared/types';
import { isEditorKey, localize } from '../../shared/localize';
import { DOMAINS, entityId, type LightEntityConfig } from './config';

type Entry = string | LightEntityConfig;

const ROW_SCHEMA = [
  { name: 'entity', selector: { entity: { filter: { domain: DOMAINS } } } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'show_icon', selector: { boolean: {} } },
    ],
  },
];

const ADD_SCHEMA = [{ name: 'add_entity', selector: { entity: { filter: { domain: DOMAINS } } } }];

interface RowData {
  entity?: string;
  name?: string;
  show_icon?: boolean;
}

/** Plain entity ID when nothing else is set, else an object. */
function toEntry(prev: Entry, data: RowData): Entry {
  const base: LightEntityConfig = typeof prev === 'string' ? { entity: prev } : { ...prev };
  base.entity = data.entity ?? base.entity;
  if (data.name) base.name = data.name;
  else delete base.name;
  if (data.show_icon === false) base.show_icon = false;
  else delete base.show_icon;
  const keys = Object.keys(base).filter((k) => base[k as keyof LightEntityConfig] !== undefined);
  return keys.length === 1 ? base.entity : base;
}

/**
 * Editable list of lights: entity, own name and icon on/off per light, and
 * buttons to reorder and remove. Fires `entities-changed` with the new list.
 */
export class HacEntitiesEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) entities: Entry[] = [];
  @property() label = '';

  private _label = (schema: { name: string }) => {
    const key = `editor.${schema.name}`;
    return isEditorKey(key) ? localize(this.hass)(key) : schema.name;
  };

  private _emit(entities: Entry[]) {
    fireEvent(this, 'entities-changed', { entities });
  }

  private _changed(index: number, ev: CustomEvent<{ value: RowData }>) {
    ev.stopPropagation();
    const list = [...this.entities];
    if (!ev.detail.value.entity) {
      list.splice(index, 1);
    } else {
      list[index] = toEntry(list[index], ev.detail.value);
    }
    this._emit(list);
  }

  private _added(ev: CustomEvent<{ value: { add_entity?: string } }>) {
    ev.stopPropagation();
    const id = ev.detail.value.add_entity;
    if (!id || this.entities.some((e) => entityId(e) === id)) return;
    this._emit([...this.entities, id]);
  }

  private _move(index: number, delta: number) {
    const list = [...this.entities];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this._emit(list);
  }

  private _remove(index: number) {
    this._emit(this.entities.filter((_, i) => i !== index));
  }

  protected render() {
    if (!this.hass) return nothing;
    const t = localize(this.hass);
    return html`
      ${this.label ? html`<div class="title">${this.label}</div>` : nothing}
      ${this.entities.map((e, i) => {
        const conf = typeof e === 'string' ? { entity: e } : e;
        return html`
          <div class="entity">
            <ha-form
              .hass=${this.hass}
              .data=${{
                entity: conf.entity,
                name: conf.name ?? '',
                show_icon: conf.show_icon !== false,
              }}
              .schema=${ROW_SCHEMA}
              .computeLabel=${this._label}
              @value-changed=${(ev: CustomEvent<{ value: RowData }>) => this._changed(i, ev)}
            ></ha-form>
            <div class="buttons">
              <button
                title=${t('editor.move_up')}
                aria-label=${t('editor.move_up')}
                ?disabled=${i === 0}
                @click=${() => this._move(i, -1)}
              >
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </button>
              <button
                title=${t('editor.move_down')}
                aria-label=${t('editor.move_down')}
                ?disabled=${i === this.entities.length - 1}
                @click=${() => this._move(i, 1)}
              >
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </button>
              <button
                title=${t('editor.remove_item')}
                aria-label=${t('editor.remove_item')}
                @click=${() => this._remove(i)}
              >
                <ha-icon icon="mdi:delete-outline"></ha-icon>
              </button>
            </div>
          </div>
        `;
      })}
      <ha-form
        .hass=${this.hass}
        .data=${{ add_entity: '' }}
        .schema=${ADD_SCHEMA}
        .computeLabel=${this._label}
        @value-changed=${this._added}
      ></ha-form>
    `;
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
    }
    .title {
      font-weight: 500;
      margin: 4px 0 8px;
    }
    .entity {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      padding: 8px 4px 0 12px;
      margin-bottom: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 12px;
    }
    .entity ha-form {
      flex: 1;
      min-width: 0;
    }
    .buttons {
      display: flex;
      flex-direction: column;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: none;
      color: var(--secondary-text-color);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
  `;
}
