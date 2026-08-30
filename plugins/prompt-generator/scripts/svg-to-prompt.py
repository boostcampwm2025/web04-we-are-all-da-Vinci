#!/usr/bin/env python3
"""Convert SVG paths into { strokes: [{ colors, points }] } drawing prompts."""

import argparse
import json
import math
import re
import xml.etree.ElementTree as ET

NUMBER = r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?"
TOKEN = re.compile(rf"([AaCcHhLlMmQqSsTtVvZz])|({NUMBER})")
PALETTE = ([250, 204, 21], [34, 197, 94], [59, 130, 246], [239, 68, 68], [0, 0, 0])
CANVAS_SIZE = 255


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
        "color": color,
        "points": [[round(x) for x, _ in points], [round(y) for _, y in points]],
    }


def svg_canvas(root):
    values = [float(value) for value in re.findall(NUMBER, root.get("viewBox", ""))]
    if len(values) == 4 and values[2] > 0 and values[3] > 0:
        return values
    width = re.findall(NUMBER, root.get("width", ""))
    height = re.findall(NUMBER, root.get("height", ""))
    if width and height and float(width[0]) > 0 and float(height[0]) > 0:
        return [0, 0, float(width[0]), float(height[0])]
    raise ValueError("SVG requires a positive viewBox or width and height")


def canvas_strokes(strokes, bounds):
    origin_x, origin_y, width, height = bounds
    return [
        (color, [((x - origin_x) * CANVAS_SIZE / width, (y - origin_y) * CANVAS_SIZE / height) for x, y in stroke])
        for color, stroke in strokes
    ]


def endpoint_direction(points, side, length):
    endpoint = points[0] if side == 0 else points[-1]
    indices = range(1, len(points)) if side == 0 else range(len(points) - 2, -1, -1)
    traveled = 0
    previous = endpoint
    for index in indices:
        current = points[index]
        traveled += math.dist(previous, current)
        if traveled >= length:
            return (current[0] - endpoint[0], current[1] - endpoint[1])
        previous = current
    return (previous[0] - endpoint[0], previous[1] - endpoint[1])


def vector_angle(first, second):
    first_length = math.hypot(*first)
    second_length = math.hypot(*second)
    if not first_length or not second_length:
        return 180
    cosine = sum(a * b for a, b in zip(first, second)) / (first_length * second_length)
    return math.degrees(math.acos(max(-1, min(1, cosine))))


def prune_short_spurs(strokes, max_length, junction_gap=0.5):
    if max_length <= 0:
        return strokes
    endpoints = [
        (stroke_index, side, points[0] if side == 0 else points[-1])
        for stroke_index, (_, points) in enumerate(strokes)
        for side in (0, 1)
    ]
    junctions = set()
    for stroke_index, side, endpoint in endpoints:
        touching = sum(
            other_index != stroke_index and math.dist(endpoint, other_endpoint) <= junction_gap
            for other_index, _, other_endpoint in endpoints
        )
        if touching >= 2:
            junctions.add((stroke_index, side))
    return [
        stroke for stroke_index, stroke in enumerate(strokes)
        if not (
            sum(math.dist(first, second) for first, second in zip(stroke[1], stroke[1][1:])) <= max_length
            and sum((stroke_index, side) in junctions for side in (0, 1)) == 1
        )
    ]


