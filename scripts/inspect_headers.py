#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inspección fina: merges/alignment de encabezados en original; posición de encabezados en PDF."""
import openpyxl, pdfplumber, zipfile, re

ORIG = "/home/z/my-project/upload/ATC CM468  11NOV.xlsx"
SAVED = "/home/z/my-project/upload/ATC CM468  11NOV (1) (1).xlsx"
PDF = "/home/z/my-project/upload/ATC CM468  11NOV (1).pdf"

wb = openpyxl.load_workbook(ORIG)
ws = wb.active
print("=== MERGES que tocan filas 1-8 (original) ===")
for r in sorted(ws.merged_cells.ranges, key=lambda x: (x.min_row, x.min_col)):
    if r.min_row <= 8:
        print("  ", str(r))
print("\n=== Alignment/estilo de D2, D3, E4, K6, Q6 (original) ===")
for coord in ["D2", "D3", "E4", "K6", "Q6", "D1"]:
    c = ws[coord]
    al = c.alignment
    print(f"  {coord}: v={c.value!r:.60} h={al.horizontal} wrap={al.wrap_text} shrink={al.shrink_to_fit} font={c.font.name}/{c.font.sz}/{c.font.bold}")
    # merge que lo contiene
    for r in ws.merged_cells.ranges:
        if c.coordinate in r:
            print(f"        contenido en merge {r}")

print("\n=== ¿D2/D3 dentro de merge? (busca fila 2-3) ===")
for r in ws.merged_cells.ranges:
    if r.min_row <= 3 and r.max_row >= 2:
        print("  ", str(r))

# misma info en app-saved
wb2 = openpyxl.load_workbook(SAVED)
ws2 = wb2.active
print("\n=== APP-SAVED: merges filas 1-8 ===")
for r in sorted(ws2.merged_cells.ranges, key=lambda x: (x.min_row, x.min_col)):
    if r.min_row <= 8:
        print("  ", str(r))
for coord in ["D2", "D3", "E4", "K6", "Q6"]:
    c = ws2[coord]
    al = c.alignment
    print(f"  {coord}: v={c.value!r:.60} h={al.horizontal} wrap={al.wrap_text}")

# anchos de columna D..Q reales
print("\n=== anchos (chars) D-Q original ===")
for col in "DEFGHIJKLMNOPQ":
    d = ws.column_dimensions.get(col)
    print(f"  {col}: {d.width if d else None}")

# ¿El original tiene celdas con centerContinuous?
print("\n=== alignment horizontal distribution (original, celdas con valor) ===")
import collections
cnt = collections.Counter()
for row in ws.iter_rows():
    for c in row:
        if c.value is not None:
            cnt[c.alignment.horizontal] += 1
print(" ", dict(cnt))

# posiciones de encabezado en el PDF
print("\n=== PDF: posición de palabras clave ===")
with pdfplumber.open(PDF) as pdf:
    page = pdf.pages[0]
    words = page.extract_words()
    for w in words:
        if w['text'] in ('Plan','Vuelo','Flight','Plan','DESTINATÁRIO','Priority','PRIORIDAD','8/23/24','FPL','DCT','CLA'):
            print(f"  '{w['text']}' x0={w['x0']:.1f} x1={w['x1']:.1f} top={w['top']:.1f} (página ancho={page.width:.0f})")
    # línea superior del formulario: primer rect grande
    rs = [r for r in page.rects if r['width'] > 400]
    print(f"  rects anchos (>400): {len(rs)}; el más externo: x0={min(r['x0'] for r in rs):.1f} x1={max(r['x1'] for r in rs):.1f}")
