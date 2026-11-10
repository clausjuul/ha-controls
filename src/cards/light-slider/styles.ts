import { css } from 'lit';

export const styles = css`
  ha-card {
    padding: 0.857rem;
    box-sizing: border-box;
  }
  .room-header {
    display: flex;
    align-items: center;
    gap: 0.571rem;
    margin: -0.286rem 0 0.571rem 0.286rem;
  }
  .room-name {
    flex: 1;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .power.on {
    color: var(--state-light-active-color, #ff9800);
  }
  .items {
    display: flex;
    flex-direction: column;
  }
  .items > * + * {
    margin-top: 1.429rem;
  }
  .row {
    --_light: var(--hac-light-color, var(--state-light-active-color, #ff9800));
    --hac-slider-color: var(--_light);
    --hac-slider-height: 3.143rem;
    --hac-slider-radius: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.857rem;
  }
  .row.on {
    --hac-slider-track-background: color-mix(in srgb, var(--_light) 22%, transparent);
  }
  .row.light-fill {
    --hac-slider-value-color: rgba(0, 0, 0, 0.75);
  }
  .row.sub {
    --hac-slider-height: 2.571rem;
    --hac-slider-radius: 0.857rem;
    gap: 0.571rem;
  }
  .row.missing {
    color: var(--error-color, #db4437);
    font-size: 1rem;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 0.857rem;
    min-height: 2.857rem;
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
    outline: 2px solid var(--primary-color, #03a9f4);
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
    width: 3.143rem;
    height: 3.143rem;
    border-radius: 50%;
    color: var(--state-icon-color, var(--secondary-text-color));
    background: transparent;
    transition: background 200ms, color 200ms;
  }
  .row.sub .icon {
    width: 2.857rem;
    height: 2.857rem;
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
  }
  .name {
    font-size: 1rem;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row.sub .name {
    font-size: 0.93rem;
  }
  .secondary {
    font-size: 0.875rem;
    color: var(--secondary-text-color);
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
    gap: 0.571rem;
  }
  .bottom hac-slider {
    flex: 1;
    min-width: 0;
  }
  .toggle-bar {
    flex: 1;
    min-width: 0;
    height: var(--hac-slider-height, 3.143rem);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.571rem;
    padding: 0 1.143rem;
    border-radius: var(--hac-slider-radius, 1rem);
    background: color-mix(in srgb, var(--primary-text-color, #000) 12%, transparent);
    color: var(--secondary-text-color);
    transition: background 180ms, color 180ms;
  }
  .toggle-bar.on {
    background: var(--_light);
    color: var(--hac-slider-value-color, #fff);
  }
  .toggle-text {
    font-size: 1rem;
    font-weight: 500;
  }
  .toggle-bar:not(.on) .toggle-text {
    font-weight: 400;
  }
  .toggle-end {
    font-size: 0.875rem;
  }
  .toggle-bar:active:not(:disabled) {
    filter: brightness(0.95);
  }
  .expand-tile {
    flex: none;
    width: 3.143rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--hac-slider-radius, 1rem);
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
    --mdc-icon-size: 1.857rem;
  }
  .actions {
    gap: 0.286rem;
  }
  .action {
    flex: none;
    width: 3.143rem;
    height: 3.143rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--secondary-text-color);
    --mdc-icon-size: 1.714rem;
    transition: background 150ms;
  }
  .action:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
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
    gap: 1.143rem;
    margin-top: 1.143rem;
  }

  /* ----- popup ----- */
  dialog {
    /* Positioned next to the card from script */
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
    width: min(30rem, calc(100vw - 1.143rem));
    max-width: none;
    max-height: calc(100dvh - 1.143rem);
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--ha-card-border-radius, 1.143rem);
    background: var(--card-background-color, var(--ha-card-background, #fff));
    color: var(--primary-text-color);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.25);
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
    padding: 0.571rem 1.143rem 1.429rem;
  }
  .sheet-header {
    display: flex;
    align-items: center;
    gap: 0.714rem;
    min-height: 3.429rem;
    color: var(--secondary-text-color);
  }
  .sheet-title {
    flex: 1;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .sheet-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 0.571rem;
  }
  .empty {
    padding: 1.143rem 0;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 1rem;
  }
  .scenes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.571rem;
  }
  .scene {
    display: flex;
    align-items: center;
    gap: 0.714rem;
    min-height: 3.429rem;
    padding: 0.571rem 0.857rem;
    border-radius: 0.857rem;
    text-align: left;
    font-size: 1rem;
    background: color-mix(in srgb, var(--primary-text-color, #000) 6%, transparent);
    transition: background 150ms;
  }
  .scene span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .scene ha-icon {
    flex: none;
    --mdc-icon-size: 1.429rem;
    color: var(--secondary-text-color);
  }
  .scene:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #000) 12%, transparent);
  }
  .scene.active {
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 18%, transparent);
  }
  .scene.active ha-icon {
    color: var(--primary-color, #03a9f4);
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
    gap: 0.286rem;
    padding: 0.286rem;
    border-radius: 0.857rem;
    background: color-mix(in srgb, var(--primary-text-color, #000) 7%, transparent);
  }
  .tab {
    flex: 1;
    height: 2.571rem;
    border-radius: 0.643rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--secondary-text-color);
    transition: background 150ms, color 150ms;
  }
  .tab.selected {
    color: var(--primary-text-color);
    background: var(--card-background-color, var(--ha-card-background, #fff));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
    gap: 0.857rem;
    justify-items: center;
    padding: 0.286rem 0;
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
      0 0 0 3px var(--card-background-color, var(--ha-card-background, #fff)),
      0 0 0 5px var(--primary-text-color, #000);
  }
  hac-color-wheel {
    margin: 0.286rem auto;
  }
  .label {
    font-size: 0.875rem;
    color: var(--secondary-text-color);
  }
`;