def stitch_strokes(strokes, max_gap, max_angle, tangent_length):
    if max_gap <= 0:
        return strokes

    endpoints = []
    for stroke_index, (color, points) in enumerate(strokes):
        for side in (0, 1):
            endpoints.append((stroke_index, side, color, points[0] if side == 0 else points[-1]))

    candidates = []
    alignment_limit = max(60, max_angle * 1.5)
    for endpoint_index, (first_index, first_side, color, first_point) in enumerate(endpoints):
        for second_index, second_side, second_color, second_point in endpoints[endpoint_index + 1:]:
            if first_index == second_index or color != second_color:
                continue
            gap = math.dist(first_point, second_point)
            if gap > max_gap:
                continue
            first_direction = endpoint_direction(strokes[first_index][1], first_side, tangent_length)
            second_direction = endpoint_direction(strokes[second_index][1], second_side, tangent_length)
            continuity = vector_angle(first_direction, (-second_direction[0], -second_direction[1]))
            if continuity > max_angle:
                continue
            if gap > 0.5:
                connector = (second_point[0] - first_point[0], second_point[1] - first_point[1])
                if (vector_angle((-first_direction[0], -first_direction[1]), connector) > alignment_limit or
                        vector_angle(connector, second_direction) > alignment_limit):
                    continue
            candidates.append((gap + continuity * 0.05, first_index, first_side, second_index, second_side))

    parent = list(range(len(strokes)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    connections = {}
    for _, first_index, first_side, second_index, second_side in sorted(candidates):
        first_endpoint = (first_index, first_side)
        second_endpoint = (second_index, second_side)
        first_root, second_root = find(first_index), find(second_index)
        if first_endpoint in connections or second_endpoint in connections or first_root == second_root:
            continue
        connections[first_endpoint] = second_endpoint
        connections[second_endpoint] = first_endpoint
        parent[second_root] = first_root

    merged = []
    visited = set()
    for start_index, (color, points) in enumerate(strokes):
        if start_index in visited:
            continue
        component = [index for index in range(len(strokes)) if find(index) == find(start_index)]
        start_index = next((index for index in component if (index, 0) not in connections or (index, 1) not in connections), start_index)
        reversed_path = (start_index, 0) in connections
        current_index = start_index
        current_points = list(reversed(strokes[current_index][1])) if reversed_path else list(strokes[current_index][1])
        combined = current_points
        while True:
            visited.add(current_index)
            exit_side = 0 if reversed_path else 1
            linked = connections.get((current_index, exit_side))
            if not linked:
                break
            next_index, next_side = linked
            if next_index in visited:
                break
            next_points = strokes[next_index][1]
            reversed_path = next_side == 1
            oriented = list(reversed(next_points)) if reversed_path else list(next_points)
            if combined[-1] == oriented[0]:
                combined.extend(oriented[1:])
            else:
                combined.extend(oriented)
            current_index = next_index
        merged.append((color, combined))
    return merged


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True); parser.add_argument("--output", required=True)
    parser.add_argument("--curve-steps", type=int, default=8)
    parser.add_argument("--stitch-gap", type=float, default=4)
    parser.add_argument("--stitch-angle", type=float, default=35)
    parser.add_argument("--tangent-length", type=float, default=4)
    parser.add_argument("--max-spur-length", type=float, default=3)
    args = parser.parse_args()
    if (args.curve_steps < 1 or args.stitch_gap < 0 or not 0 <= args.stitch_angle <= 180 or
            args.tangent_length <= 0 or args.max_spur_length < 0):
        parser.error("curve-steps and tangent-length must be positive; gaps and lengths cannot be negative; stitch-angle must be 0..180")
    root = ET.parse(args.input).getroot()
    raw_strokes = list(walk(root, (1, 0, 0, 1, 0, 0), [0, 0, 0], args.curve_steps))
    canvas = canvas_strokes(raw_strokes, svg_canvas(root))
    pruned = prune_short_spurs(canvas, args.max_spur_length)
    stitched = stitch_strokes(pruned, args.stitch_gap, args.stitch_angle, args.tangent_length)
    strokes = [serialize(color, points) for color, points in stitched]
    if not strokes: parser.error("No drawable SVG path, polyline, polygon, line, or rect was found")
    with open(args.output, "w", encoding="utf-8") as file: json.dump({"date": "yyyy-mm-dd" ,"strokes": strokes}, file, ensure_ascii=False, indent=2); file.write("\n")
    print(f"Converted {len(raw_strokes)} SVG paths into {len(strokes)} strokes: {args.output}")


if __name__ == "__main__": main()
