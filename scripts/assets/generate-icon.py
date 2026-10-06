#!/usr/bin/env python3
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SIZE = 256


def clamp(value: int) -> int:
    return max(0, min(255, value))


def blend(dst, src):
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    alpha = sa / 255
    out_a = alpha + da / 255 * (1 - alpha)
    if out_a == 0:
      return (0, 0, 0, 0)
    return (
        clamp(int((sr * alpha + dr * da / 255 * (1 - alpha)) / out_a)),
        clamp(int((sg * alpha + dg * da / 255 * (1 - alpha)) / out_a)),
        clamp(int((sb * alpha + db * da / 255 * (1 - alpha)) / out_a)),
        clamp(int(out_a * 255)),
    )


def point_in_poly(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def fill_poly(pixels, poly, color):
    min_x = max(0, int(min(x for x, _ in poly)))
    max_x = min(SIZE - 1, int(max(x for x, _ in poly)))
    min_y = max(0, int(min(y for _, y in poly)))
    max_y = min(SIZE - 1, int(max(y for _, y in poly)))
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if point_in_poly(x + 0.5, y + 0.5, poly):
                pixels[y][x] = blend(pixels[y][x], color)


def draw_icon():
    pixels = [[(0, 0, 0, 0) for _ in range(SIZE)] for _ in range(SIZE)]

    for y in range(SIZE):
        for x in range(SIZE):
            dx = x - SIZE / 2
            dy = y - SIZE / 2
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < 116:
                glow = int(max(0, 1 - dist / 116) * 110)
                pixels[y][x] = blend(pixels[y][x], (150, 0, 25, glow))

    facets = [
        ([(128, 16), (212, 88), (170, 216), (128, 238)], (42, 4, 12, 255)),
        ([(128, 16), (78, 78), (44, 184), (128, 238)], (7, 7, 12, 255)),
        ([(78, 78), (128, 16), (125, 124), (72, 136)], (102, 8, 24, 245)),
        ([(128, 16), (212, 88), (125, 124)], (180, 18, 38, 235)),
        ([(72, 136), (125, 124), (128, 238), (44, 184)], (19, 2, 8, 255)),
        ([(125, 124), (212, 88), (170, 216), (128, 238)], (92, 3, 19, 255)),
        ([(72, 136), (125, 124), (170, 216), (128, 238)], (35, 0, 12, 245)),
    ]

    for poly, color in facets:
        fill_poly(pixels, poly, color)

    edge_color = (255, 50, 75, 120)
    for y in range(SIZE):
        for x in range(SIZE):
            if pixels[y][x][3] > 0 and (x + y) % 19 == 0:
                pixels[y][x] = blend(pixels[y][x], edge_color)

    return pixels


def write_png(path: Path, pixels):
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend([r, g, b, a])

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    return png


def write_ico(path: Path, png_data: bytes):
    header = struct.pack("<HHH", 0, 1, 1)
    directory = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png_data), 6 + 16)
    path.write_bytes(header + directory + png_data)


def write_svg(path: Path):
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs><radialGradient id="g" cx="50%" cy="45%"><stop offset="0" stop-color="#ff243f"/><stop offset="1" stop-color="#050006"/></radialGradient></defs>
<rect width="256" height="256" rx="54" fill="#050006"/>
<circle cx="128" cy="128" r="112" fill="url(#g)" opacity=".36"/>
<path d="M128 16 212 88 170 216 128 238 44 184 78 78Z" fill="#08070d" stroke="#ff304b" stroke-width="5"/>
<path d="M128 16 125 124 78 78Z" fill="#8e0b22"/>
<path d="M128 16 212 88 125 124Z" fill="#c41934"/>
<path d="M125 124 212 88 170 216 128 238Z" fill="#5a0314"/>
<path d="M78 78 125 124 44 184Z" fill="#19020a"/>
<path d="M44 184 125 124 128 238Z" fill="#31000e"/>
</svg>
""",
        encoding="utf-8",
    )


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    pixels = draw_icon()
    png_data = write_png(ASSETS / "icon.png", pixels)
    write_ico(ASSETS / "icon.ico", png_data)
    write_svg(ASSETS / "icon.svg")
    print(f"Icones gerados em {ASSETS}")


if __name__ == "__main__":
    main()
