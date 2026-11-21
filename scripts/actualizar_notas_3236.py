#!/usr/bin/env python3
"""Actualiza el cuerpo del release v3.2.36 en GitHub con las notas
corregidas (regla del usuario: dos correos con el mismo archivo → gana
el más reciente; esperado 21/11 10:34 UTC; 17/17)."""
import json
import os
import urllib.request

TOKEN = os.environ.get('GHREL_TOKEN', '')
REPO = 'marcoskoo/pdfpro'
TAG = 'v3.2.36'
NOTAS = '/home/z/my-project/download/release-notes-v3.2.36.md'
HDRS = {
    'Authorization': f'token {TOKEN}',
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'pdfpro-release-updater'
}


def api(url, datos=None, metodo='GET'):
    peticion = urllib.request.Request(
        url,
        data=json.dumps(datos).encode() if datos else None,
        headers=HDRS,
        method=metodo
    )
    with urllib.request.urlopen(peticion) as r:
        cuerpo = r.read()
        return r.status, json.loads(cuerpo) if cuerpo else {}


# 1) id del release por el tag
estado, rel = api(f'https://api.github.com/repos/{REPO}/releases/tags/{TAG}')
assert estado == 200, f'release no encontrado: HTTP {estado}'
rid = rel['id']

# 2) parchear el cuerpo con las notas actualizadas
cuerpo = open(NOTAS, encoding='utf-8').read()
estado2, resp = api(
    f'https://api.github.com/repos/{REPO}/releases/{rid}',
    {'body': cuerpo, 'tag_name': TAG, 'name': rel['name']},
    'PATCH'
)
assert estado2 == 200, f'fallo el parche: HTTP {estado2}'
print(f'✓ cuerpo del release {TAG} actualizado ({len(cuerpo)} caracteres)')
