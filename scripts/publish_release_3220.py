#!/usr/bin/env python3
"""Publica el Release v3.2.20 en GitHub (API REST) y sube los artefactos.
El token llega por la variable de entorno GHREL_TOKEN (nunca se imprime)."""
import json, os, sys, time, urllib.request, urllib.error

TOKEN = os.environ.get('GHREL_TOKEN')
if not TOKEN:
    print('✗ falta GHREL_TOKEN'); sys.exit(1)
OWNER, REPO = 'marcoskoo', 'pdfpro'
API = f'https://api.github.com/repos/{OWNER}/{REPO}'
HDRS = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'pdfpro-release'}

def req(url, data=None, method=None, headers=None, expect=(200, 201, 204)):
    h = dict(HDRS); h.update(headers or {})
    r = urllib.request.Request(url, data=data, method=method or ('POST' if data is not None else 'GET'), headers=h)
    with urllib.request.urlopen(r, timeout=900) as resp:
        body = resp.read()
        if resp.status not in expect:
            raise RuntimeError(f'HTTP {resp.status}: {body[:300]}')
        return body

# 1) crear el release (el tag v3.2.15 ya existe en el repo, empujado con git;
#    crearlo vía API daba 422 «tag_name is not a valid tag»)
notes = open('/tmp/release_notes_3220.md', encoding='utf-8').read()
payload = json.dumps({
    'tag_name': 'v3.2.20',
    'name': 'PDFPro Suite 3.2.20 — CORPAC AIS/ARO SPHI',
    'body': notes, 'draft': False, 'prerelease': False
}).encode()
try:
    rel = json.loads(req(API + '/releases', data=payload, headers={'Content-Type': 'application/json'}))
    print(f"✓ release creado: {rel['html_url']}")
except urllib.error.HTTPError as e:
    if e.code != 422: raise
    rel = json.loads(req(API + '/releases/tags/v3.2.15'))
    print(f"✓ release existente reutilizado: {rel['html_url']}")
rid = rel['id']

# reemplazar assets si ya existieran (re-publicación)
for a in json.loads(req(API + f'/releases/{rid}/assets')):
    req(API + f'/releases/assets/{a["id"]}', method='DELETE', expect=(204,))
    print(f"  · asset previo eliminado: {a['name']}")

# 2) subir artefactos
assets = [
    ('/home/z/my-project/dist/PDFPro-Setup-3.2.20.exe', 'application/octet-stream'),
    ('/home/z/my-project/dist/PDFPro-Setup-3.2.20.exe.blockmap', 'application/octet-stream'),
    ('/home/z/my-project/dist/latest.yml', 'text/yaml'),
    ('/home/z/my-project/dist/PDFPro-Portable-3.2.20.exe', 'application/octet-stream'),
    ('/home/z/my-project/download/PDFPro-3.2.20-SHA256.txt', 'text/plain'),
]
for path, ctype in assets:
    name = os.path.basename(path)
    size = os.path.getsize(path)
    t0 = time.time()
    data = open(path, 'rb').read()
    up = req(f'https://uploads.github.com/repos/{OWNER}/{REPO}/releases/{rid}/assets?name={name}',
             data=data, headers={'Content-Type': ctype})
    st = json.loads(up)['state']
    print(f"✓ {name} · {size/1048576:.1f} MB · {st} · {time.time()-t0:.0f}s")

print('✓ RELEASE v3.2.20 PUBLICADO')
