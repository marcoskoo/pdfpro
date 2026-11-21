#!/usr/bin/env python3
"""Configura Vercel para PDFPro v3.1.4 (token por VERCEL_TOKEN, nunca se imprime):
1) firma-aissphi: rootDirectory='web' (arregla los deploys de Git del futuro)
2) licencias-firmas: conectar Git (mismo repo, web/) para que también auto-despliegue
3) dominio alternativo firma-aisphi.vercel.app (la otra grafía, la del error original)
4) prepara el staging del despliegue (web/ + vercel.json con rutas /pdfpro/)
"""
import json, os, shutil, sys, urllib.request, urllib.error

T = os.environ.get('VERCEL_TOKEN')
if not T:
    print('✗ falta VERCEL_TOKEN'); sys.exit(1)
API = 'https://api.vercel.com'
H = {'Authorization': f'Bearer {T}', 'User-Agent': 'pdfpro-setup', 'Content-Type': 'application/json'}

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method, headers=H)
    try:
        with urllib.request.urlopen(r, timeout=60) as x:
            return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]

ok = True
def step(name, cond, detail=''):
    global ok
    print(('✓ ' if cond else '✗ ') + name + ((' — ' + detail) if detail else ''))
    if not cond: ok = False

# ── 1) objetos completos de ambos proyectos ──
s, f = req('GET', '/v9/projects/firma-aissphi')
step('GET firma-aissphi', s == 200, f if s != 200 else '')
fid, facc = f['id'], f['accountId']
flink = f.get('link') or {}
print(f"   id={fid[:16]}… cuenta={facc[:16]}… repoId={flink.get('repoId')} rootDir actual: {f.get('rootDirectory') or '(raíz)'}")

s, l = req('GET', '/v9/projects/licencias-firmas')
step('GET licencias-firmas', s == 200, l if s != 200 else '')
lid, lacc = l['id'], l['accountId']
print(f"   id={lid[:16]}… cuenta={lacc[:16]}… rootDir actual: {l.get('rootDirectory') or '(raíz)'}")

# ── 2) firma-aissphi: construir desde web/ ──
s, r = req('PATCH', '/v9/projects/firma-aissphi', {'rootDirectory': 'web'})
step('firma-aissphi → Root Directory = web', s == 200 and r.get('rootDirectory') == 'web',
     (r.get('rootDirectory') if s == 200 else str(r)))

# ── 3) licencias-firmas: conectar Git (mismo repo) + web/ ──
if flink.get('type') == 'github':
    body = {'rootDirectory': 'web',
            'link': {'type': 'github', 'org': flink.get('org'), 'repo': flink.get('repo'),
                     'repoId': flink.get('repoId'), 'productionBranch': 'main'}}
    s, r = req('PATCH', '/v9/projects/licencias-firmas', body)
    step('licencias-firmas → Git conectado (marcoskoo/pdfpro, web/, main)', s == 200,
         ('rootDir=' + str(r.get('rootDirectory')) + ' link=' + str((r.get('link') or {}).get('repo'))) if s == 200 else str(r))
else:
    step('licencias-firmas → Git conectado', False, 'sin link de referencia en firma-aissphi')

# ── 4) dominio alternativo (otra grafía) en firma-aissphi ──
s, r = req('POST', '/v9/projects/firma-aissphi/domains', {'name': 'firma-aisphi.vercel.app'})
step("dominio firma-aisphi.vercel.app (grafía del error original) agregado",
     s == 200 or 'already' in str(r).lower() or 'exist' in str(r).lower(), str(r)[:120] if s != 200 else '')

# ── 5) staging del despliegue: web/ + vercel.json con /pdfpro/ ──
STG = '/home/z/my-project/scripts/deploy_staging'
shutil.rmtree(STG, ignore_errors=True)
shutil.copytree('/home/z/my-project/web', STG)
vc = json.load(open(os.path.join(STG, 'vercel.json'), encoding='utf-8'))
vc['rewrites'] = [
    {'source': '/oauth/gmail-callback', 'destination': '/oauth/gmail-callback.html'},
    {'source': '/pdfpro/:path*', 'destination': '/:path*'},
    {'source': '/pdfpro', 'destination': '/index.html'},
]
json.dump(vc, open(os.path.join(STG, 'vercel.json'), 'w', encoding='utf-8'), indent=2)
# .vercel/project.json para el CLI (por proyecto — lo escribe el bucle de despliegue)
os.makedirs(os.path.join(STG, '.vercel'), exist_ok=True)
json.dump({'orgId': facc, 'projectId': fid}, open(os.path.join(STG, '.vercel/project.json'), 'w'))
json.dump({'orgId': lacc, 'projectId': lid}, open('/tmp/proj_licencias.json', 'w'))
print(f"✓ staging listo en {STG} ({sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fs in os.walk(STG) for f in fs)/1048576:.1f} MB)")
print('CONFIG ' + ('OK' if ok else 'CON ERRORES'))
sys.exit(0 if ok else 1)
