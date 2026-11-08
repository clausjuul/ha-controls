# HA Controls

A collection of custom Lovelace cards for Home Assistant, shipped as a single
JavaScript bundle.

| Card | Type |
| --- | --- |
| [Light Slider Card](#light-slider-card) | `custom:ha-controls-light-slider-card` |

## Installation

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/Clausjuul/ha-controls`
   with category **Dashboard**.
2. Install **HA Controls** and reload the browser.

### Manual

1. Download `ha-controls.js` from the latest
   [release](https://github.com/Clausjuul/ha-controls/releases) into `config/www/`.
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/ha-controls.js` as a
   *JavaScript module*.

## Light Slider Card

A compact, horizontal brightness slider for one or more lights.

- **One light:** icon (tap to toggle), name, brightness and a slider. Tap the
  name or chevron to reveal color temperature and color controls.
- **Several lights:** one shared slider sets all lights at once (it shows the
  average brightness of the lights that are on). Expand to get a row per light,
  each with its own slider and its own color controls.
- Visual editor in the dashboard UI. English and Danish.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entities` | list | **required** | Light entity IDs, or objects with `entity`, `name`, `icon` |
| `entity` | string | | Shorthand for a single light |
| `name` | string | friendly name / "Lights" | Card title |
| `icon` | string | lightbulb | Card icon |
| `show_color_temp` | boolean | `true` | Show the color temperature slider (lights that support it) |
| `show_color` | boolean | `true` | Show hue and saturation sliders (lights that support color) |
| `expanded` | boolean | `false` | Start expanded |

### Examples

```yaml
type: custom:ha-controls-light-slider-card
entity: light.living_room
```

```yaml
type: custom:ha-controls-light-slider-card
name: Living room
icon: mdi:sofa
entities:
  - light.ceiling
  - entity: light.floor_lamp
    name: Floor lamp
  - light.spots
show_color: false
```

### Theming

The card uses Home Assistant theme variables. You can also override:

| Variable | Description |
| --- | --- |
| `--state-light-active-color` | Fallback color for lights that don't report a color |
| `--hac-slider-height` | Height of the brightness slider (default `36px`) |
| `--hac-slider-radius` | Corner radius of the sliders |
| `--hac-slider-track-background` | Track background |

## Development

```bash
npm install
npm run watch      # rebuilds on change and serves http://localhost:5000/demo/
npm run typecheck
npm run build      # dist/ha-controls.js
```

The demo page renders the cards against a mocked `hass` object, so you can work
on them without a Home Assistant instance.

### Adding a new card

1. Create `src/cards/<card-name>/` with the card, its editor and styles.
2. Reuse shared pieces from `src/shared/` and `src/components/` (e.g. `hac-slider`).
3. Register the elements and add an entry to `customCards` in `src/index.ts`.

### Releasing

Bump `version` in `package.json` and merge to `main`. The **Auto release**
workflow then builds `ha-controls.js` and publishes a release `v<version>` with
the file attached, which is what HACS installs.

Releases published by hand in the GitHub UI also work: the **Release**
workflow builds the bundle and attaches it.
