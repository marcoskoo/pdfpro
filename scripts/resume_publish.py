#!/usr/bin/env python3
"""Reanuda la subida de assets de un release ya creado (v3.2.28/v3.2.29).
Uso: GHREL_TOKEN=... python3 scripts/resume_publish.py 3228
Sube solo los assets que falten (por nombre); si falla, imprime el cuerpo
de la respuesta de GitHub para diagnóstico."""
import json, os, sys, time, urllib.request, urllib.error

ver = sys.argv[1] if len(sys.argv) > 1 else ''
if ver not in ('3228', '3229'):
    print('uso: resume_publish.py 3228|3229'); sys.exit(2)
V = f'3.2.{ver[2:]}'            # 3228 -> 3.2.28
TAG = f'v{V}'                   # 3.2.28 -> v3.2.28

TOKEN = os.environ.get('GHREL_TOKEN')
if not TOKEN:
    print('✗ falta GHREL_TOKEN'); sys.exit(1)
OWNER, REPO = 'marcoskoo', 'pdfpro'
API = f'https://api.github.com/repos/{OWNER}/{REPO}'
H = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'pdfpro-release'}

def req(url, data=None, method=None, headers=None, expect=(200, 201, 204)):
    h = dict(H); h.update(headers or {})
    r = urllib.request.Request(url, data=data, method=method or ('POST' if data is not None else 'GET'), headers=h)
    try:
        with urllib.request.urlopen(r, timeout=900) as resp:
            body = resp.read()
            if resp.status not in expect:
                raise RuntimeError(f'HTTP {resp.status}: {body[:400]}')
            return body
    except urllib.error.HTTPError as e:
        print(f'✗ HTTP {e.code}: {e.read()[:400].decode("utf-8", "replace")}')
        raise

rel = json.loads(req(API + f'/releases/tags/{TAG}'))
rid = rel['id']
print(f'✓ release {TAG}: {rel["html_url"]} (draft={rel["draft"]})')
have = {a['name'] for a in json.loads(req(API + f'/releases/{rid}/assets'))}
print(f'  · assets ya presentes: {sorted(have) if have else "ninguno"}')

assets = ([
    ('download/PDFPro-Setup-3.2.28.exe', 'PDFPro-Setup-3.2.28.exe', 'application/octet-stream'),
    ('download/PDFPro-Setup-3.2.28.exe.blockmap', 'PDFPro-Setup-3.2.28.exe.blockmap', 'application/octet-stream'),
    ('download/latest-v3.2.28.yml', 'latest.yml', 'text/yaml'),
    ('download/PDFPro-Portable-3.2.28.exe', 'PDFPro-Portable-3.2.28.exe', 'application/octet-stream'),
    ('download/PDFPro-3.2.28-SHA256.txt', 'PDFPro-3.2.28-SHA256.txt', 'text/plain'),
] if ver == '3228' else [
    ('dist/PDFPro-Setup-3.2.29.exe', 'PDFPro-Setup-3.2.29.exe', 'application/octet-stream'),
    ('dist/PDFPro-Setup-3.2.29.exe.blockmap', 'PDFPro-Setup-3.2.29.exe.blockmap', 'application/octet-stream'),
    ('dist/latest.yml', 'latest.yml', 'text/yaml'),
    ('dist/PDFPro-Portable-3.2.29.exe', 'PDFPro-Portable-3.2.29.exe', 'application/octet-stream'),
    ('download/PDFPro-3.2.29-SHA256.txt', 'PDFPro-3.2.29-SHA256.txt', 'text/plain'),
])

os.chdir('/home/z/my-project')
pend = [(p, n, c) for p, n, c in assets if n not in have]
print(f'  · faltan: {[n for _, n, _ in pend] if pend else "nada — release completo"}')
for intento in range(1, 4):
    quedan = [(p, n, c) for p, n, c in pend if n not in have]
    if not quedan:
        break
    for path, name, ctype in quedan:
        try:
            size = os.path.getsize(path)
            t0 = time.time()
            data = open(path, 'rb').read()
            up = req(f'https://uploads.github.com/repos/{OWNER}/{REPO}/releases/{rid}/assets?name={name}',
                     data=data, headers={'Content-Type': ctype})
            st = json.loads(up)['state']
            have.add(name)
            print(f'✓ {name} · {size/1048576:.1f} MB · {st} · {time.time()-t0:.0f}s')
        except Exception as e:
            print(f'✗ reintento {intento} · {name}: {e}')
            time.sleep(3)

final = {a['name'] for a in json.loads(req(API + f'/releases/{rid}/assets'))}
print(f'ASSETS FINALES {TAG}: {sorted(final)}')
sys.exit(0 if all(n in final for _, n, _ in assets) else 1)
