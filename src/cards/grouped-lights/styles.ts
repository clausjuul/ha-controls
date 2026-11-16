import { css } from 'lit';

export const styles = css`
  ha-card.grouped {
    padding: 1.143rem;
    display: flex;
    flex-direction: column;
    gap: 1.714rem;
  }

  .gl-group {
    display: flex;
    flex-direction: column;
    gap: 0.714rem;
  }

  /* ----- heading ----- */
  .gl-header {
    --_light: var(--hac-light-color, var(--state-light-active-color, #ff9800));
    display: flex;
    align-items: center;
    gap: 0.857rem;
  }
  .gl-header .icon {
    width: 3.143rem;
    height: 3.143rem;
    --mdc-icon-size: 1.571rem;
  }
  .gl-header.on .icon {
    color: var(--_light);
    background: color-mix(in srgb, var(--_light) 22%, transparent);
  }
  .gl-heading {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .gl-title {
    font-size: 1.143rem;
    font-weight: 500;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .gl-sub {
    font-size: 0.929rem;
    color: var(--secondary-text-color);
  }

  /* ----- scenes: one row that scrolls sideways ----- */
  .gl-scenes {
    display: flex;
    gap: 0.571rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    /* Reach the card edges so chips scroll out under the padding. */
    margin: 0 -1.143rem;
    padding: 0.143rem 1.143rem;
  }
  .gl-scenes::-webkit-scrollbar {
    display: none;
  }
  .gl-scene {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.429rem;
    height: 2.286rem;
    padding: 0 0.857rem 0 0.714rem;
    border-radius: 1.143rem;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    font-size: 0.929rem;
    color: var(--primary-text-color);
    white-space: nowrap;
    --mdc-icon-size: 1.143rem;
    transition: background 150ms, border-color 150ms;
  }
  .gl-scene ha-icon {
    color: var(--secondary-text-color);
  }
  .gl-scene:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #000) 6%, transparent);
  }
  .gl-scene.active {
    border-color: var(--primary-color, #03a9f4);
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 14%, transparent);
  }
  .gl-scene.active ha-icon {
    color: var(--primary-color, #03a9f4);
  }

  /* ----- rows ----- */
  .gl-rows {
    display: flex;
    flex-direction: column;
    gap: 0.571rem;
  }
  .gl-row {
    --_light: var(--hac-light-color, var(--state-light-active-color, #ff9800));
    /* Soft fills like the reference, readable with the theme's text colour. */
    --_fill: color-mix(
      in srgb,
      var(--_light) 70%,
      var(--card-background-color, var(--ha-card-background, #fff))
    );
    --_track: color-mix(in srgb, var(--primary-text-color, #000) 9%, transparent);
    --hac-slider-height: 2.286rem;
    --hac-slider-radius: 0.714rem;
    --hac-slider-color: var(--_fill);
    --hac-slider-track-background: var(--_track);
    --hac-slider-value-color: var(--primary-text-color);
    --hac-slider-value-color-track: var(--primary-text-color);
    display: flex;
    align-items: center;
    gap: 0.714rem;
  }
  .gl-name {
    flex: 0 1 6.5rem;
    min-width: 3.5rem;
    height: 2.286rem;
    text-align: left;
    font-size: 0.929rem;
    color: var(--primary-text-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .gl-row hac-slider,
  .gl-toggle {
    flex: 1;
    min-width: 0;
  }
  .gl-toggle {
    height: 2.286rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1.143rem;
    border-radius: 0.714rem;
    background: var(--_track);
    font-size: 0.93rem;
    color: var(--secondary-text-color);
    transition: background 180ms;
  }
  .gl-toggle.on {
    background: var(--_fill);
    color: var(--primary-text-color);
    font-weight: 500;
  }
  .gl-actions {
    flex: none;
    display: flex;
    gap: 0.143rem;
  }
  .gl-action,
  .gl-spacer {
    flex: none;
    width: 2.286rem;
    height: 2.286rem;
  }
  .gl-action {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--secondary-text-color);
    --mdc-icon-size: 1.286rem;
  }
  .gl-action:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #000) 8%, transparent);
  }
  .gl-popup-rows {
    padding-bottom: 0.286rem;
  }
`;
