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

## Run

Any static server will do. With VS Code Live Server, open `index.html` or `eryetchen.html` directly.

## Stack

- Pixi.js 8.6.6 (UMD)
- opentype.js 1.3.4 (`index.html` only)
- bezier-js 6.1.4 (`index.html` only — `eryetchen.html` uses pure line-line math)
