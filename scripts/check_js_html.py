#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrae los <script> inline del HTML y los valida con node --check.
Uso: python3 scripts/check_js_html.py [ruta-al-html]"""
import re, subprocess, sys, os

HTML = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/pdfpro-desktop/src/app/index.html'
html = open(HTML, encoding='utf-8').read()

blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S | re.I)
print('bloques inline:', len(blocks))
os.makedirs('/tmp/jscheck', exist_ok=True)
ok = True
for i, b in enumerate(blocks):
    if not b.strip():
        continue
    p = '/tmp/jscheck/bloque_%02d.js' % i
    open(p, 'w', encoding='utf-8').write(b)
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    status = 'OK' if r.returncode == 0 else 'ERROR'
    print('bloque %02d: %d líneas → %s' % (i, b.count('\n') + 1, status))
    if r.returncode != 0:
        ok = False
        print(r.stderr[:600])
sys.exit(0 if ok else 1)
