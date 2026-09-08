import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class BatchGeneratePromptsTest(unittest.TestCase):
    def test_multiple_images_are_converted_in_one_run(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inputs = [root / "first.ppm", root / "second.ppm"]
            for index, path in enumerate(inputs):
                pixels = bytearray([255, 255, 255] * 32 * 32)
                color = (0, 0, 0) if index == 0 else (239, 68, 68)
                for y in range(14, 18):
                    for x in range(4, 28):
                        offset = (y * 32 + x) * 3
                        pixels[offset : offset + 3] = bytes(color)
                path.write_bytes(b"P6\n32 32\n255\n" + pixels)

            output = root / "output"
            script = Path(__file__).with_name("batch-generate-prompts.py")
            subprocess.run(
                [sys.executable, script, "--input", *inputs, "--output-dir", output],
                check=True,
            )

            for source in inputs:
                self.assertTrue((output / f"{source.stem}.svg").is_file())
                self.assertTrue(json.loads((output / f"{source.stem}.json").read_text())["strokes"])
                self.assertTrue((output / f"{source.stem}.html").is_file())


if __name__ == "__main__":
    unittest.main()
