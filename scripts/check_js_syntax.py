#!/usr/bin/env python3
"""Extrae los <script> inline de index.html y valida su sintaxis con node --check."""
import re, subprocess, sys, tempfile, os

HTML = '/home/z/my-project/public/pdfpro/index.html'
html = open(HTML, encoding='utf-8').read()
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S | re.I)
print(f'{len(blocks)} bloques <script> inline')
fail = 0
for i, code in enumerate(blocks):
    if not code.strip():
        continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(code)
        path = f.name
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    if r.returncode != 0:
        fail += 1
        print(f'--- BLOQUE {i}: ERROR ---')
        print(r.stderr[:1500])
    os.unlink(path)
print('SINTAXIS OK' if fail == 0 else f'{fail} bloque(s) con error')
sys.exit(1 if fail else 0)
