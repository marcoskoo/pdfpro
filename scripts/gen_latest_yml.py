#!/usr/bin/env python3
"""Genera dist/latest.yml para la auto-actualización (electron-updater)
del release v2.9.21, con el sha512 real del instalador NSIS."""
import base64, hashlib, datetime, os

DIST = '/home/z/my-project/pdfpro-desktop/dist'
exe = os.path.join(DIST, 'PDFPro-Setup-2.9.21.exe')
data = open(exe, 'rb').read()
sha = base64.b64encode(hashlib.sha512(data).digest()).decode()
size = len(data)
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

yml = (f"version: 2.9.21\n"
       f"files:\n"
       f"  - url: PDFPro-Setup-2.9.21.exe\n"
       f"    sha512: {sha}\n"
       f"    size: {size}\n"
       f"path: PDFPro-Setup-2.9.21.exe\n"
       f"sha512: {sha}\n"
       f"releaseDate: '{now}'\n")
out = os.path.join(DIST, 'latest.yml')
open(out, 'w').write(yml)
print(yml)
print('OK →', out)
