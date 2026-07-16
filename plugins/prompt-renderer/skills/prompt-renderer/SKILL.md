---
name: prompt-renderer
description: Generate topic-based drawing prompts in the server-toss stroke schema, validate them, and render canvas-matching SVG previews.
---

# Prompt Renderer

Use this skill when a user gives a drawing topic and wants a playable prompt. The AI must generate the stroke data directly; do not generate a raster image and attempt to trace it.

## Topic to prompt workflow

1. Choose the requested `date`; never silently replace an existing date.
2. Generate one prompt object with `date` and `strokes` in a temporary JSON file. Use a 500×500 coordinate space, generally 3–15 purposeful strokes, and 2–100 points per stroke. Draw the recognizable silhouette first, then meaningful details. Avoid text, disconnected noise, and coordinates outside 0–500 unless the user explicitly asks for them.
3. Use a small RGB palette. Keep stroke order meaningful because replay animation follows the array order.
4. Validate the candidate before showing it:

```bash
node plugins/prompt-renderer/scripts/validate-prompt.mjs \
  --input /tmp/prompt-candidate.json \
  --date 2026-07-16 \
  --output /tmp/prompt-validated.json
```

5. Render the validated candidate and show the SVG preview:

```bash
node plugins/prompt-renderer/scripts/render-prompt.mjs \
  --input /tmp/prompt-validated.json \
  --date 2026-07-16 \
  --output /tmp/prompt-2026-07-16.svg
```

6. Do not modify `server-toss/data/promptStrokes.json` until the user approves the preview. After approval, append or replace explicitly with `--force true`:

```bash
node plugins/prompt-renderer/scripts/validate-prompt.mjs \
  --input /tmp/prompt-validated.json \
  --append-to server-toss/data/promptStrokes.json \
  --force true
```

The generated object must always satisfy:

```json
{
  "date": "YYYY-MM-DD",
  "strokes": [{ "points": [["x..."], ["y..."]], "color": [0, 0, 0] }]
}
```

Use the bundled `scripts/render-prompt.mjs` script when the user wants to inspect a prompt drawing or verify that a date exists in `server-toss/data/promptStrokes.json`.

Run it from the repository root:

```bash
node plugins/prompt-renderer/scripts/render-prompt.mjs \
  --input server-toss/data/promptStrokes.json \
  --date 2026-07-14 \
  --output /tmp/prompt-2026-07-14.svg
```

The renderer mirrors `client-toss` prompt rendering: 500×500 output by default, 20px padding, 3px round strokes, RGB colors, single-point dots, and the prompt canvas background `#f8f9f6`. Use `--width`, `--height`, `--padding`, and `--background` only when a different preview is explicitly requested.

If the requested date is missing in an existing prompt file, report the available date range and do not silently substitute another prompt. Generated candidates must be previewed before they are appended to production prompt data.
