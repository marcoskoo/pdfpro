# Comprueba la sintaxis de TODOS los bloques <script> embebidos de
# web/index.html con node --check (los bloques con src= o tipo no-JS se
# saltan). Sale con código 1 si algún bloque falla.
import re, subprocess, sys, tempfile, os

HTML = '/home/z/my-project/web/index.html'
html = open(HTML, encoding='utf-8').read()

bloques = re.findall(r'<script([^>]*)>(.*?)</script>', html, re.S | re.I)
ok = True
revisados = 0
for i, (attrs, cuerpo) in enumerate(bloques):
    if not cuerpo.strip():
        continue
    if r'\bsrc=' in attrs or 'application/json' in attrs or 'ld+json' in attrs:
        continue
    revisados += 1
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(cuerpo)
        ruta = f.name
    r = subprocess.run(['node', '--check', ruta], capture_output=True, text=True)
    os.unlink(ruta)
    if r.returncode != 0:
        ok = False
        print('BLOQUE %d: ERROR DE SINTAXIS' % i)
        print(r.stderr[:3000])
    else:
        print('BLOQUE %d: OK (%d caracteres)' % (i, len(cuerpo)))
print('--- %d bloque(s) revisado(s), %s' % (revisados, 'TODO OK' if ok else 'CON ERRORES'))
sys.exit(0 if ok else 1)
