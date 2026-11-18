#!/usr/bin/env python3
"""Descarga todas las librerías CDN de PDFPro v2.9.4 para uso offline."""
import os, re, sys, hashlib
import requests

ROOT = "/home/z/my-project/pdfpro-desktop/src/app/vendor"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

os.makedirs(ROOT, exist_ok=True)
downloads = []  # (url, dest)

# ── Librerías JS/CSS principales ──
downloads += [
    ("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", f"{ROOT}/pdfjs/pdf.min.js"),
    ("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js", f"{ROOT}/pdfjs/pdf.worker.min.js"),
    ("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", f"{ROOT}/xlsx.full.min.js"),
    ("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js", f"{ROOT}/pdf-lib.min.js"),
    ("https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js", f"{ROOT}/mammoth.browser.min.js"),
    ("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js", f"{ROOT}/jszip.min.js"),
    ("https://unpkg.com/docx-preview@0.3.5/dist/docx-preview.min.js", f"{ROOT}/docx-preview.min.js"),
    ("https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js", f"{ROOT}/fontkit.umd.min.js"),
    ("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", f"{ROOT}/leaflet/leaflet.css"),
    ("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", f"{ROOT}/leaflet/leaflet.js"),
    ("https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js", f"{ROOT}/tesseract/tesseract.min.js"),
    ("https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js", f"{ROOT}/tesseract/worker.min.js"),
]
# Imágenes de Leaflet (referenciadas por leaflet.css)
for img in ["layers.png", "layers-2x.png", "marker-icon.png", "marker-icon-2x.png", "marker-shadow.png"]:
    downloads.append((f"https://unpkg.com/leaflet@1.9.4/dist/images/{img}", f"{ROOT}/leaflet/images/{img}"))

# ── Tesseract core (WASM) ── el paquete NO tiene scope: "tesseract.js-core"
CORE_VERSION = "5.1.1"
for f in ["tesseract-core.wasm.js", "tesseract-core-simd.wasm.js",
          "tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js",
          "tesseract-core.wasm", "tesseract-core-simd.wasm",
          "tesseract-core-lstm.wasm", "tesseract-core-simd-lstm.wasm"]:
    downloads.append((f"https://cdn.jsdelivr.net/npm/tesseract.js-core@{CORE_VERSION}/{f}",
                      f"{ROOT}/tesseract/core/{f}"))

# ── Datos de idioma OCR (español e inglés) ──
for lang in ["spa", "eng"]:
    downloads.append((f"https://tessdata.projectnaptha.com/4.0.0/{lang}.traineddata.gz",
                      f"{ROOT}/tesseract/lang/{lang}.traineddata.gz"))

# ── Fuentes de Fontsource (embebido en PDF exportado: Arial/Times/Courier/Calibri/Cambria) ──
for pkg in ["arimo", "tinos", "cousine", "carlito", "caladea"]:
    for weight in ["400", "700"]:
        for style in ["normal", "italic"]:
            downloads.append((f"https://cdn.jsdelivr.net/npm/@fontsource/{pkg}@5.2.5/files/{pkg}-latin-{weight}-{style}.woff",
                              f"{ROOT}/fontsource/{pkg}-latin-{weight}-{style}.woff"))

# ── Google Fonts (Inter + JetBrains Mono) ──
def fetch_google_fonts():
    css_url = ("https://fonts.googleapis.com/css2"
               "?family=Inter:wght@300;400;500;600;700;800"
               "&family=JetBrains+Mono:wght@400;500&display=swap")
    import subprocess
    css = subprocess.run(
        ["curl", "-s", css_url, "-H",
         "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"],
        capture_output=True, text=True, timeout=120).stdout
    if "gstatic" not in css:
        raise RuntimeError("no se pudo obtener el CSS de Google Fonts")
    # conservar solo los subsets latin y latin-ext (español)
    blocks = re.split(r"(?=/\* [a-z-]+ \*/)", css)
    head, kept = blocks[0], []
    for b in blocks[1:]:
        m = re.match(r"/\* ([a-z-]+) \*/", b)
        if m and m.group(1) in ("latin", "latin-ext"):
            kept.append(b)
        else:
            kept.append("")  # eliminar otros subsets (cirílico, griego, etc.)
    css = head + "".join(kept)
    os.makedirs(f"{ROOT}/fonts", exist_ok=True)
    # URLs woff2 (formato moderno /s/familia/... o formato /l/font?kit=...)
    urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))
    print(f"  Google Fonts: {len(urls)} archivos woff2 (latin/latin-ext)")
    mapping = {}
    for i, u in enumerate(urls):
        name = f"gf-{i:03d}.woff2"
        dest = f"{ROOT}/fonts/{name}"
        downloads.append((u, dest))
        mapping[u] = "fonts/" + name
    for u, rel in mapping.items():
        css = css.replace(u, rel)
    with open(f"{ROOT}/fonts/fonts.css", "w", encoding="utf-8") as f:
        f.write("/* Inter + JetBrains Mono (Google Fonts, copia local) */\n" + css)
    print(f"  fonts.css escrito ({len(css)} bytes)")

fetch_google_fonts()

# ── Descargar todo ──
fail = []
for url, dest in downloads:
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        continue
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        r = requests.get(url, headers=UA, timeout=180)
        r.raise_for_status()
        if len(r.content) < 200:
            raise RuntimeError(f"respuesta demasiado corta ({len(r.content)} B)")
        with open(dest, "wb") as f:
            f.write(r.content)
        print(f"OK  {os.path.relpath(dest, ROOT):55s} {len(r.content)/1024:9.1f} KB")
    except Exception as e:
        fail.append((url, str(e)))
        print(f"ERR {url}\n    -> {e}")

print("\n==== RESUMEN ====")
print(f"descargas OK: {len(downloads)-len(fail)}  fallos: {len(fail)}")
if fail:
    for u, e in fail:
        print(" FALLO:", u, "->", e)
    sys.exit(1)
