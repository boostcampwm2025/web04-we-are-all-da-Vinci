---
name: prompt-renderer
description: Render server-toss promptStrokes JSON as a canvas-matching SVG and validate missing prompt dates.
---

# Prompt Renderer

Use the bundled `scripts/render-prompt.mjs` script when the user wants to inspect a prompt drawing or verify that a date exists in `server-toss/data/promptStrokes.json`.

Run it from the repository root:

```bash
node plugins/prompt-renderer/scripts/render-prompt.mjs \
  --input server-toss/data/promptStrokes.json \
  --date 2026-07-14 \
  --output /tmp/prompt-2026-07-14.svg
```

The renderer mirrors `client-toss` prompt rendering: 500×500 output by default, 20px padding, 3px round strokes, RGB colors, single-point dots, and the prompt canvas background `#f8f9f6`. Use `--width`, `--height`, `--padding`, and `--background` only when a different preview is explicitly requested.

If the requested date is missing, report the available date range and do not silently substitute another prompt.
