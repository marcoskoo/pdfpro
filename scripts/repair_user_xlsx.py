#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Repara el XLSX exportado por el usuario (v2.9.4): restaura D2/D3/E4/K6
con las celdas exactas del original, parcheando el XML sin tocar el resto."""
import re, shutil, zipfile

SRC  = "/home/z/my-project/upload/ATC CM468  11NOV (1) (1).xlsx"
DST  = "/home/z/my-project/download/ATC CM468 11NOV - REPARADO.xlsx"

# celdas originales (del original ATC CM468  11NOV.xlsx, sheet1.xml)
ORIG_CELLS = {
    'D2': '<c r="D2" s="113" t="s"><v>0</v></c>',
    'D3': '<c r="D3" s="116" t="s"><v>1</v></c>',
    'E4': '<c r="E4" s="7" t="s"><v>2</v></c>',
    'K6': '<c r="K6" s="1"/>',
}

zin = zipfile.ZipFile(SRC)
xml = zin.read('xl/worksheets/sheet1.xml').decode('utf-8')

n = 0
for ref, good in ORIG_CELLS.items():
    # reemplaza la celda inlineStr corrompida (o cualquiera que exista) por la original
    pat = re.compile(r'<c r="' + ref + r'"(?=[ />])[^>]*?(?:/>|>[\s\S]*?</c>)')
    m = pat.search(xml)
    if not m:
        print('AVISO: no se encontró', ref)
        continue
    xml = xml[:m.start()] + good + xml[m.end():]
    n += 1
print('celdas restauradas:', n)

with zipfile.ZipFile(DST, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'xl/worksheets/sheet1.xml':
            data = xml.encode('utf-8')
        zout.writestr(item, data)
zin.close()
print('OK ->', DST)

# ── verificación ──
import openpyxl
wb = openpyxl.load_workbook(DST)
ws = wb[wb.sheetnames[0]]
print('D2:', repr(ws['D2'].value))
print('D3:', repr(str(ws['D3'].value))[:60])
print('E4:', ws['E4'].value)
print('K6:', ws['K6'].value)
print('merges:', len(ws.merged_cells.ranges), '| imgs:', len(ws._images))

wo = openpyxl.load_workbook("/home/z/my-project/upload/ATC CM468  11NOV.xlsx")
so = wo[wo.sheetnames[0]]
diffs = 0
for r in range(1, 84):
    for c in range(1, 56):
        if so.cell(row=r, column=c).value != ws.cell(row=r, column=c).value:
            diffs += 1
            print('DIF residuo:', r, c)
print('diferencias restantes vs original:', diffs)
