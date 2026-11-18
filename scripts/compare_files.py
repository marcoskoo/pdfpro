#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compara: original XLSX vs XLSX guardado por la app vs PDF exportado por la app."""
import openpyxl, sys, json
from openpyxl.utils import get_column_letter

ORIG = "/home/z/my-project/upload/ATC CM468  11NOV.xlsx"
SAVED = "/home/z/my-project/upload/ATC CM468  11NOV (1) (1).xlsx"

def load(path):
    wb = openpyxl.load_workbook(path, data_only=False)
    ws = wb.active
    return wb, ws

def dump_ws(ws, label, maxrow=70, maxcol=40):
    print(f"\n===== {label} :: sheet={ws.title!r} dims={ws.dimensions} max_row={ws.max_row} max_col={ws.max_column}")
    print(f"  merges ({len(ws.merged_cells.ranges)}): {[str(r) for r in ws.merged_cells.ranges][:60]}")
    # anchos de columna
    widths = {}
    for k, dim in ws.column_dimensions.items():
        if dim.width is not None:
            widths[k] = round(dim.width, 2)
    print(f"  col widths ({len(widths)}): {dict(list(sorted(widths.items(), key=lambda x: len(x[0])*100+ (ord(x[0][0]) if x[0] else 0)))[:40])}")
    heights = {}
    for k, dim in ws.row_dimensions.items():
        if dim.height is not None:
            heights[k] = round(dim.height, 1)
    print(f"  row heights ({len(heights)}): {dict(list(heights.items())[:30])}")
    # celdas con valor
    cells = {}
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, maxrow), max_col=min(ws.max_column, maxcol)):
        for c in row:
            if c.value is not None and str(c.value).strip() != "":
                cells[c.coordinate] = str(c.value)
    print(f"  non-empty cells ({len(cells)}):")
    for k in sorted(cells, key=lambda x: (int(''.join(ch for ch in x if ch.isdigit())), x)):
        print(f"    {k:>5} = {cells[k]!r}")
    return cells

wb1, ws1 = load(ORIG)
c1 = dump_ws(ws1, "ORIGINAL")
wb2, ws2 = load(SAVED)
c2 = dump_ws(ws2, "APP-SAVED")

# diferencias de valor
print("\n===== DIFERENCIAS ORIGINAL vs APP-SAVED (valores) =====")
allk = set(c1) | set(c2)
diffs = 0
for k in sorted(allk, key=lambda x: (int(''.join(ch for ch in x if ch.isdigit())), x)):
    a, b = c1.get(k), c2.get(k)
    if a != b:
        print(f"  {k:>5}: orig={a!r}  saved={b!r}")
        diffs += 1
print(f"  -> {diffs} celdas con diferencia")

# merges diff
m1 = set(str(r) for r in ws1.merged_cells.ranges)
m2 = set(str(r) for r in ws2.merged_cells.ranges)
print("\n===== MERGES: solo en original:", sorted(m1-m2)[:20], " solo en app-saved:", sorted(m2-m1)[:20])

# estilos clave del original: encabezado y velocidad
def style_of(ws, coord):
    c = ws[coord]
    al = c.alignment
    f = c.font
    b = c.border
    def bd(side):
        return f"{getattr(b, side).style}/{getattr(b, side).color.rgb if getattr(b, side).color else None}" if getattr(b, side).style else None
    return dict(v=c.value, h=al.horizontal, v_ =al.vertical, wrap=al.wrap_text,
                font=f"{f.name}/{f.sz}/{'B' if f.bold else ''}", fill=(c.fill.fgColor.rgb if c.fill and c.fill.patternType=='solid' else None),
                L=bd('left'), R=bd('right'), T=bd('top'), B=bd('bottom'))

print("\n===== ESTILOS ORIGINALES (celdas clave) =====")
for coord in ["E1","E2","E3","F22","E23","N22","G23","U23","D19","P19","E12","F16"]:
    try:
        print(f"  {coord}: {style_of(ws1, coord)}")
    except Exception as e:
        print(f"  {coord}: ERR {e}")

# buscar en original: celdas que contengan N04 y F380 (velocidad/nivel)
print("\n===== BÚSQUEDA velocidad/nivel en ORIGINAL =====")
for row in ws1.iter_rows(min_row=1, max_row=ws1.max_row):
    for c in row:
        if c.value is not None and any(s in str(c.value) for s in ["N04", "F38", "F40", "441", "380"]):
            print(f"  {c.coordinate} = {c.value!r} (len={len(str(c.value))})")

print("\n===== BÚSQUEDA velocidad/nivel en APP-SAVED =====")
for row in ws2.iter_rows(min_row=1, max_row=ws2.max_row):
    for c in row:
        if c.value is not None and any(s in str(c.value) for s in ["N04", "F38", "F40", "441", "380"]):
            print(f"  {c.coordinate} = {c.value!r} (len={len(str(c.value))})")

# imágenes/dibujos en ambos
for label, wb in [("ORIGINAL", wb1), ("APP-SAVED", wb2)]:
    ws = wb.active
    print(f"\n===== {label}: imagenes/drawings =====")
    try:
        print("  _images:", len(getattr(ws, '_images', [])))
        for im in getattr(ws, '_images', []):
            anch = getattr(im, 'anchor', None)
            frm = getattr(anch, '_from', None)
            print("   img anchor from:", getattr(frm, 'col', None), getattr(frm, 'row', None), "ext:", getattr(im, 'width', None), getattr(im, 'height', None))
    except Exception as e:
        print("  ERR", e)
    # raw zip: buscar drawings
    import zipfile
    z = zipfile.ZipFile(SAVED if label=="APP-SAVED" else ORIG)
    names = [n for n in z.namelist() if 'drawing' in n or 'media' in n]
    print("  zip entries drawing/media:", names)
