import { css } from 'lit';

export const styles = css`
  ha-card.grouped {
    padding: var(--hac-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-3);
  }

  /* Each group sits on a faint panel, like a row's folded-out lights. The
     negative margin keeps its rows lined up with the rest of the card. */
  .gl-group {
    --_light: var(--hac-light-color, var(--hac-active));
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin: 0 calc(-1 * var(--hac-space-2));
    padding: var(--hac-space-2);
    border-radius: var(--hac-radius-l);
    background: color-mix(in srgb, var(--hac-text) 5%, transparent);
  }
  .gl-group > .gl-header,
  .gl-group > .gl-collapse {
    position: relative;
  }
  /* A folded group with lights on: drag sideways to dim them. Their level is
     a faint fill across the panel. */
  .gl-group.dimmable {
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  .gl-level {
    position: absolute;
    inset: 0 auto 0 0;
    background: color-mix(in srgb, var(--_light) 14%, transparent);
    pointer-events: none;
    transition: width 180ms ease-out;
  }
  .gl-group.dragging .gl-level {
    transition: none;
  }
  /* A group's scene row scrolls out under the panel's padding, not the card's. */
  .gl-group .gl-scenes {
    margin: 0 calc(-1 * var(--hac-space-2));
    padding: 0.143rem var(--hac-space-2);
  }
  .gl-body {
    display: flex;
    flex-direction: column;
    gap: 0.714rem;
    padding-top: 0.714rem;
  }

  /* ----- sliding open and shut ----- */
  .gl-collapse {
    display: grid;
    grid-template-rows: 1fr;
    transition:
      grid-template-rows 260ms cubic-bezier(0.2, 0, 0, 1),
      opacity 200ms ease;
  }
  .gl-collapse.closed {
    grid-template-rows: 0fr;
    opacity: 0;
  }
  .gl-collapse-inner {
    min-height: 0;
    overflow: hidden;
    /* Room for content that reaches past the edges (scene row, light panel),
       which overflow: hidden would otherwise cut off. */
    margin: 0 calc(-1 * var(--_bleed));
    padding: 0 var(--_bleed);
  }
  .gl-collapse.group {
    --_bleed: var(--hac-space-2);
  }
  .gl-collapse.row {
    --_bleed: var(--hac-space-2);
  }
  @media (prefers-reduced-motion: reduce) {
    .gl-collapse {
      transition: none;
    }
  }

  /* ----- heading ----- */
  .gl-header {
    --_light: var(--hac-light-color, var(--hac-active));
    display: flex;
    align-items: center;
    gap: var(--hac-space-3);
  }
  /* The icon is grey while the group is off and glows in the light's colour
     while it's on. */
  .gl-header .icon {
    width: var(--hac-size-m);
    height: var(--hac-size-m);
    --mdc-icon-size: 1.571rem;
    color: color-mix(in srgb, var(--hac-text) 38%, transparent);
    background: transparent;
    transition: color 200ms, filter 200ms;
  }
  .gl-header.on .icon {
    color: var(--_light);
    background: transparent;
    filter: drop-shadow(0 0 0.286rem color-mix(in srgb, var(--_light) 80%, transparent))
      drop-shadow(0 0 0.714rem color-mix(in srgb, var(--_light) 45%, transparent));
  }
  .gl-heading {
    flex: 1;
    min-width: 0;
    height: var(--hac-size-m);
    display: flex;
    align-items: center;
    gap: var(--hac-space-1);
    text-align: left;
  }
  .gl-fold ha-icon {
    flex: none;
    --mdc-icon-size: 1.429rem;
    color: var(--hac-text-secondary);
    transition: transform 200ms ease;
  }
  .gl-fold.open ha-icon {
    transform: rotate(180deg);
  }
  .gl-title {
    min-width: 0;
    font-size: var(--hac-font-size-l);
    font-weight: var(--hac-weight-medium);
    color: var(--hac-text);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
  .gl-scene.no-icon {
    padding-left: var(--hac-space-3);
  }
  .gl-scene.colored {
    border-color: color-mix(in srgb, var(--gl-scene-color) 55%, transparent);
    background: var(--gl-scene-bg, color-mix(in srgb, var(--gl-scene-color) 16%, transparent));
  }
  .gl-scene.colored ha-icon {
    color: var(--gl-scene-color);
  }
  .gl-scene.colored:hover:not(:disabled) {
    background: var(--gl-scene-bg-hover, color-mix(in srgb, var(--gl-scene-color) 26%, transparent));
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
    --hac-slider-value-weight: var(--hac-weight-normal);
    /* The buttons get just the room they need, and the name and bar share the
       rest 1:2. Every row renders the same buttons (or spacers), so the bars
       still line up. */
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
    align-items: center;
    gap: var(--hac-space-3);
  }
  .gl-name {
    min-width: 0;
    height: var(--hac-size-s);
    display: flex;
    align-items: center;
    gap: 0.143rem;
    text-align: left;
    font-size: var(--hac-font-size-m);
    color: var(--hac-text);
  }
  .gl-name-text {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .gl-name ha-icon {
    flex: none;
    --mdc-icon-size: 1.143rem;
    color: var(--hac-text-secondary);
    transition: transform 200ms ease;
  }
  .gl-name.open ha-icon {
    transform: rotate(180deg);
  }
  .gl-row hac-slider,
  .gl-toggle {
    min-width: 0;
  }

  /* ----- a row's lights, folded out under it ----- */
  .gl-lights {
    display: flex;
    flex-direction: column;
    gap: var(--hac-space-2);
    /* A faint panel like the light slider card's. The negative margin keeps
       the rows inside it lined up with the rest. */
    margin: var(--hac-space-2) calc(-1 * var(--hac-space-2)) 0;
    padding: 0.429rem var(--hac-space-2);
    border-radius: var(--hac-radius-l);
    background: color-mix(in srgb, var(--hac-text) 5%, transparent);
  }
  .gl-toggle {
    height: var(--hac-size-s);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 var(--hac-space-4);
    border-radius: var(--hac-control-radius);
    background: var(--_track);
    font-size: var(--hac-font-size-s);
    color: var(--hac-text-secondary);
    transition: background 180ms;
  }
  .gl-toggle.on {
    background: var(--_fill);
    color: var(--hac-text);
  }
  .gl-actions {
    display: flex;
    gap: 0.143rem;
  }
  .gl-action,
  .gl-spacer {
    flex: none;
    width: var(--hac-size-m);
    height: var(--hac-size-m);
  }
  .gl-action {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--hac-text-secondary);
    --mdc-icon-size: 1.571rem;
  }
  .gl-action:hover:not(:disabled) {
    background: var(--hac-hover);
  }
`;
