#!/usr/bin/env python3
"""Transforma el HTML web de PDFPro en la versión escritorio (offline)."""
import re, sys

SRC = "/home/z/my-project/upload/pdfpro-v2.9.4-toda-la-hoja.html"
DST = "/home/z/my-project/pdfpro-desktop/src/app/index.html"

html = open(SRC, encoding="utf-8").read()
orig_len = len(html)
replacements = [
    # ── librerías CDN → vendor local ──
    ('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>',
     '<script src="vendor/pdfjs/pdf.min.js"></script>'),
    ('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
     '<script src="vendor/xlsx.full.min.js"></script>'),
    ('<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>',
     '<script src="vendor/pdf-lib.min.js"></script>'),
    ('<script src="https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js"></script>',
     '<script src="vendor/mammoth.browser.min.js"></script>'),
    ('<script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>',
     '<script src="vendor/jszip.min.js"></script>'),
    ('<script src="https://unpkg.com/docx-preview@0.3.5/dist/docx-preview.min.js"></script>',
     '<script src="vendor/docx-preview.min.js"></script>'),
    ('<script src="https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js"></script>',
     '<script src="vendor/fontkit.umd.min.js"></script>'),
    ('<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
     '<link rel="stylesheet" href="vendor/leaflet/leaflet.css"/>'),
    ('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
     '<script src="vendor/leaflet/leaflet.js"></script>'),
    ('<script src="https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js"></script>',
     '<script src="vendor/tesseract/tesseract.min.js"></script>'),
    # ── worker de pdf.js local ──
    ("pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';",
     "pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';"),
    # ── Google Fonts → copia local ──
    ("@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');",
     "@import url('vendor/fonts/fonts.css');"),
    # ── quitar alert de debug (marcado "remover después" en el código original) ──
    ("  alert('redirect_uri: '+redirectUri); // DEBUG - remover después\n", ""),
    # ── título de ventana ──
    ("<title>PDF Editor Pro – CORPAC AIS/ARO SPHI</title>",
     "<title>PDFPro</title>"),
    # ── bridge de escritorio antes de cerrar body ──
    ("</body>\n</html>",
     '<script src="desktop-bridge.js"></script>\n</body>\n</html>'),
]

missing = []
for old, new in replacements:
    if old not in html:
        missing.append(old[:90])
        continue
    if html.count(old) != 1:
        print(f"AVISO: patrón aparece {html.count(old)} veces: {old[:70]}")
    html = html.replace(old, new)

if missing:
    print("PATRONES NO ENCONTRADOS:")
    for m in missing:
        print("  -", m)
    sys.exit(1)

open(DST, "w", encoding="utf-8").write(html)
print(f"OK transformado: {orig_len} -> {len(html)} bytes")

# ── verificación: no deben quedar recursos CDN en atributos src/href/url() ──
rest = re.findall(r'(?:src|href)\s*=\s*["\']https?://[^"\']+|url\(\s*["\']?https?://[^)\']+', html)
print(f"recursos remotos restantes en atributos: {len(rest)}")
for r in rest[:10]:
    print("   ", r[:120])
