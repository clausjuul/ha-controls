import { css } from 'lit';

export const styles = css`
  ha-card.grouped {
    padding: var(--hac-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-6);
  }

  .gl-group {
    display: flex;
    flex-direction: column;
    gap: 0.714rem;
  }

  /* ----- heading ----- */
  .gl-header {
    --_light: var(--hac-light-color, var(--hac-active));
    display: flex;
    align-items: center;
    gap: var(--hac-space-3);
  }
  .gl-header .icon {
    width: var(--hac-size-l);
    height: var(--hac-size-l);
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
    font-size: var(--hac-font-size-l);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .gl-sub {
    font-size: var(--hac-font-size-m);
    color: var(--hac-text-secondary);
  }

  /* ----- scenes: one row that scrolls sideways ----- */
  .gl-scenes {
    display: flex;
    gap: var(--hac-space-2);
    overflow-x: auto;
    /* Don't let the chips' total width make the card wider: scroll instead. */
    contain: inline-size;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    /* Reach the card edges so chips scroll out under the padding. */
    margin: 0 calc(-1 * var(--hac-space-4));
    padding: 0.143rem var(--hac-space-4);
  }
  .gl-scenes::-webkit-scrollbar {
    display: none;
  }
  .gl-scene {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.429rem;
    height: var(--hac-size-s);
    padding: 0 var(--hac-space-3) 0 0.714rem;
    border-radius: var(--hac-radius-pill);
    border: 1px solid var(--hac-divider);
    font-size: var(--hac-font-size-m);
    color: var(--hac-text);
    white-space: nowrap;
    --mdc-icon-size: 1.143rem;
    transition: background 150ms, border-color 150ms;
  }
  .gl-scene ha-icon {
    color: var(--hac-text-secondary);
  }
  .gl-scene:hover:not(:disabled) {
    background: var(--hac-hover);
  }
  .gl-scene.active {
    border-color: var(--hac-primary);
    background: color-mix(in srgb, var(--hac-primary) 14%, transparent);
  }
  .gl-scene.active ha-icon {
    color: var(--hac-primary);
  }

  /* ----- rows ----- */
  .gl-rows {
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-2);
  }
  .gl-row {
    --_light: var(--hac-light-color, var(--hac-active));
    /* Soft fills like the reference, readable with the theme's text colour. */
    --_fill: color-mix(
      in srgb,
      var(--_light) 65%,
      var(--hac-surface)
    );
    --_track: var(--hac-track);
    --hac-slider-height: var(--hac-size-s);
    --hac-slider-radius: var(--hac-control-radius);
    --hac-slider-color: var(--_fill);
    --hac-slider-track-background: var(--_track);
    --hac-slider-value-color: var(--hac-text);
    --hac-slider-value-color-track: var(--hac-text);
    display: flex;
    align-items: center;
    gap: var(--hac-space-3);
  }
  .gl-name {
    flex: 0 1 6.5rem;
    min-width: 3.5rem;
    height: var(--hac-size-s);
    text-align: left;
    font-size: var(--hac-font-size-m);
    color: var(--hac-text);
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
    height: var(--hac-size-s);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 var(--hac-space-4);
    border-radius: var(--hac-control-radius);
    background: var(--_track);
    font-size: var(--hac-font-size-m);
    color: var(--hac-text-secondary);
    transition: background 180ms;
  }
  .gl-toggle.on {
    background: var(--_fill);
    color: var(--hac-text);
    font-weight: var(--hac-weight-medium);
  }
  .gl-actions {
    flex: none;
    display: flex;
    gap: 0.143rem;
  }
  .gl-action,
  .gl-spacer {
    flex: none;
    width: var(--hac-size-s);
    height: var(--hac-size-s);
  }
  .gl-action {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--hac-text-secondary);
    --mdc-icon-size: 1.286rem;
  }
  .gl-action:hover:not(:disabled) {
    background: var(--hac-hover);
  }
  .gl-popup-rows {
    padding-bottom: var(--hac-space-1);
  }
`;
