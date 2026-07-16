---
name: prompt-generator
description: "Generate deliberately clumsy doodle-style drawing images with a fixed five-color RGB palette, vectorize them with vtracer, convert SVG paths into RGB stroke prompts, and render prompt previews in Canvas HTML. Use when a user needs { strokes: [{ colors, points }] } prompt data, SVG conversion, or an inspectable HTML preview."
---

# Prompt Generator

Use this skill when a user gives a drawing topic and wants a stroke prompt with RGB colors.

## Topic to prompt workflow

1. Generate a deliberately clumsy, scribbly raster image for the requested topic on a white background. Use only these five RGB colors: yellow `[250, 204, 21]`, green `[34, 197, 94]`, blue `[59, 130, 246]`, red `[239, 68, 68]`, and black `[0, 0, 0]`. Draw like an old computer paint program made with a mouse: visibly awkward, loose, low-resolution, and slightly confusing, while keeping the subject recognizable. Prefer wobbly contours, sparse details, and uneven proportions. Do not use text, gradients, shadows, or colors outside the palette.

   Draw with colored lines, not colored fills. Leave enclosed interiors white unless another line crosses them. Make the subject readable through differently colored outlines, detail lines, and scribbles; do not use solid color regions, shading, or paint-bucket fills.

   Use this style prompt as a baseline and adapt it to the requested topic:

   > Redraw the attached image in the most clumsy, scribbly, and utterly pathetic way possible. Use a white background, and make it look like it was drawn in MS Paint with a mouse. It should be vaguely similar but also not really, kind of matching but also off in a confusing, awkward way, with that low-quality pixel-by-pixel feel that really emphasizes how ridiculously bad it is. Actually, you know what, whatever, just draw it however you want.

2. Install the VTracer CLI when it is absent, then vectorize in true-color mode with aggressive path simplification. Never use binary/BW mode: it discards the RGB line colors. Use spline fitting, color quantization, speckle filtering, and long-segment simplification so a thick raster line becomes one clean drawing stroke instead of many overlapping boundary paths.

```bash
vtracer \
  --input /tmp/prompt.png \
  --output /tmp/prompt.svg \
  --colormode color \
  --hierarchical cutout \
  --mode spline \
  --filter_speckle 16 \
  --color_precision 6 \
  --corner_threshold 60 \
  --segment_length 12 \
  --splice_threshold 45 \
  --path_precision 2
```

If the installed Python package exposes no `vtracer` command, use its equivalent API with `colormode="color"`, `mode="spline"`, `filter_speckle=16`, `color_precision=6`, `corner_threshold=60`, `length_threshold=12`, `splice_threshold=45`, and `path_precision=2`; do not fall back to `binary` or `bw`.

3. Convert the SVG to the required JSON. The converter preserves SVG `stroke` or `fill` RGB color; VTracer's colored regions are converted to colored drawing paths, not Canvas fills. SVGs without an explicit usable color default to black.

```bash
python3 plugins/prompt-generator/scripts/svg-to-prompt.py \
  --input /tmp/prompt.svg \
  --output /tmp/prompt-strokes.json
```

4. Generate a standalone Canvas preview and inspect it before delivering the prompt:

```bash
python3 plugins/prompt-generator/scripts/prompt-to-html.py \
  --input /tmp/prompt-strokes.json \
  --output /tmp/prompt-preview.html
```

Use `--curve-steps` to increase Bézier sampling only when curves visibly look angular.

The generated JSON must always satisfy:

```json
[
{
  "strokes": [
    {
      "colors": [0, 0, 0],
      "points": [["x..."], ["y..."]]
    }
  ]
}
```

`svg-to-prompt.py` supports `path`, `polyline`, `polygon`, `line`, and `rect`, including nested `transform` attributes and line/quadratic/cubic Bézier commands. vtracer output normally uses paths. It deliberately rejects SVG arc commands because preserving an arc's geometry requires a dedicated conversion; vectorize with vtracer or convert arcs to Bézier paths first.

`prompt-to-html.py` embeds the prompt JSON in a standalone HTML file and renders every path as a 3px round RGB line—never as a filled shape—using the same 20px padded, aspect-ratio-preserving scale and `#f8f9f6` background used by `client-toss` prompt rendering. Open that file in a browser to inspect the completed prompt.

This output format uses `colors` (plural) and differs from the current `server-toss` `{ points: [x[], y[]], color }` schema. Do not write it to `server-toss/data/promptStrokes.json` unless that application schema is migrated separately.
