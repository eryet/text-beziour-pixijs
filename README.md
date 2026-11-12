# text-beziour-pixijs

Path-intersection demos built with [Pixi.js](https://pixijs.com/) v8 — a Pixi take on the classic [Paper.js path-intersections example](https://paperjs.org/examples/path-intersections/).

## Demos

- **`index.html`** — `ERYET` (static) ∩ `CHEN` (follows cursor) using [opentype.js](https://opentype.js.org/) glyph paths and [bezier-js](https://pomax.github.io/bezierjs/) for curve-curve intersection.
- **`eryetchen.html`** — Static SVG of 陳偉洺 ∩ `ERYETCHEN` (follows cursor). Optimised for the heavier SVG path count via:
  - Inline classic Web Worker for collision math
  - Pre-tessellation of each cubic into 8 line segments
  - Spatial-grid (64px cells) over line segments + AABB pre-filter
  - In-flight latch to coalesce cursor-move queries
  - Pooled `Graphics` for the intersection dots

## Brush signature

- **`chen-signature.svg`** / **`chen-signature-light.svg`**: 陳偉洺 as an artist-style brush signature (running-cursive strokes, dry-brush streaks, red 陳 seal) with a draw-on animation. Dark ink is for light backgrounds; light ink is for dark ones.
- Generated from stroke data in `signature/design.js`: `node signature/make-signature.js` (add `--static` for no animation, `--debug` to plot the control points).
- Style variants (classic, one-stroke, vertical, bold, pen, clean, ensō, gold leaf, ink wash, vermilion, neon, stamp mark) are defined in `signature/variants.js`. Build them with `node signature/make-signature.js --variants` and compare them in `signature/variants/index.html`.

## Run

Any static server will do. With VS Code Live Server, open `index.html` or `eryetchen.html` directly.

## Stack

- Pixi.js 8.6.6 (UMD)
- opentype.js 1.3.4 (`index.html` only)
- bezier-js 6.1.4 (`index.html` only — `eryetchen.html` uses pure line-line math)
