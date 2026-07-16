#!/usr/bin/env python3
"""Convert SVG paths into { strokes: [{ colors, points }] } drawing prompts."""

import argparse
import json
import re
import xml.etree.ElementTree as ET

NUMBER = r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?"
TOKEN = re.compile(rf"([AaCcHhLlMmQqSsTtVvZz])|({NUMBER})")
PALETTE = ([250, 204, 21], [34, 197, 94], [59, 130, 246], [239, 68, 68], [0, 0, 0])


def matrix_mul(left, right):
    a, b, c, d, e, f = left
    g, h, i, j, k, l = right
    return (a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f)


def transform(value):
    result = (1, 0, 0, 1, 0, 0)
    for name, values in re.findall(r"([A-Za-z]+)\s*\(([^)]*)\)", value or ""):
        numbers = [float(number) for number in re.findall(NUMBER, values)]
        if name == "matrix" and len(numbers) == 6:
            current = tuple(numbers)
        elif name == "translate":
            current = (1, 0, 0, 1, numbers[0], numbers[1] if len(numbers) > 1 else 0)
        elif name == "scale":
            current = (numbers[0], 0, 0, numbers[1] if len(numbers) > 1 else numbers[0], 0, 0)
        elif name == "rotate" and numbers:
            angle = math.radians(numbers[0]); cos, sin = math.cos(angle), math.sin(angle)
            current = (cos, sin, -sin, cos, 0, 0)
            if len(numbers) == 3:
                current = matrix_mul(matrix_mul((1, 0, 0, 1, numbers[1], numbers[2]), current), (1, 0, 0, 1, -numbers[1], -numbers[2]))
        else:
            continue
        result = matrix_mul(result, current)
    return result


def point(matrix, x, y):
    a, b, c, d, e, f = matrix
    return (a * x + c * y + e, b * x + d * y + f)


def sample_quadratic(start, control, end, steps):
    return [((1-t)**2*start[0] + 2*(1-t)*t*control[0] + t*t*end[0], (1-t)**2*start[1] + 2*(1-t)*t*control[1] + t*t*end[1]) for t in (index / steps for index in range(1, steps + 1))]


def sample_cubic(start, first, second, end, steps):
    return [((1-t)**3*start[0] + 3*(1-t)**2*t*first[0] + 3*(1-t)*t*t*second[0] + t**3*end[0], (1-t)**3*start[1] + 3*(1-t)**2*t*first[1] + 3*(1-t)*t*t*second[1] + t**3*end[1]) for t in (index / steps for index in range(1, steps + 1))]


def path_strokes(data, curve_steps):
    tokens = [(command or float(number)) for command, number in TOKEN.findall(data)]
    index = 0; command = None; current = (0, 0); start = (0, 0); last_control = None; strokes = []; stroke = []
    counts = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7}
    while index < len(tokens):
        if isinstance(tokens[index], str): command = tokens[index]; index += 1
        if not command: raise ValueError("SVG path command is missing")
        upper = command.upper()
        if upper == "Z":
            if stroke and current != start: stroke.append(start)
            current = start; last_control = None; command = None; continue
        needed = counts.get(upper)
        if needed is None or index + needed > len(tokens): raise ValueError(f"Unsupported or incomplete SVG command: {command}")
        values = tokens[index:index + needed]
        if any(isinstance(value, str) for value in values): raise ValueError(f"Incomplete SVG command: {command}")
        index += needed; relative = command.islower()
        def xy(offset): return (values[offset] + (current[0] if relative else 0), values[offset + 1] + (current[1] if relative else 0))
        if upper == "M":
            if stroke: strokes.append(stroke)
            current = xy(0); start = current; stroke = [current]; command = "l" if relative else "L"
        elif upper == "L": current = xy(0); stroke.append(current); last_control = None
        elif upper == "H": current = (values[0] + (current[0] if relative else 0), current[1]); stroke.append(current); last_control = None
        elif upper == "V": current = (current[0], values[0] + (current[1] if relative else 0)); stroke.append(current); last_control = None
        elif upper == "C":
            first, second, end = xy(0), xy(2), xy(4); stroke.extend(sample_cubic(current, first, second, end, curve_steps)); current = end; last_control = second
        elif upper == "S":
            first = (2 * current[0] - last_control[0], 2 * current[1] - last_control[1]) if last_control else current
            second, end = xy(0), xy(2); stroke.extend(sample_cubic(current, first, second, end, curve_steps)); current = end; last_control = second
        elif upper == "Q":
            control, end = xy(0), xy(2); stroke.extend(sample_quadratic(current, control, end, curve_steps)); current = end; last_control = control
        elif upper == "T":
            control = (2 * current[0] - last_control[0], 2 * current[1] - last_control[1]) if last_control else current
            end = xy(0); stroke.extend(sample_quadratic(current, control, end, curve_steps)); current = end; last_control = control
        else:
            raise ValueError("Arc commands are not supported; run vtracer with --path-precision or convert arcs to curves first.")
    if stroke: strokes.append(stroke)
    return strokes


