import { css } from 'lit';

export const styles = css`
  ha-card {
    padding: 12px;
    box-sizing: border-box;
  }
  .room-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -4px 0 8px 4px;
  }
  .room-name {
    flex: 1;
    min-width: 0;
    font-size: 18px;
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
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
  }
  .row {
    --_light: var(--hac-light-color, var(--state-light-active-color, #ff9800));
    --hac-slider-color: var(--_light);
    --hac-slider-height: 52px;
    --hac-slider-radius: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row.on {
    --hac-slider-track-background: color-mix(in srgb, var(--_light) 22%, transparent);
  }
  .row.light-fill {
    --hac-slider-value-color: rgba(0, 0, 0, 0.75);
  }
  .row.sub {
    --hac-slider-height: 40px;
    --hac-slider-radius: 12px;
    gap: 8px;
  }
  .row.missing {
    color: var(--error-color, #db4437);
    font-size: 14px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 40px;
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
    width: 44px;
    height: 44px;
    border-radius: 50%;
    color: var(--state-icon-color, var(--secondary-text-color));
    background: transparent;
    transition: background 200ms, color 200ms;
  }
  .row.sub .icon {
    width: 40px;
    height: 40px;
    --mdc-icon-size: 20px;
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
    font-size: 16px;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row.sub .name {
    font-size: 14px;
  }
  .secondary {
    font-size: 13px;
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
    gap: 8px;
  }
  .bottom hac-slider {
    flex: 1;
    min-width: 0;
  }
  .expand-tile {
    flex: none;
    width: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--hac-slider-radius, 14px);
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
    --mdc-icon-size: 26px;
  }
  .actions {
    gap: 4px;
  }
  .action {
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--secondary-text-color);
    --mdc-icon-size: 24px;
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
    gap: 16px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
  }

  /* ----- popup ----- */
  dialog {
    /* Positioned next to the card from script */
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
    width: min(420px, calc(100vw - 16px));
    max-width: none;
    max-height: calc(100dvh - 16px);
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--ha-card-border-radius, 16px);
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
    padding: 8px 16px 20px;
  }
  .sheet-header {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    color: var(--secondary-text-color);
  }
  .sheet-title {
    flex: 1;
    min-width: 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .sheet-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-top: 8px;
  }
  .empty {
    padding: 16px 0;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 14px;
  }
  .scenes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .scene {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 8px 12px;
    border-radius: 12px;
    text-align: left;
    font-size: 14px;
    background: color-mix(in srgb, var(--primary-text-color, #000) 6%, transparent);
    transition: background 150ms;
  }
  .scene span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .scene ha-icon {
    flex: none;
    --mdc-icon-size: 20px;
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
    gap: 6px;
    --hac-slider-height: 40px;
    --hac-slider-radius: 12px;
  }
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--primary-text-color, #000) 7%, transparent);
  }
  .tab {
    flex: 1;
    height: 36px;
    border-radius: 9px;
    font-size: 14px;
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
    gap: 12px;
    justify-items: center;
    padding: 4px 0;
  }
  .swatch {
    width: 100%;
    max-width: 52px;
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
    margin: 4px auto;
  }
  .label {
    font-size: 13px;
    color: var(--secondary-text-color);
  }
`;
