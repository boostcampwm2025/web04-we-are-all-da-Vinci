---
name: prompt-generator
description: "Generate deliberately clumsy doodle-style drawing images with a fixed five-color RGB palette, extract simplified centerline SVG paths, convert them into RGB stroke prompts, and render Canvas HTML previews. Use when a user needs { strokes: [{ color, points }] } prompt data, PNG/SVG conversion, or an inspectable HTML preview."
---

# Prompt Generator

Use this skill when a user gives a drawing topic or asks for creative drawing ideas and wants a stroke prompt with RGB colors.

## Choose a coherent scene

For open-ended or random requests, build a scene as **protagonist + visible action + supporting situation**, rather than combining unrelated topic words. Preserve an explicitly requested subject, scene, or combination; do not force a whimsical reinterpretation when the user asks for a simple object drawing.

1. Sample a varied pool of protagonist ideas from animals, foods, and everyday objects. Randomness should broaden the candidates, not decide which combinations must be drawn.
2. Choose one protagonist and give it a familiar, visually recognizable action. Add a prop or setting only when it helps show that action; one supporting prop is usually enough. Anthropomorphism is useful: a potato can pilot a spaceship, and a banana can sleep under a blanket.
3. Keep **one whimsical premise** and make the rest of the scene follow naturally from it. Show the protagonist interacting with the prop through its pose, gaze, or contact. Avoid unrelated objects placed side by side, motifs added just to include a topic, and extra surprises that compete with the main action.
4. Draft candidate scenes internally before generating images (about 10 for an open-ended request, adjusted to the requested output count). Select scenes that pass the checks below; vary protagonists and actions across a batch instead of repeating the same scene with different nouns. Do not generate every candidate unless requested.

Select a scene only when:

- It can be described in one short sentence with a clear action, such as “a potato piloting a spaceship.”
- The action and relationship are understandable from the drawing without a caption or backstory.
- Each supporting element helps explain the action or situation; remove decorative extras.
- The scene remains recognizable with sparse outlines and details on the 255×255 drawing canvas.

Examples: a potato at a spaceship's controls; a banana tucked under a blanket; a cactus brushing its own spines; a snail riding a skateboard. These illustrate the relationship, not a fixed list to reuse.

If the user supplies several topics, look for a natural action connecting them. When the combination feels forced, try a different action or, if selection is allowed, choose another topic. Treat “2–3 topics” as a selection constraint only when explicitly requested, not as the default recipe for creativity.

## Topic to prompt workflow

When processing more than one generated image, run the complete batch pipeline once instead of invoking each conversion script per image. Pass every image after one `--input`; each input must have a unique filename stem. The command writes `<stem>.svg`, `<stem>.json`, and `<stem>.html` for every image into `--output-dir`:

```bash
uv run --with pillow --with scikit-image \
  python plugins/prompt-generator/scripts/batch-generate-prompts.py \
  --input /tmp/prompts/*.png \
  --output-dir /tmp/prompts/converted
```

Use the single-file commands below only for one image or when rerunning an individual stage with custom tuning options.

1. Generate a deliberately clumsy, scribbly raster image for the chosen scene or explicitly requested subject on a white background. State the protagonist, visible action, and necessary prop or situation in the image prompt, not just a list of topic words. Use only these five RGB colors: yellow `[250, 204, 21]`, green `[34, 197, 94]`, blue `[59, 130, 246]`, red `[239, 68, 68]`, and black `[0, 0, 0]`. This is an allowed palette, not a required set: use only the colors the subject needs, and do not force all five colors into every image. A single-color drawing is valid. Draw like an old computer paint program made with a mouse: visibly awkward, loose, low-resolution, and slightly confusing, while keeping the subject recognizable. Prefer wobbly contours, sparse details, and uneven proportions. Do not use text, gradients, shadows, or colors outside the palette.

   **Linework is mandatory:** Draw with colored lines, not colored fills. Leave enclosed interiors white unless another line crosses them. Make the subject readable through differently colored outlines, detail lines, and scribbles; do not use solid color regions, shading, or paint-bucket fills.

   Use this style prompt as a baseline and adapt it to the requested topic:

   > Redraw the attached image in the most clumsy, scribbly, and utterly pathetic way possible. Use a white background, and make it look like it was drawn in MS Paint with a mouse. It should be vaguely similar but also not really, kind of matching but also off in a confusing, awkward way, with that low-quality pixel-by-pixel feel that really emphasizes how ridiculously bad it is. Actually, you know what, whatever, just draw it however you want.

