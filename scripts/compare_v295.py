#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compara el XLSX original con el XLSX exportado por la app v2.9.5.
Busca: sello (imágenes/dibujos), títulos descentrados, dígitos solapados."""
import openpyxl, sys, zipfile

ORIG = "/home/z/my-project/upload/ATC CM468  11NOV.xlsx"
APP  = "/home/z/my-project/upload/ATC CM468  11NOV (1) (1).xlsx"

def dump(path, label):
    print("=" * 70)
    print(label, path)
    print("=" * 70)
    wb = openpyxl.load_workbook(path)
    print("Hojas:", wb.sheetnames)
    ws = wb[wb.sheetnames[0]]
    print("Dim:", ws.dimensions, "max_row:", ws.max_row, "max_col:", ws.max_column)
    print("Merged:", len(ws.merged_cells.ranges))
    # imágenes / dibujos (sello)
    print("_images:", len(getattr(ws, "_images", [])))
    for img in getattr(ws, "_images", []):
        anch = img.anchor
        try:
            frm = anch._from
            print("  imagen anchor from: col", frm.col, "row", frm.row,
                  "ext:", getattr(img, "width", "?"), "x", getattr(img, "height", "?"))
        except Exception as e:
            print("  imagen anchor:", anch, e)
    # zip: media & drawings
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        media = [n for n in names if "media" in n or "drawing" in n.lower()]
        print("Zip media/drawing:", media if media else "NINGUNO")
    # títulos
    print("\n-- Celdas con 'Plan de vuelo' / 'Flight Plan' --")
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 40)):
        for c in row:
            v = c.value
            if isinstance(v, str) and ("Plan de vuelo" in v or "Flight Plan" in v or "vuelo" in v.lower()[:14]):
                print(f"  {c.coordinate}: {v!r} align_h={c.alignment.horizontal} "
                      f"valign={c.alignment.vertical}")
    return wb, ws

wb_o, ws_o = dump(ORIG, "ORIGINAL")
wb_a, ws_a = dump(APP, "APP v2.9.5")

# --- Comparación celda a celda (primeras 90 filas, 60 cols) ---
print("\n" + "=" * 70)
print("DIFERENCIAS DE CONTENIDO (origen vs app)")
print("=" * 70)
diffs = 0
for r in range(1, max(ws_o.max_row, ws_a.max_row) + 1):
    for col in range(1, max(ws_o.max_column, ws_a.max_column) + 1):
        try:
            vo = ws_o.cell(row=r, column=col).value
        except Exception:
            vo = None
        try:
            va = ws_a.cell(row=r, column=col).value
        except Exception:
            va = None
        if vo != va:
            diffs += 1
            if diffs <= 40:
                co = openpyxl.utils.get_column_letter(col)
                print(f"  {co}{r}: ORIG={vo!r}  APP={va!r}")
print("Total diferencias:", diffs)

# --- Dónde viven los valores alfanuméricos clave (velocidad/nivel) ---
print("\n-- Valores F350 / N0450 / M082 etc (velocidad, nivel) --")
import re
pat = re.compile(r"^(N|M|K)?\d{3,4}[A-Z]{0,2}$")
for label, ws in (("ORIG", ws_o), ("APP", ws_a)):
    print(f"[{label}]")
    n = 0
    for row in ws.iter_rows(min_row=1, max_row=90, max_col=60):
        for c in row:
            if isinstance(c.value, str) and pat.match(c.value.strip()):
                print(f"   {c.coordinate}: {c.value!r}")
                n += 1
                if n > 15: break
        if n > 15: break

# --- merge compare ---
mo = set(str(x) for x in ws_o.merged_cells.ranges)
ma = set(str(x) for x in ws_a.merged_cells.ranges)
print("\nMerged solo en ORIG:", len(mo - ma), list(mo - ma)[:10])
print("Merged solo en APP:", len(ma - mo), list(ma - mo)[:10])

# --- anchor row heights/col widths sample ---
print("\nCol widths ORIG (A-J):",
      [round(ws_o.column_dimensions[l].width or 0, 1) for l in "ABCDEFGHIJ"])
print("Col widths APP  (A-J):",
      [round(ws_a.column_dimensions[l].width or 0, 1) for l in "ABCDEFGHIJ"])
print("Row heights ORIG (1-12):",
      [round(ws_o.row_dimensions[r].height or 0, 1) for r in range(1, 13)])
print("Row heights APP  (1-12):",
      [round(ws_a.row_dimensions[r].height or 0, 1) for r in range(1, 13)])
