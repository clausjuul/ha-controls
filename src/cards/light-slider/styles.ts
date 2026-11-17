import { css } from 'lit';

export const styles = css`
  ha-card {
    padding: var(--hac-space-3);
    box-sizing: border-box;
  }
  .room-header {
    display: flex;
    align-items: center;
    gap: var(--hac-space-2);
    margin: calc(-1 * var(--hac-space-1)) 0 var(--hac-space-2) var(--hac-space-1);
  }
  .room-name {
    flex: 1;
    min-width: 0;
    font-size: var(--hac-font-size-xl);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .power.on {
    color: var(--hac-active);
  }
  .items {
    display: flex;
    flex-direction: column;
  }
  .items > * + * {
    margin-top: 1.429rem;
  }
  .row {
    --_light: var(--hac-light-color, var(--hac-active));
    /* Softened towards the card, so the theme's text colour reads on it. */
    --_fill: color-mix(in srgb, var(--_light) 65%, var(--hac-surface));
    --hac-slider-color: var(--_fill);
    --hac-slider-value-color: var(--hac-text);
    --hac-slider-height: 3.143rem;
    --hac-slider-radius: var(--hac-control-radius);
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-3);
  }
  .row.on {
    --hac-slider-track-background: color-mix(in srgb, var(--_light) 22%, transparent);
  }
  .row.sub {
    --hac-slider-height: 2.571rem;
    --hac-slider-radius: 0.857rem;
    gap: var(--hac-space-2);
  }
  .row.missing {
    color: var(--error-color, #db4437);
    font-size: var(--hac-font-size-m);
  }
  .top {
    display: flex;
    align-items: center;
    gap: var(--hac-space-3);
    min-height: var(--hac-size-m);
  }

  button {
    font: inherit;
    color: inherit;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button:focus-visible {
    outline: 2px solid var(--hac-primary);
    outline-offset: 2px;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--hac-size-l);
    height: var(--hac-size-l);
    border-radius: 50%;
    color: var(--state-icon-color, var(--hac-text-secondary));
    background: transparent;
    transition: background 200ms, color 200ms;
  }
  .row.sub .icon {
    width: var(--hac-size-m);
    height: var(--hac-size-m);
    --mdc-icon-size: 1.429rem;
  }
  .row.on .icon {
    color: var(--_light);
    background: color-mix(in srgb, var(--_light) 22%, transparent);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 20px;
  }
  .info.clickable {
    cursor: pointer;
    text-align: left;
    min-height: var(--hac-size-m);
  }
  .name {
    font-size: var(--hac-font-size-m);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row.sub .name {
    font-size: var(--hac-font-size-m);
  }
  .secondary {
    font-size: var(--hac-font-size-s);
    color: var(--hac-text-secondary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .actions {
    flex: none;
    display: flex;
    align-items: center;
  }
  .bottom {
    display: flex;
    align-items: stretch;
    gap: var(--hac-space-2);
  }
  .bottom hac-slider {
    flex: 1;
    min-width: 0;
  }
  .toggle-bar {
    flex: 1;
    min-width: 0;
    height: var(--hac-slider-height, var(--hac-size-l));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hac-space-2);
    padding: 0 var(--hac-space-4);
    border-radius: var(--hac-slider-radius, 1rem);
    background: var(--hac-track);
    color: var(--hac-text-secondary);
    transition: background 180ms, color 180ms;
  }
  .toggle-bar.on {
    background: var(--_fill);
    color: var(--hac-text);
  }
  .toggle-text {
    font-size: var(--hac-font-size-m);
    font-weight: var(--hac-weight-medium);
  }
  .toggle-bar:not(.on) .toggle-text {
    font-weight: var(--hac-weight-normal);
  }
  .toggle-end {
    font-size: var(--hac-font-size-s);
  }
  .toggle-bar:active:not(:disabled) {
    filter: brightness(0.95);
  }
  .expand-tile {
    flex: none;
    width: var(--hac-size-l);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--hac-slider-radius, 1rem);
    color: var(--hac-text-secondary);
    background: var(--hac-hover);
    --mdc-icon-size: 1.857rem;
  }
  .actions {
    gap: var(--hac-space-1);
  }
  .action {
    flex: none;
    width: var(--hac-size-l);
    height: var(--hac-size-l);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--hac-text-secondary);
    --mdc-icon-size: 1.714rem;
    transition: background 150ms;
  }
  .action:hover:not(:disabled) {
    background: var(--hac-hover);
  }
  .expand ha-icon {
    transition: transform 200ms ease;
  }
  .expand.open ha-icon {
    transform: rotate(180deg);
  }

  .lights {
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-4);
    margin-top: var(--hac-space-4);
  }

  /* ----- compact ----- */
  ha-card.compact {
    padding: var(--hac-space-3) 1rem;
  }
  .row.compact {
    flex-direction: row;
    align-items: center;
    gap: 0.714rem;
    min-height: var(--hac-size-m);
  }
  .row.compact .icon,
  .row.compact .icon-spacer {
    flex: none;
    width: var(--hac-size-s);
    height: var(--hac-size-s);
    --mdc-icon-size: 1.286rem;
  }
  .row.compact .name {
    flex: 0 1 5rem;
    min-width: var(--hac-size-m);
    display: flex;
    align-items: center;
    gap: 0.143rem;
    font-size: var(--hac-font-size-m);
    font-weight: var(--hac-weight-normal);
    text-align: left;
  }
  .name-text {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row.compact .icon.chevron {
    background: transparent;
    color: var(--hac-text-secondary);
    --mdc-icon-size: 1.857rem;
  }
  .row.compact .icon.chevron ha-icon {
    transition: transform 200ms ease;
  }
  .row.compact .icon.chevron.open ha-icon {
    transform: rotate(180deg);
  }
  .row.compact .name-button {
    height: var(--hac-size-s);
    color: var(--hac-text);
  }
  .name-button ha-icon {
    flex: none;
    --mdc-icon-size: 1.143rem;
    color: var(--hac-text-secondary);
    transition: transform 200ms ease;
  }
  .name-button.open ha-icon {
    transform: rotate(180deg);
  }
  .row.compact hac-slider {
    flex: 1 1 9rem;
    min-width: 7.143rem;
  }
  .row.compact .grow {
    flex: 1;
    min-width: 0;
  }
  .row.compact .grow {
    text-align: right;
    font-size: var(--hac-font-size-m);
    color: var(--hac-text-secondary);
  }
  .row.compact .actions {
    flex: none;
    gap: var(--hac-space-1);
  }
  .row.compact .action,
  .row.compact .action-spacer {
    flex: none;
    width: var(--hac-size-s);
    height: var(--hac-size-s);
    --mdc-icon-size: 1.286rem;
  }
  .row.compact .expand ha-icon {
    --mdc-icon-size: 1.714rem;
  }
  .switch {
    flex: none;
    position: relative;
    width: var(--hac-size-m);
    height: var(--hac-space-6);
    border-radius: var(--hac-radius-l);
    background: var(--hac-track);
    transition: background 180ms;
  }
  .switch::before {
    /* Bigger tap target than the switch itself */
    content: '';
    position: absolute;
    inset: calc(-1 * var(--hac-space-2)) calc(-1 * var(--hac-space-1));
  }
  .switch-knob {
    position: absolute;
    top: 0.214rem;
    left: 0.214rem;
    width: 1.286rem;
    height: 1.286rem;
    border-radius: 50%;
    background: var(--hac-switch-knob-off);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: transform 180ms ease, background 180ms;
  }
  .switch {
    background: var(--hac-switch-off);
  }
  .switch.on {
    background: var(--hac-switch-on);
  }
  .switch.on .switch-knob {
    background: var(--hac-switch-knob-on);
  }
  .switch.on .switch-knob {
    transform: translateX(1.143rem);
  }
  ha-card.compact .items {
    gap: var(--hac-space-3);
  }
  ha-card.compact .items > * + * {
    margin-top: 0;
  }
  ha-card.compact .lights {
    /* A faint panel behind the expanded lights. The negative margin lets it
       reach into the card padding, so the rows stay aligned with the rest. */
    margin: var(--hac-space-2) calc(-1 * var(--hac-space-2)) 0;
    padding: 0.429rem var(--hac-space-2);
    gap: var(--hac-space-3);
    border-radius: var(--hac-radius-l);
    background: color-mix(in srgb, var(--hac-text) 5%, transparent);
  }
  .room-header.compact {
    --_light: var(--hac-light-color, var(--hac-active));
    gap: var(--hac-space-3);
    margin: 0 0 var(--hac-space-4);
  }
  .room-header.compact .icon {
    width: var(--hac-size-m);
    height: var(--hac-size-m);
  }
  .room-header.compact.on .icon {
    color: var(--_light);
    background: color-mix(in srgb, var(--_light) 22%, transparent);
  }
  .room-header.compact .room-name {
    font-size: var(--hac-font-size-l);
  }

  /* ----- popup ----- */
  dialog {
    /* Positioned next to the card from script */
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: none;
    width: min(30rem, calc(100vw - var(--hac-space-4)));
    max-width: none;
    max-height: calc(100dvh - 1.143rem);
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--hac-dialog-radius);
    background: var(--hac-dialog-bg);
    color: var(--hac-text);
    font-family: var(--hac-font-family);
    box-shadow: var(--ha-card-box-shadow, 0 8px 32px rgba(0, 0, 0, 0.3));
  }
  dialog::backdrop {
    background: var(--hac-scrim);
  }
  dialog[open] {
    animation: pop-in 140ms ease-out;
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
  .sheet {
    padding: var(--hac-space-2) var(--hac-space-4) 1.429rem;
  }
  .sheet-header {
    display: flex;
    align-items: center;
    gap: 0.714rem;
    min-height: 3.429rem;
    color: var(--hac-text-secondary);
  }
  .sheet-title {
    flex: 1;
    min-width: 0;
    font-size: var(--hac-font-size-xl);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .sheet-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: var(--hac-space-2);
  }
  .empty {
    padding: var(--hac-space-4) 0;
    text-align: center;
    color: var(--hac-text-secondary);
    font-size: var(--hac-font-size-m);
  }
  .scenes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--hac-space-2);
  }
  .effects {
    max-height: min(50vh, 22rem);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .effect-search {
    box-sizing: border-box;
    width: 100%;
    height: var(--hac-size-m);
    padding: 0 1rem;
    border-radius: var(--hac-radius-l);
    border: 1px solid var(--hac-divider);
    background: transparent;
    color: var(--hac-text);
    font: inherit;
    font-size: var(--hac-font-size-m);
  }
  .effect-search:focus {
    outline: 2px solid var(--hac-primary);
    outline-offset: -1px;
  }
  .scene {
    display: flex;
    align-items: center;
    gap: 0.714rem;
    min-height: 3.429rem;
    padding: var(--hac-space-2) var(--hac-space-3);
    border-radius: var(--hac-radius-l);
    text-align: left;
    font-size: var(--hac-font-size-m);
    background: var(--hac-hover);
    transition: background 150ms;
  }
  .scene span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .scene ha-icon {
    flex: none;
    --mdc-icon-size: 1.429rem;
    color: var(--hac-text-secondary);
  }
  .scene:hover:not(:disabled) {
    background: var(--hac-track);
  }
  .scene.active {
    background: color-mix(in srgb, var(--hac-primary) 18%, transparent);
  }
  .scene.active ha-icon {
    color: var(--hac-primary);
  }
  .control {
    display: flex;
    flex-direction: column;
    gap: 0.429rem;
    --hac-slider-height: 2.857rem;
    --hac-slider-radius: 0.857rem;
  }
  .tabs {
    display: flex;
    gap: var(--hac-space-1);
    padding: var(--hac-space-1);
    border-radius: var(--hac-radius-l);
    background: var(--hac-hover);
  }
  .tab {
    flex: 1;
    height: 2.571rem;
    border-radius: 0.643rem;
    font-size: var(--hac-font-size-m);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text-secondary);
    transition: background 150ms, color 150ms;
  }
  .tab.selected {
    color: var(--hac-text);
    background: var(--hac-surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
    gap: var(--hac-space-3);
    justify-items: center;
    padding: var(--hac-space-1) 0;
  }
  .swatch {
    width: 100%;
    max-width: 3.714rem;
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
    transition: transform 120ms ease, background 200ms;
  }
  .swatch:active {
    transform: scale(0.92);
  }
  .swatch.active {
    box-shadow:
      0 0 0 3px var(--hac-surface),
      0 0 0 5px var(--hac-text);
  }
  hac-color-wheel {
    margin: var(--hac-space-1) auto;
  }
  .label {
    font-size: var(--hac-font-size-s);
    color: var(--hac-text-secondary);
  }
`;
