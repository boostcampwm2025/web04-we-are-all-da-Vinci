#!/usr/bin/env python3
"""Convert palette-colored PNG line art into centerline SVG paths."""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.measure import label
from skimage.morphology import skeletonize

PALETTE = ([250, 204, 21], [34, 197, 94], [59, 130, 246], [239, 68, 68], [0, 0, 0])
NEIGHBORS = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))


def simplify(points, tolerance):
    if len(points) < 3:
        return points
    start, end = np.array(points[0]), np.array(points[-1])
    segment = end - start
    offsets = np.array(points[1:-1]) - start
    distances = np.abs(segment[0] * offsets[:, 1] - segment[1] * offsets[:, 0]) / (np.linalg.norm(segment) or 1)
    if not len(distances) or distances.max() <= tolerance:
        return [points[0], points[-1]]
    pivot = int(distances.argmax()) + 1
    return simplify(points[: pivot + 1], tolerance)[:-1] + simplify(points[pivot:], tolerance)


def simplify_path(points, tolerance):
    if len(points) < 4 or points[0] != points[-1]:
        return simplify(points, tolerance)
    middle = (len(points) - 1) // 2
    first = simplify(points[: middle + 1], tolerance)
    second = simplify(points[middle:], tolerance)
    return first[:-1] + second


def remove_small_components(mask, min_size):
    labels = label(mask, connectivity=2)
    sizes = np.bincount(labels.ravel())
    return (labels != 0) & (sizes[labels] >= min_size)


def graph(skeleton):
    pixels = {tuple(pixel) for pixel in np.argwhere(skeleton)}
    adjacent = {}
    for row, col in pixels:
        neighbors = []
        for dy, dx in NEIGHBORS:
            candidate = (row + dy, col + dx)
            if candidate not in pixels:
                continue
            if dy and dx and ((row + dy, col) in pixels or (row, col + dx) in pixels):
                continue
            neighbors.append(candidate)
        adjacent[(row, col)] = neighbors
    return adjacent


def trace_paths(skeleton, tolerance):
    adjacent = graph(skeleton)
    nodes = {pixel for pixel, neighbors in adjacent.items() if len(neighbors) != 2}
    seen = set()
    paths = []

    def visit(start, next_pixel):
        path, previous, current = [start], start, next_pixel
        seen.add(tuple(sorted((start, next_pixel))))
        while current not in nodes:
            path.append(current)
            following = next(pixel for pixel in adjacent[current] if pixel != previous)
            seen.add(tuple(sorted((current, following))))
            previous, current = current, following
        path.append(current)
        return path

    for node in nodes:
        for neighbor in adjacent[node]:
            edge = tuple(sorted((node, neighbor)))
            if edge not in seen:
                paths.append(visit(node, neighbor))

    for start in adjacent:
        for neighbor in adjacent[start]:
            edge = tuple(sorted((start, neighbor)))
            if edge in seen:
                continue
            loop, previous, current = [start], start, neighbor
            seen.add(edge)
            while current != start:
                loop.append(current)
                following = next(pixel for pixel in adjacent[current] if pixel != previous)
                seen.add(tuple(sorted((current, following))))
                previous, current = current, following
            loop.append(start)
            paths.append(loop)

    return [simplify_path([(col, row) for row, col in path], tolerance) for path in paths if len(path) > 1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--min-component-size", type=int, default=16)
    parser.add_argument("--simplify-tolerance", type=float, default=1.5)
    args = parser.parse_args()
    if args.min_component_size < 1 or args.simplify_tolerance < 0:
        parser.error("min-component-size must be positive and simplify-tolerance cannot be negative")

    image = np.asarray(Image.open(args.input).convert("RGB"), dtype=np.int32)
    palette = np.asarray(PALETTE, dtype=np.int32)
    distances = ((image[:, :, None, :] - palette[None, None, :, :]) ** 2).sum(axis=3)
    nearest = distances.argmin(axis=2)
    closest = distances.min(axis=2)
    paths = []
    for index, color in enumerate(PALETTE):
        mask = (nearest == index) & (closest <= 12000)
        mask = remove_small_components(mask, args.min_component_size)
        for points in trace_paths(skeletonize(mask), args.simplify_tolerance):
            if len(points) > 1:
                paths.append((color, points))

    if not paths:
        parser.error("No centerline paths found; adjust the input or lower min-component-size")
    width, height = image.shape[1], image.shape[0]
    elements = []
    for color, points in paths:
        commands = [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in points[1:])
        hex_color = "#" + "".join(f"{channel:02x}" for channel in color)
        elements.append(f'<path d="{" ".join(commands)}" fill="none" stroke="{hex_color}"/>')
    Path(args.output).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">\n'
        + "\n".join(elements) + "\n</svg>\n",
        encoding="utf-8",
    )
    print(f"Extracted {len(paths)} centerline paths: {args.output}")


if __name__ == "__main__":
    main()
