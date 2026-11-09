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

- **One light:** icon (tap to toggle) and name, with the buttons on the same
  line and a full-width brightness slider below that shows the percentage.
- **Several lights:** one shared slider sets all lights at once (it shows the
  average brightness of the lights that are on). Tap the name or chevron to
  show a row per light, each with its own slider and buttons.
- **Color button** opens a popup with two tabs: **White** (five white tones and
  a color temperature slider) and **Color** (ten preset colors that follow the
  chosen saturation, a color wheel for any color and a saturation slider). It
  opens on the tab matching the light's current mode. On the shared row it changes every light that supports it.
- **Scenes button** opens a popup with the scenes that include the light(s).
  The most recently activated scene is highlighted. Choose scenes yourself with
  `scenes` if you prefer.
- Buttons only appear when there is something to show.
- Visual editor in the dashboard UI. English and Danish.

### Single and room

- **`mode: single`** (default): all the lights you choose share one slider
  (or it's just one light). Expand to see each light.
- **`mode: room`**: a room with several sliders. Each item under `items` is one
  slider for one light, or for several lights that can be expanded. With a
  `name`, the room gets a heading with a button that turns everything on/off.

```yaml
type: custom:ha-controls-light-slider-card
mode: room
name: Living room
items:
  - name: Ceiling
    icon: mdi:ceiling-light
    entities:
      - light.ceiling_1
      - light.ceiling_2
  - entity: light.floor_lamp
    name: Floor lamp
  - name: Spots
    entities: [light.spot_1, light.spot_2, light.spot_3]
    scenes: [scene.movie_night]
```

Each item supports `entity`/`entities`, `main_entity`, `name`, `icon`,
`scenes` and `expanded`. The options below apply to every item in the room.

### On/off entities

Besides lights you can add `switch` and `input_boolean` entities (e.g. a lamp
on a smart plug). They, and lights that can only turn on/off, get a wide on/off
button instead of a slider. To show a dimmable light as on/off only, list it
under `toggle_only` (on the card or on a room item):

```yaml
entities:
  - light.ceiling
  - switch.floor_lamp_plug
toggle_only:
  - light.ceiling
```

### Main light

By default the top slider controls all its lights together (showing their
average). Set `main_entity` to let it control one light instead, e.g. a
Home Assistant light group, while `entities` are listed when you expand it:

```yaml
type: custom:ha-controls-light-slider-card
main_entity: light.ceiling_group
entities:
  - light.ceiling_1
  - light.ceiling_2
```

Works the same for each item in a room.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | string | `single` | `single` or `room` |
| `entities` | list | **required** (single) | Light entity IDs, or objects with `entity`, `name`, `icon`, `scenes` |
| `entity` | string | | Shorthand for a single light (single) |
| `items` | list | **required** (room) | The sliders in the room, see above |
| `toggle_only` | list | | Lights to show as on/off only, no slider or colors |
| `main_entity` | string | | Light the top slider controls; `entities` become its expandable children (single) |
| `name` | string | friendly name / "Lights" | Slider name (single) or room heading (room) |
| `icon` | string | lightbulb | Slider icon (single) |
| `show_color_temp` | boolean | `true` | Show the color temperature slider (lights that support it) |
| `show_color` | boolean | `true` | Show hue and saturation sliders (lights that support color) |
| `show_scenes` | boolean | `true` | Show the scenes button |
| `scenes` | list | automatic | Scenes for the main slider (single). Each light entry can also have its own `scenes` |
| `expanded` | boolean | `false` | Show the individual lights of a slider by default |

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
    scenes:
      - scene.reading
  - light.spots
scenes:
  - scene.movie_night
  - scene.relax
```

### Theming

The card uses Home Assistant theme variables. You can also override:

| Variable | Description |
| --- | --- |
| `--state-light-active-color` | Fallback color for lights that don't report a color |
| `--hac-slider-height` | Height of the brightness slider (default `52px`) |
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
