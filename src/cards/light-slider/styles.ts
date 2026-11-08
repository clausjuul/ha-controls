import { css } from 'lit';

export const styles = css`
  ha-card {
    padding: 12px;
    box-sizing: border-box;
  }
  .row {
    --hac-slider-color: var(--hac-light-color, var(--state-light-active-color, #ffb74d));
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 40px;
  }
  .row.sub {
    --hac-slider-height: 28px;
    --hac-slider-radius: 10px;
  }
  .row.missing {
    color: var(--error-color, #db4437);
    font-size: 14px;
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--state-icon-color, var(--secondary-text-color));
    background: color-mix(in srgb, var(--primary-text-color, #000) 6%, transparent);
    transition: background 200ms, color 200ms;
  }
  .row.sub .icon {
    width: 32px;
    height: 32px;
    --mdc-icon-size: 20px;
  }
  .row.on .icon {
    color: var(--hac-light-color, var(--state-light-active-color, #ffb74d));
    background: color-mix(
      in srgb,
      var(--hac-light-color, var(--state-light-active-color, #ffb74d)) 20%,
      transparent
    );
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    line-height: 20px;
  }
  .header.clickable {
    cursor: pointer;
  }
  .name {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row.sub .name {
    font-weight: 400;
  }
  .secondary {
    flex: none;
    font-size: 12px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .expand {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--secondary-text-color);
  }
  .expand-spacer {
    flex: none;
    width: 32px;
  }
  .expand ha-icon {
    transition: transform 200ms ease;
  }
  .expand.open ha-icon {
    transform: rotate(180deg);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
  }
  .details.sub {
    margin: 0 0 4px 44px;
    padding-top: 0;
    border-top: none;
  }
  .control {
    display: flex;
    flex-direction: column;
    gap: 4px;
    --hac-slider-height: 28px;
    --hac-slider-radius: 10px;
  }
  .label {
    font-size: 12px;
    color: var(--secondary-text-color);
  }
`;
