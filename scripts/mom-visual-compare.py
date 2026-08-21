#!/usr/bin/env python3
"""Compare rendered MOM page images with a deterministic golden set.

The Excel render is the visual reference. Office/font rasterization is not
bit-identical across machines, so the gate reports both changed-pixel ratio
and mean absolute error with a small, documented tolerance.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


def page_files(directory: Path) -> list[Path]:
    files = {path.resolve() for path in directory.glob("*.png")} | {path.resolve() for path in directory.glob("*.PNG")}
    return sorted((Path(path) for path in files), key=lambda path: path.name.lower())


def compare_page(golden: Path, candidate: Path, diff_path: Path | None) -> dict[str, object]:
    golden_image = Image.open(golden).convert("RGB")
    candidate_image = Image.open(candidate).convert("RGB")
    if golden_image.size != candidate_image.size:
        return {
            "golden": golden.name,
            "candidate": candidate.name,
            "status": "size-mismatch",
            "golden_size": golden_image.size,
            "candidate_size": candidate_image.size,
        }

    difference = ImageChops.difference(golden_image, candidate_image)
    changed = difference.point(lambda value: 255 if value > 16 else 0)
    changed_pixels = sum(changed.convert("L").histogram()[1:])
    total_pixels = golden_image.width * golden_image.height
    changed_ratio = changed_pixels / max(total_pixels, 1)
    mean_error = sum(ImageStat.Stat(difference).mean) / (3 * 255)

    if diff_path:
        diff_path.parent.mkdir(parents=True, exist_ok=True)
        difference.save(diff_path)

    return {
        "golden": golden.name,
        "candidate": candidate.name,
        "status": "measured",
        "changed_ratio": round(changed_ratio, 6),
        "mean_error": round(mean_error, 6),
        "size": golden_image.size,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--golden-dir", required=True, type=Path)
    parser.add_argument("--candidate-dir", required=True, type=Path)
    parser.add_argument("--diff-dir", type=Path)
    parser.add_argument("--threshold", type=float, default=0.12)
    parser.add_argument("--mean-error", type=float, default=0.04)
    args = parser.parse_args()

    golden_pages = page_files(args.golden_dir)
    candidate_pages = page_files(args.candidate_dir)
    if not golden_pages or not candidate_pages:
        print(json.dumps({"status": "input-missing", "golden_pages": len(golden_pages), "candidate_pages": len(candidate_pages)}))
        return 2
    if len(golden_pages) != len(candidate_pages):
        print(json.dumps({"status": "page-count-mismatch", "golden_pages": len(golden_pages), "candidate_pages": len(candidate_pages)}))
        return 1

    results = []
    for index, (golden, candidate) in enumerate(zip(golden_pages, candidate_pages), start=1):
        result = compare_page(golden, candidate, args.diff_dir / f"page-{index:03d}.png" if args.diff_dir else None)
        if result.get("status") == "size-mismatch":
            results.append(result)
            continue
        result["status"] = "pass" if (
            float(result.get("changed_ratio", 1)) <= args.threshold
            and float(result.get("mean_error", 1)) <= args.mean_error
        ) else "mismatch"
        results.append(result)

    failed = [result for result in results if result.get("status") != "pass"]
    print(json.dumps({"status": "pass" if not failed else "mismatch", "pages": results}, indent=2))
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
