#!/usr/bin/env python3
"""Verificación previa a publicar los releases v3.2.28 y v3.2.29.
El token llega por GHREL_TOKEN (nunca se imprime). Comprueba:
  1) token válido (login)   2) permiso push sobre el repo
  3) releases/borradores existentes de v3.2.28/v3.2.29
  4) artefactos presentes en disco para ambos scripts de publicación"""
import json, os, sys, urllib.request

TOKEN = os.environ.get('GHREL_TOKEN')
if not TOKEN:
    print('✗ falta GHREL_TOKEN'); sys.exit(1)
OWNER, REPO = 'marcoskoo', 'pdfpro'
H = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'pdfpro-release'}
ok = True

def get(url):
    r = urllib.request.Request(url, headers=H)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, None

# 1) token
st, user = get('https://api.github.com/user')
print(f"{'  OK  ' if st == 200 else ' FALLA'} · token válido (login: {user.get('login') if user else '?'})")
ok &= st == 200

# 2) permiso push sobre el repo
st, repo = get(f'https://api.github.com/repos/{OWNER}/{REPO}')
if st == 200:
    push = repo.get('permissions', {}).get('push', False)
    print(f"{'  OK  ' if push else ' FALLA'} · permiso push sobre {OWNER}/{REPO} (privado={repo.get('private')})")
    ok &= push
else:
    print(f' FALLA · repo HTTP {st}'); ok = False

# 3) releases existentes (incluye borradores, visibles con token)
st, rels = get(f'https://api.github.com/repos/{OWNER}/{REPO}/releases?per_page=100')
if st == 200:
    for tag in ('v3.2.28', 'v3.2.29'):
        m = [r for r in rels if r['tag_name'] == tag]
        if not m:
            print(f'  --  · no existe release de {tag} (se creará)')
        else:
            r = m[0]
            print(f'  !!  · {tag} ya existe: {"BORRADOR" if r["draft"] else "publicado"} · {r["html_url"]} · {len(r["assets"])} assets')
else:
    print(f' FALLA · listar releases HTTP {st}'); ok = False

# 4) artefactos
FILES = [
    'download/PDFPro-Setup-3.2.28.exe', 'download/PDFPro-Setup-3.2.28.exe.blockmap',
    'download/latest-v3.2.28.yml', 'download/PDFPro-Portable-3.2.28.exe', 'download/PDFPro-3.2.28-SHA256.txt',
    'dist/PDFPro-Setup-3.2.29.exe', 'dist/PDFPro-Setup-3.2.29.exe.blockmap',
    'dist/latest.yml', 'dist/PDFPro-Portable-3.2.29.exe', 'download/PDFPro-3.2.29-SHA256.txt',
    'download/release-notes-v3.2.28.md', 'download/release-notes-v3.2.29.md',
]
os.chdir('/home/z/my-project')
for f in FILES:
    e = os.path.isfile(f) and os.path.getsize(f) > 0
    print(f"{'  OK  ' if e else ' FALLA'} · {f} ({os.path.getsize(f)/1048576:.1f} MB)" if e else f' FALLA · {f} AUSENTE')
    ok &= e

print('PRE-PUBLISH: ' + ('TODO OK' if ok else 'HAY FALLOS'))
sys.exit(0 if ok else 1)
