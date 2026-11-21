#!/usr/bin/env python3
"""Inspección de la cuenta Vercel: usuario, proyectos, links de Git,
últimos despliegues. El token llega por VERCEL_TOKEN (nunca se imprime)."""
import json, os, sys, urllib.request, urllib.error

T = os.environ.get('VERCEL_TOKEN')
if not T:
    print('✗ falta VERCEL_TOKEN'); sys.exit(1)
H = {'Authorization': f'Bearer {T}', 'User-Agent': 'pdfpro-inspect'}

def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=60) as x:
            return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

print('═══ usuario / equipos ═══')
s, u = get('https://api.vercel.com/v2/user')
if s == 200:
    print(f"user: {u.get('user', {}).get('username')} · id: {u.get('user', {}).get('id')[:12]}…")
else:
    print('✗ /v2/user:', s, u); sys.exit(1)
s, teams = get('https://api.vercel.com/v2/teams?limit=100')
if s == 200:
    for t in teams.get('teams', []):
        print(f"team: {t.get('slug')} · id: {t.get('id')[:12]}…")

print('\n═══ proyectos ═══')
s, data = get('https://api.vercel.com/v9/projects?limit=100')
if s != 200:
    print('✗ /v9/projects:', s, data); sys.exit(1)
for p in data.get('projects', []):
    link = p.get('link') or {}
    git = f"git:{link.get('type')}/{link.get('org','')}/{link.get('repo','?')}" if link.get('type') else 'git:SIN CONECTAR'
    prod = (p.get('targets') or {}).get('production') or {}
    prod_url = (prod.get('alias') or ['—'])[0] if isinstance(prod.get('alias'), list) else '—'
    state = prod.get('readyState', '—')
    print(f"· {p['name']}")
    print(f"    id: {p['id'][:14]}… · cuenta: {(p.get('accountId') or '?')[:12]}… · framework: {p.get('framework')} · rootDir: {p.get('rootDirectory') or '(raíz)'}")
    print(f"    {git} · rama prod: {link.get('productionBranch') or '(default)'}")
    print(f"    deploy prod: {state} · alias: {prod_url} · creado: {str(p.get('createdAt'))[:19]}")
    doms = [d.get('name') for d in (p.get('domains') or [])]
    if doms: print(f"    dominios: {', '.join(doms)}")
print(f"\ntotal: {len(data.get('projects', []))} proyectos")
