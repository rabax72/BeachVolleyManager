"""
Genera logo e icone del gioco a partire da design/logo.png (1254x1254, sfondo bianco).

    python scripts/build-icons.py

Output in public/brand/:
  logo.webp, logo.png  logo completo con sfondo trasparente (home, nuova carriera)
  icon-{32,180,192,512}.png  icona del solo pallone (favicon, logo piccolo, PWA)
Richiede Pillow (pip install pillow).
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "logo.png"
OUT = ROOT / "public" / "brand"

NAVY = (1, 41, 85, 255)
# Cerchio del pallone nell'immagine originale e riga in cui inizia la fascia con la scritta
BALL_CX, BALL_CY, BALL_R = 611, 439, 214
BANNER_TOP = 556


def remove_white_background(im: Image.Image, threshold: int = 238) -> Image.Image:
    """Rende trasparente il bianco collegato ai bordi (flood fill), con bordo sfumato."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.extend(((x, 0), (x, h - 1)))
    for y in range(h):
        queue.extend(((0, y), (w - 1, y)))
    while queue:
        x, y = queue.popleft()
        i = y * w + x
        if bg[i]:
            continue
        r, g, b, _ = px[x, y]
        if min(r, g, b) < threshold:
            continue
        bg[i] = 1
        if x > 0:
            queue.append((x - 1, y))
        if x < w - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < h - 1:
            queue.append((x, y + 1))
    mask = Image.frombytes("L", (w, h), bytes(0 if v else 255 for v in bg))
    # Ammorbidisce il contorno per evitare l'alone bianco
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
    im.putalpha(mask)
    return im


def ball_icon(im: Image.Image, size: int) -> Image.Image:
    """Icona circolare con il solo pallone; la parte coperta dalla scritta diventa blu."""
    r = BALL_R
    ball = im.convert("RGBA").crop((BALL_CX - r, BALL_CY - r, BALL_CX + r, BALL_CY + r))
    ImageDraw.Draw(ball).rectangle((0, BANNER_TOP - (BALL_CY - r), 2 * r, 2 * r), fill=NAVY)
    s = 2 * r * 2  # lavora a risoluzione doppia per bordi puliti
    big = ball.resize((s, s), Image.LANCZOS)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(big, (0, 0), mask)
    ImageDraw.Draw(out).ellipse((8, 8, s - 9, s - 9), outline=NAVY, width=34)
    return out.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC)
    logo = remove_white_background(src).resize((640, 640), Image.LANCZOS)
    logo.save(OUT / "logo.webp", quality=88, method=6)
    logo.save(OUT / "logo.png", optimize=True)
    for size in (32, 180, 192, 512):
        ball_icon(src, size).save(OUT / f"icon-{size}.png", optimize=True)
    for f in sorted(OUT.iterdir()):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
