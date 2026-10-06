#!/usr/bin/env python3
"""Makes square 1080x1080 JPEG images for social media posts.

Instagram only accepts photos between 4:5 and 1.91:1 (many watch photos are taller), and
only JPEG. So each photo is placed on a dark square with the watch name and site address.
Output: us-site/static/social/<brand>/<model>.jpg, published on WatchPriceGuide at
https://watchpriceguide-us.web.app/social/<brand>/<model>.jpg (social/post.py links to it).

The photos are from Wikimedia Commons under free licences; posts credit the author and
licence (see post.py). Run once after photos change:  python3 social/make-images.py
Needs Pillow (pip install pillow) and the DejaVu fonts.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data' / 'market'
OUT = ROOT / 'us-site' / 'static' / 'social'
SITE = 'watchpriceguide-us.web.app'
SIZE, PHOTO_H = 1080, 860
NAVY, GOLD, WHITE = (15, 27, 45), (212, 175, 90), (255, 255, 255)
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def fit_text(draw, text, name, size, max_w):
    f = font(name, size)
    while draw.textlength(text, font=f) > max_w and size > 24:
        size -= 2
        f = font(name, size)
    return f


def main():
    ph = json.loads((DATA / 'images.json').read_text())
    idx = json.loads((DATA / 'index.json').read_text())
    names = {f'{m[0]}/{m[1]}': (m[2], m[3]) for m in idx['models']}
    made = 0
    for key, p in sorted(ph.items()):
        if key not in names:
            continue
        brand, model = names[key]
        im = ImageOps.exif_transpose(Image.open(ROOT / 'public' / p['src'])).convert('RGB')
        scale = min((SIZE - 80) / im.width, (PHOTO_H - 60) / im.height)  # fill the photo area (also enlarges small photos)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        canvas = Image.new('RGB', (SIZE, SIZE), NAVY)
        canvas.paste(im, ((SIZE - im.width) // 2, 30 + (PHOTO_H - 60 - im.height) // 2))
        d = ImageDraw.Draw(canvas)
        d.rectangle([0, PHOTO_H, SIZE, SIZE], fill=(10, 18, 31))
        d.line([60, PHOTO_H + 2, SIZE - 60, PHOTO_H + 2], fill=GOLD, width=3)
        f1 = fit_text(d, f'{brand} {model}', 'DejaVuSerif-Bold.ttf', 60, SIZE - 120)
        d.text((SIZE // 2, PHOTO_H + 78), f'{brand} {model}', font=f1, fill=WHITE, anchor='mm')
        d.text((SIZE // 2, PHOTO_H + 160), SITE, font=font('DejaVuSans.ttf', 34), fill=GOLD, anchor='mm')
        out = OUT / f'{key}.jpg'
        out.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
        made += 1
    print(f'Made {made} social images in {OUT}')


if __name__ == '__main__':
    main()
