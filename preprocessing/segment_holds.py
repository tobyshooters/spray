"""
Detect holds on a spray wall image using SAM (Segment Anything Model).
Outputs a JSON file of hold polygons for the web app.
"""

import json
import argparse
import numpy as np
from pathlib import Path

from segment_anything import (
    sam_model_registry,
    SamAutomaticMaskGenerator,
)
from PIL import Image


def load_image(path):
    img = Image.open(path).convert("RGB")
    return np.array(img)


def simplify_polygon(mask, tolerance=2.0):
    """
    Extract the largest contour from a binary mask
    and simplify it to a polygon.
    """
    import cv2

    mask_u8 = (mask * 255).astype(np.uint8)
    contours, _ = cv2.findContours(
        mask_u8,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    approx  = cv2.approxPolyDP(
        largest,
        tolerance,
        closed=True,
    )

    polygon = approx.squeeze().tolist()

    if len(polygon) < 3:
        return None

    return polygon


def mask_to_hold(mask_data, hold_id, w, h):
    mask    = mask_data["segmentation"]
    polygon = simplify_polygon(mask)

    if polygon is None:
        return None

    normalized = [
        [round(x / w, 4), round(y / h, 4)]
        for x, y in polygon
    ]

    ys, xs = np.where(mask)
    cx = round(float(np.mean(xs)) / w, 4)
    cy = round(float(np.mean(ys)) / h, 4)

    return {
        "id":      hold_id,
        "polygon": normalized,
        "cx":      cx,
        "cy":      cy,
    }


def iou(mask_a, mask_b):
    intersection = np.logical_and(mask_a, mask_b).sum()
    union        = np.logical_or(mask_a, mask_b).sum()
    if union == 0:
        return 0
    return intersection / union


def remove_overlaps(masks, threshold=0.3):
    masks = sorted(masks, key=lambda m: m["area"], reverse=True)

    keep = []
    for m in masks:
        overlaps = False
        for kept in keep:
            if iou(m["segmentation"], kept["segmentation"]) > threshold:
                overlaps = True
                break

        if not overlaps:
            keep.append(m)

    return keep


def main():
    parser = argparse.ArgumentParser(
        description="Segment holds from a spray wall photo"
    )
    parser.add_argument("image", help="Path to wall image")
    parser.add_argument(
        "--checkpoint",
        default="sam_vit_b_01ec64.pth",
        help="Path to SAM checkpoint",
    )
    parser.add_argument(
        "--model-type",
        default="vit_b",
        help="SAM model type",
    )
    parser.add_argument(
        "--output",
        default="holds.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--min-area",
        type=int,
        default=50,
        help="Minimum mask area in pixels",
    )
    parser.add_argument(
        "--max-area",
        type=int,
        default=50000,
        help="Maximum mask area in pixels",
    )
    parser.add_argument(
        "--overlap-threshold",
        type=float,
        default=0.3,
        help="IoU threshold for removing overlapping holds",
    )
    args = parser.parse_args()

    print(f"loading image: {args.image}")
    image = load_image(args.image)
    h, w  = image.shape[:2]

    print(f"loading SAM: {args.model_type}")
    sam = sam_model_registry[args.model_type](
        checkpoint=args.checkpoint
    )
    generator = SamAutomaticMaskGenerator(sam)

    print("generating masks...")
    masks = generator.generate(image)
    print(f"found {len(masks)} raw masks")

    filtered = [
        m for m in masks
        if args.min_area <= m["area"] <= args.max_area
    ]
    print(f"{len(filtered)} after area filter")

    deduped = remove_overlaps(filtered, args.overlap_threshold)
    print(f"{len(deduped)} after removing overlaps")

    holds = []
    for m in deduped:
        hold = mask_to_hold(m, f"h{len(holds) + 1}", w, h)
        if hold is not None:
            holds.append(hold)

    print(f"extracted {len(holds)} holds")

    output = Path(args.output)
    output.write_text(json.dumps(holds, indent=2))
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
