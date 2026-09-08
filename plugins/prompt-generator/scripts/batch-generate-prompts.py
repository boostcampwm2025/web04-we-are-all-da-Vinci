#!/usr/bin/env python3
"""Convert multiple raster images into SVG, JSON, and HTML prompt files."""

import argparse
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", nargs="+", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    inputs = [Path(value) for value in args.input]
    missing = [str(path) for path in inputs if not path.is_file()]
    if missing:
        parser.error(f"Input files not found: {', '.join(missing)}")
    stems = [path.stem for path in inputs]
    if len(stems) != len(set(stems)):
        parser.error("Input filenames must have unique stems")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    scripts = Path(__file__).resolve().parent

    for source in inputs:
        svg = output_dir / f"{source.stem}.svg"
        prompt = output_dir / f"{source.stem}.json"
        preview = output_dir / f"{source.stem}.html"
        subprocess.run(
            [sys.executable, scripts / "png-to-centerline-svg.py", "--input", source, "--output", svg],
            check=True,
        )
        subprocess.run(
            [sys.executable, scripts / "svg-to-prompt.py", "--input", svg, "--output", prompt],
            check=True,
        )
        subprocess.run(
            [sys.executable, scripts / "prompt-to-html.py", "--input", prompt, "--output", preview],
            check=True,
        )

    print(f"Generated SVG, JSON, and HTML for {len(inputs)} images in {output_dir}")


if __name__ == "__main__":
    main()
