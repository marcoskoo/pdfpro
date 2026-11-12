#!/usr/bin/env python3
"""Genera los iconos de PDFPro: app (.ico) y tipo de archivo PDF (.ico)."""
from PIL import Image, ImageDraw, ImageFont
import math

OUT = "/home/z/my-project/pdfpro-desktop/build"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

def rounded_rect_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def app_icon(size):
    """Cuadrado azul redondeado con 'P' blanca — estilo del logo de login."""
    radius = max(2, int(size * 0.225))
    base = vertical_gradient(size, (91, 150, 251), (45, 102, 205))  # #4f8ef7 → #2d66cd
    img = base.copy().convert("RGBA")
    # máscara redondeada
    mask = rounded_rect_mask(size, radius)
    # brillo superior sutil
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse([-size * 0.35, -size * 0.85, size * 1.35, size * 0.35],
               fill=(255, 255, 255, 34))
    img = Image.composite(Image.alpha_composite(img, gloss), Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    # letra P
    d = ImageDraw.Draw(img)
    fsize = int(size * 0.62)
    try:
        font = ImageFont.truetype(FONT_BOLD, fsize)
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), "P", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1] - size * 0.02
    d.text((x, y), "P", font=font, fill=(255, 255, 255, 255))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def doc_icon(size):
    """Documento blanco con esquina doblada y banda azul con 'P'."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size
    m = s * 0.12            # margen
    fold = s * 0.22         # solapa
    # cuerpo del documento
    body = [m, m * 0.7, s - m, s - m * 0.55]
    d.rounded_rectangle(body, radius=max(1, int(s * 0.05)), fill=(248, 250, 252, 255),
                        outline=(160, 170, 185, 255), width=max(1, int(s * 0.02)))
    # solapa (triángulo) recortada arriba a la derecha
    d.polygon([(s - m - fold, m * 0.7), (s - m, m * 0.7 + fold), (s - m - fold, m * 0.7 + fold)],
              fill=(214, 222, 233, 255))
    # líneas de texto
    if size >= 48:
        line_c = (176, 186, 200, 255)
        ly = m * 0.7 + fold + s * 0.10
        for i in range(3):
            d.rounded_rectangle([m + s * 0.10, ly, s - m - s * 0.10, ly + s * 0.035],
                                radius=int(s * 0.017), fill=line_c)
            ly += s * 0.085
    # banda azul inferior con P
    band_h = s * 0.30
    band = [m + s * 0.045, s - m * 0.55 - band_h, s - m - s * 0.045, s - m * 0.55]
    d.rounded_rectangle(band, radius=max(1, int(s * 0.045)),
                        fill=(79, 142, 247, 255))
    try:
        font = ImageFont.truetype(FONT_BOLD, int(band_h * 0.78))
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), "P", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((band[0] + band[2] - w) / 2 - bbox[0], (band[1] + band[3] - h) / 2 - bbox[1]),
           "P", font=font, fill=(255, 255, 255, 255))
    return img

def ico_entry_png(img):
    import io
    b = io.BytesIO()
    img.save(b, format="PNG")
    return b.getvalue()

def ico_entry_bmp(img):
    """BMP 32bpp con máscara AND (formato clásico ICO)."""
    import struct
    w, h = img.size
    px = img.tobytes("raw", "BGRA")
    xor = b"".join(px[y * w * 4:(y + 1) * w * 4] for y in range(h - 1, -1, -1))
    # máscara AND 1bpp (todo opaco → ceros), filas alineadas a 32 bits
    row_bytes = ((w + 31) // 32) * 4
    and_mask = b"\x00" * (row_bytes * h)
    hdr = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, len(xor) + len(and_mask), 0, 0, 0, 0)
    return hdr + xor + and_mask

def save_ico(fn, maker, sizes=(16, 24, 32, 48, 64, 128, 256)):
    import struct, io
    entries = []
    for sz in sizes:
        img = maker(sz)
        if sz <= 48:
            data = ico_entry_bmp(img)
        else:
            data = ico_entry_png(img)
        entries.append((sz, sz, data))
    # cabecera ICO
    out = struct.pack("<HHH", 0, 1, len(entries))
    offset = 6 + 16 * len(entries)
    dir_data = b""
    for (w, h, data) in entries:
        w_b = 0 if w >= 256 else w
        h_b = 0 if h >= 256 else h
        dir_data += struct.pack("<BBBBHHII", w_b, h_b, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    with open(f"{OUT}/{fn}", "wb") as f:
        f.write(out + dir_data + b"".join(d for _, _, d in entries))
    maker(512).save(f"{OUT}/{fn.replace('.ico', '-512.png')}", format="PNG")
    print(f"OK {fn} ({os.path.getsize(f'{OUT}/{fn}')} bytes)")

import os
os.makedirs(OUT, exist_ok=True)
save_ico("icon.ico", app_icon)
save_ico("pdfdoc.ico", doc_icon)
print("Iconos generados en", OUT)
