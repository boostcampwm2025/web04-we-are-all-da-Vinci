#!/usr/bin/env python3
"""Render a prompt-generator JSON file to a standalone Canvas HTML preview."""

import argparse
import json
from pathlib import Path

def validate(prompt):
    strokes = prompt.get("strokes") if isinstance(prompt, dict) else None
    if not isinstance(strokes, list) or not strokes:
        raise ValueError("prompt must contain a non-empty strokes array")
    for index, stroke in enumerate(strokes):
        color, points = stroke.get("color"), stroke.get("points")
        if (not isinstance(color, list) or len(color) != 3 or
                not all(isinstance(value, int) and 0 <= value <= 255 for value in color)):
            raise ValueError(f"stroke[{index}].color must be three RGB integers")
        if (not isinstance(points, list) or len(points) != 2 or
                not all(isinstance(axis, list) for axis in points) or
                len(points[0]) != len(points[1]) or not points[0]):
            raise ValueError(f"stroke[{index}].points must be non-empty x/y arrays of equal length")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True); parser.add_argument("--output", required=True)
    parser.add_argument("--width", type=int, default=500); parser.add_argument("--height", type=int, default=500)
    args = parser.parse_args()
    prompt = json.loads(Path(args.input).read_text(encoding="utf-8")); validate(prompt)
    if args.width <= 0 or args.height <= 0: parser.error("width and height must be positive")
    data = json.dumps(prompt, ensure_ascii=False).replace("</", "<\\/")
    html = f'''<!doctype html>
<meta charset="utf-8"><title>Prompt preview</title>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#e5e7eb}}canvas{{background:#f8f9f6;box-shadow:0 2px 10px #0003}}</style>
<canvas id="prompt" width="{args.width}" height="{args.height}"></canvas>
<script>
const prompt = {data}; const canvas = document.querySelector("#prompt"); const ctx = canvas.getContext("2d");
const points=prompt.strokes.flatMap(({{points:[xs,ys]}})=>xs.map((x,i)=>[x,ys[i]]));
const xs=points.map(([x])=>x),ys=points.map((([,y])=>y));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
const shapeWidth=maxX-minX,shapeHeight=maxY-minY,padding=20;
const scale=Math.min((canvas.width-padding*2)/(shapeWidth||1),(canvas.height-padding*2)/(shapeHeight||1));
const offsetX=(canvas.width-shapeWidth*scale)/2-minX*scale,offsetY=(canvas.height-shapeHeight*scale)/2-minY*scale;
ctx.fillStyle="#f8f9f6";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";
for (const {{color, points:[xs,ys]}} of prompt.strokes) {{ ctx.strokeStyle=`rgb(${{color.join(",")}})`;ctx.beginPath();ctx.moveTo(xs[0]*scale+offsetX,ys[0]*scale+offsetY);for(let i=1;i<xs.length;i++)ctx.lineTo(xs[i]*scale+offsetX,ys[i]*scale+offsetY);ctx.stroke(); }}
</script>'''
    Path(args.output).write_text(html, encoding="utf-8")
    print(f"Rendered {len(prompt['strokes'])} strokes: {args.output}")


if __name__ == "__main__": main()
