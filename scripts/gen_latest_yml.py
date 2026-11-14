#!/usr/bin/env python3
"""Genera dist/latest.yml para la auto-actualización (electron-updater),
con el sha512 real del instalador NSIS. La versión se lee de package.json."""
import base64, hashlib, datetime, json, os, re

PKG = '/home/z/my-project/pdfpro-desktop/package.json'
DIST = '/home/z/my-project/pdfpro-desktop/dist'
ver = json.load(open(PKG))['version']
exe = os.path.join(DIST, f'PDFPro-Setup-{ver}.exe')
assert os.path.exists(exe), 'falta ' + exe
assert re.match(r'^\d+\.\d+\.\d+$', ver), 'versión rara: ' + ver

data = open(exe, 'rb').read()
sha = base64.b64encode(hashlib.sha512(data).digest()).decode()
size = len(data)
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

yml = (f"version: {ver}\n"
       f"files:\n"
       f"  - url: PDFPro-Setup-{ver}.exe\n"
       f"    sha512: {sha}\n"
       f"    size: {size}\n"
       f"path: PDFPro-Setup-{ver}.exe\n"
       f"sha512: {sha}\n"
       f"releaseDate: '{now}'\n")
out = os.path.join(DIST, 'latest.yml')
open(out, 'w').write(yml)
print(yml)
print('OK →', out)