def primitive_strokes(element):
    tag = element.tag.rsplit("}", 1)[-1]; get = lambda name, default=0: float(element.get(name, default))
    if tag == "polyline" or tag == "polygon":
        values = [float(value) for value in re.findall(NUMBER, element.get("points", ""))]
        points = list(zip(values[::2], values[1::2])); return [points + ([points[0]] if tag == "polygon" and points else [])]
    if tag == "line": return [[(get("x1"), get("y1")), (get("x2"), get("y2"))]]
    if tag == "rect":
        x, y, width, height = get("x"), get("y"), get("width"), get("height")
        return [[(x, y), (x + width, y), (x + width, y + height), (x, y + height), (x, y)]]
    return []


def parse_color(value, fallback):
    if not value or value == "none":
        return fallback
    value = value.strip()
    if value.startswith("#"):
        hex_value = value[1:]
        if len(hex_value) == 3:
            hex_value = "".join(channel * 2 for channel in hex_value)
        if len(hex_value) == 6:
            return [int(hex_value[index:index + 2], 16) for index in range(0, 6, 2)]
    channels = re.findall(NUMBER, value)
    if value.startswith("rgb") and len(channels) >= 3:
        return [round(float(channel)) for channel in channels[:3]]
    return fallback


def normalize_color(color):
    if min(color) >= 245:
        return None
    return min(PALETTE, key=lambda candidate: sum((channel - reference) ** 2 for channel, reference in zip(color, candidate)))


def element_color(element, fallback):
    style = dict(item.split(":", 1) for item in element.get("style", "").split(";") if ":" in item)
    return normalize_color(parse_color(style.get("stroke") or element.get("stroke") or style.get("fill") or element.get("fill"), fallback))


def walk(element, inherited, inherited_color, curve_steps):
    matrix = matrix_mul(inherited, transform(element.get("transform")))
    color = element_color(element, inherited_color)
    tag = element.tag.rsplit("}", 1)[-1]
    paths = path_strokes(element.get("d", ""), curve_steps) if tag == "path" else primitive_strokes(element)
    for path in paths:
        if color and len(path) > 1: yield color, [point(matrix, *item) for item in path]
    for child in element: yield from walk(child, matrix, color, curve_steps)


def serialize(color, points):
    return {
        "colors": color,
        "points": [[round(x, 3) for x, _ in points], [round(y, 3) for _, y in points]],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True); parser.add_argument("--output", required=True)
    parser.add_argument("--curve-steps", type=int, default=8)
    args = parser.parse_args()
    if args.curve_steps < 1: parser.error("curve-steps must be positive")
    root = ET.parse(args.input).getroot()
    strokes = [serialize(color, points) for color, points in walk(root, (1, 0, 0, 1, 0, 0), [0, 0, 0], args.curve_steps)]
    if not strokes: parser.error("No drawable SVG path, polyline, polygon, line, or rect was found")
    with open(args.output, "w", encoding="utf-8") as file: json.dump({"strokes": strokes}, file, ensure_ascii=False, indent=2); file.write("\n")
    print(f"Converted {len(strokes)} strokes: {args.output}")


if __name__ == "__main__": main()
