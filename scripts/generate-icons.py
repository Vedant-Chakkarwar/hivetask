#!/usr/bin/env python3
"""Generate HiveTask PWA icons using PIL."""

import os
import math
from PIL import Image, ImageDraw, ImageFont

ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]


def draw_icon(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.08)
    radius = int(size * 0.22)

    # Amber background with rounded corners
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill='#F59E0B',
    )

    # Darker amber border
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        outline='#D97706',
        width=max(1, size // 64),
    )

    # Hexagon outline in center
    cx, cy = size / 2, size / 2
    hex_r = size * 0.28
    points = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        points.append((
            cx + hex_r * math.cos(angle),
            cy + hex_r * math.sin(angle),
        ))
    draw.polygon(points, fill='#FDE68A', outline='#FFFBEB')

    # Letter "H" in white
    font_size = int(size * 0.38)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), 'H', font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        (cx - tw / 2, cy - th / 2 - bbox[1]),
        'H',
        fill='#FFFFFF',
        font=font,
    )

    return img


for size in SIZES:
    icon = draw_icon(size)
    out = os.path.join(ICONS_DIR, f'icon-{size}.png')
    icon.save(out, 'PNG')
    print(f'Generated icon-{size}.png')

print('Done!')
