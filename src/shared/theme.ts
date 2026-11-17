import { css } from 'lit';

/**
 * The cards' design tokens, taken from the Home Assistant theme. Every
 * value falls back to the cards' own default when the theme doesn't set it.
 *
 * Set on each card's host, so components inside (sliders, popups) inherit them.
 */
export const themeTokens = css`
  :host {
    /* ----- type ----- */
    --hac-font-family: var(
      --ha-font-family-body,
      var(--mdc-typography-font-family, var(--paper-font-body1_-_font-family, inherit))
    );
    --hac-font-size-s: var(--ha-font-size-s, 0.857rem);
    --hac-font-size-m: var(--ha-font-size-m, 1rem);
    --hac-font-size-l: var(--ha-font-size-l, 1.143rem);
    --hac-font-size-xl: var(--ha-font-size-xl, 1.286rem);
    --hac-weight-normal: var(--ha-font-weight-normal, 400);
    --hac-weight-medium: var(--ha-font-weight-medium, 500);
    --hac-line-height: var(--ha-line-height-normal, 1.4);

    /* ----- spacing (Home Assistant: 4 px steps) ----- */
    --hac-space-1: var(--ha-space-1, 0.286rem);
    --hac-space-2: var(--ha-space-2, 0.571rem);
    --hac-space-3: var(--ha-space-3, 0.857rem);
    --hac-space-4: var(--ha-space-4, 1.143rem);
    --hac-space-6: var(--ha-space-6, 1.714rem);

    /* ----- sizes of controls ----- */
    --hac-size-xs: var(--ha-space-6, 1.714rem);
    --hac-size-s: var(--ha-space-8, 2.286rem);
    --hac-size-m: var(--ha-space-10, 2.857rem);
    --hac-size-l: var(--ha-space-11, 3.143rem);

    /* ----- shape ----- */
    --hac-radius-s: var(--ha-border-radius-sm, 0.286rem);
    --hac-radius-m: var(--ha-border-radius-md, 0.571rem);
    --hac-radius-l: var(--ha-border-radius-lg, 0.857rem);
    --hac-radius-pill: var(--ha-border-radius-pill, 999px);
    --hac-card-radius: var(--ha-card-border-radius, 0.857rem);
    --hac-control-radius: var(--control-slider-border-radius, var(--hac-radius-l));

    /* ----- colour ----- */
    --hac-text: var(--primary-text-color);
    --hac-text-secondary: var(--secondary-text-color);
    --hac-primary: var(--primary-color);
    --hac-divider: var(--divider-color, rgba(127, 127, 127, 0.25));
    --hac-surface: var(--card-background-color, var(--ha-card-background));
    /* Active lights / entities, as the theme colours them. */
    --hac-active: var(--state-light-active-color, var(--state-active-color, var(--primary-color)));
    --hac-icon: var(--state-icon-color, var(--secondary-text-color));
    /* Empty part of sliders and bars, like Home Assistant's own sliders. */
    --hac-track: color-mix(
      in srgb,
      var(--control-slider-background, var(--disabled-color, var(--secondary-text-color)))
        calc(var(--control-slider-background-opacity, 0.2) * 100%),
      transparent
    );
    --hac-hover: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    --hac-on-active: var(--text-primary-color, #fff);

    /* Switches, as Home Assistant's own. */
    --hac-switch-on: var(--switch-checked-track-color, var(--switch-checked-color, var(--primary-color)));
    --hac-switch-off: var(--switch-unchecked-track-color, var(--disabled-color, var(--secondary-text-color)));
    --hac-switch-knob-on: var(--switch-checked-button-color, var(--text-primary-color, #fff));
    --hac-switch-knob-off: var(--switch-unchecked-button-color, var(--card-background-color, #fff));

    /* Popups, as Home Assistant's dialogs. */
    --hac-dialog-bg: var(--ha-dialog-surface-background, var(--mdc-theme-surface, var(--hac-surface)));
    --hac-dialog-radius: var(--ha-dialog-border-radius, var(--hac-card-radius));
    --hac-scrim: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, 0.32));

    font-family: var(--hac-font-family);
  }
`;