2. Extract centerlines from the PNG before generating SVG. VTracer traces colored regions as filled outlines, so it cannot produce one path per raster line. Run the extractor with `uv`'s ephemeral dependencies; do not create or activate a virtual environment. It generates an SVG containing `fill="none"` RGB paths and collapses each thick raster line to its one-pixel skeleton before it becomes a prompt stroke.

```bash
uv run --with pillow --with scikit-image \
  python plugins/prompt-generator/scripts/png-to-centerline-svg.py \
  --input /tmp/prompt.png \
  --output /tmp/prompt.svg
```

Use VTracer only when a filled-outline SVG is explicitly needed for another purpose; do not use it as the source for drawing prompt strokes.

3. Convert the SVG to the required JSON by mapping its `viewBox` directly to a 255×255 Canvas coordinate space. Do not use the stroke bounds or preview layout to center or resize the JSON: preserve every path's SVG-canvas position and scale. Use SVG width/height only when `viewBox` is absent. Every output point is a rounded integer in the `0..255` Canvas range. VTracer's colored regions are converted to colored drawing paths, not Canvas fills. SVGs without an explicit usable color default to black.

```bash
python3 plugins/prompt-generator/scripts/svg-to-prompt.py \
  --input /tmp/prompt.svg \
  --output /tmp/prompt-strokes.json
```

The converter removes centerline spurs up to `--max-spur-length 3`, then stitches nearby same-color path endpoints into longer strokes when their directions continue naturally. Defaults are `--stitch-gap 4`, `--stitch-angle 35`, and `--tangent-length 4` in the 255×255 Canvas coordinate space. Set `--max-spur-length 0` or `--stitch-gap 0` to disable either behavior, or lower the thresholds when small details disappear or separate nearby lines merge incorrectly.

4. Generate a standalone Canvas preview and inspect it before delivering the prompt:

```bash
python3 plugins/prompt-generator/scripts/prompt-to-html.py \
  --input /tmp/prompt-strokes.json \
  --output /tmp/prompt-preview.html
```

Use `--curve-steps` to increase Bézier sampling only when curves visibly look angular.

The generated JSON must always satisfy:

```json
{
  "date": "yyyy-mm-dd",
  "strokes": [
    {
      "color": [0, 0, 0],
      "points": [["x..."], ["y..."]]
    }
  ]
}
```

`svg-to-prompt.py` supports `path`, `polyline`, `polygon`, `line`, and `rect`, including nested `transform` attributes and line/quadratic/cubic Bézier commands. vtracer output normally uses paths. It deliberately rejects SVG arc commands because preserving an arc's geometry requires a dedicated conversion; vectorize with vtracer or convert arcs to Bézier paths first.

`prompt-to-html.py` embeds the prompt JSON in a standalone HTML file and renders every path as a 3px round RGB line—never as a filled shape—using the same 20px-padded bounding-box scale and offset as `client-toss` prompt rendering. Use `--width` and `--height` only to test the target Canvas dimensions; they do not alter the 255×255 JSON coordinates.

The output uses the current `server-toss` stroke schema: `{ points: [x[], y[]], color }`. Wrap the generated `{ date, strokes }` object in the `server-toss/data/promptStrokes.json` array before seeding it.
