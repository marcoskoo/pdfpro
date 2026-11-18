#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vuelca XML interno del XLSX original: styles, drawing, content types, rels."""
import zipfile, re, sys

ORIG = "/home/z/my-project/upload/ATC CM468  11NOV.xlsx"
z = zipfile.ZipFile(ORIG)
print("== ENTRIES ==")
for n in z.namelist():
    print("  ", n)

st = z.read('xl/styles.xml').decode('utf-8')
print("\n== styles.xml (len %d) — resumen ==" % len(st))
# fonts
fonts = re.findall(r'<font>.*?</font>|<font/>', st, re.S)
print(f"fonts: {len(fonts)}")
for i, f in enumerate(fonts[:14]):
    print(f"  [{i}] {f[:200]}")
fills = re.findall(r'<fill>.*?</fill>', st, re.S)
print(f"fills: {len(fills)}")
for i, f in enumerate(fills[:10]):
    print(f"  [{i}] {f[:160]}")
borders = re.findall(r'<border[^>]*>.*?</border>|<border[^>]*/>', st, re.S)
print(f"borders: {len(borders)}")
for i, b in enumerate(borders[:12]):
    print(f"  [{i}] {b[:260]}")
m = re.search(r'<cellXfs count="(\d+)">(.*?)</cellXfs>', st, re.S)
print(f"cellXfs count={m.group(1)}")
xfs = re.findall(r'<xf [^>]*?(?:/>|>.*?</xf>)', m.group(2), re.S)
for i, x in enumerate(xfs[:20]):
    print(f"  xf[{i}] {x[:220]}")
print(f"  ... total {len(xfs)}")
# numFmts
nf = re.findall(r'<numFmt [^>]*/>', st)
print("numFmts:", nf[:8])

# sheet1: cuántas celdas con s=, ejemplo
sh = z.read('xl/worksheets/sheet1.xml').decode('utf-8')
cells = re.findall(r'<c r="([A-Z]+\d+)"[^>]*?/>|<c r="([A-Z]+\d+)"[^>]*?>.*?</c>', sh, re.S)
print(f"\n== sheet1.xml: {len(cells)} celdas")
withs = re.findall(r'<c r="([A-Z]+\d+)" s="(\d+)"', sh)
print(f"celdas con s=: {len(withs)}; ejemplos: {withs[:14]}")
# ¿celdas D2/D3/E4 con s?
for addr in ['D2','D3','E4','F31','H31','Q6','AT2']:
    mm = re.search(r'<c r="%s"[^>]*' % addr, sh)
    print(f"  {addr}: {mm.group(0)[:120] if mm else 'NO EXISTE'}")
# mergeCells
mc = re.findall(r'<mergeCell ref="[^"]+"/>', sh)
print(f"mergeCells en sheet: {len(mc)}")

# drawing1
dr = z.read('xl/drawings/drawing1.xml').decode('utf-8')
print("\n== drawing1.xml ==")
print(dr[:1500])
# drawing rels
try:
    print("\n== drawing rels ==")
    print(z.read('xl/drawings/_rels/drawing1.xml.rels').decode('utf-8')[:600])
except KeyError:
    print("sin rels")
# sheet rels
print("\n== sheet1 rels ==")
print(z.read('xl/worksheets/_rels/sheet1.xml.rels').decode('utf-8')[:600])
# content types
print("\n== [Content_Types].xml ==")
print(z.read('[Content_Types].xml').decode('utf-8')[:1200])
# theme colors
try:
    th = z.read('xl/theme/theme1.xml').decode('utf-8')
    cl = re.search(r'<a:clrScheme.*?</a:clrScheme>', th, re.S)
    cols = re.findall(r'<a:(\w+)>\s*<a:(?:srgbClr val="([0-9A-Fa-f]{6})"|sysClr val="(\w+)" lastClr="([0-9A-Fa-f]{6})")', cl.group(0))
    print("\n== theme clrScheme ==")
    for name, srgb, sys, last in cols:
        print(f"  {name}: {srgb or last}{' (sys '+sys+')' if sys else ''}")
except KeyError:
    print("sin theme")
# workbook.xml sheets + rels
print("\n== workbook.xml sheets ==")
wbx = z.read('xl/workbook.xml').decode('utf-8')
print(re.findall(r'<sheet [^>]*/>', wbx))
print(z.read('xl/_rels/workbook.xml.rels').decode('utf-8')[:800])
