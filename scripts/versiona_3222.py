# v3.2.22 — LOGIN VISIBLE EN CHROME REAL. Las capturas del usuario
# probaron que (a) corre v3.2.21 (el aviso honesto del OAuth apareció)
# pero la sesión previa del almacén estaba VACÍA y (b) la ventana de
# Gmail con su buzón es su Chrome normal — la app no puede ver esa
# sesión. La ventana de login de Electron moría en <2 s antes de poder
# usarse. Ahora el login ocurre en una VENTANA DE CHROME/EDGE REAL con
# el MISMO perfil persistente del buscador invisible: una sola vez, sin
# transferir cookies, y la sesión sobrevive a reinicios.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.21', 'CORPAC AIS/ARO Platform v3.2.22')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.21"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.21» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.21"', '"version": "3.2.22"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.21 - Compilar', 'PDFPro v3.2.22 - Compilar')
s = s.replace('PDFPro-Setup-3.2.21.exe', 'PDFPro-Setup-3.2.22.exe').replace('PDFPro-Portable-3.2.21.exe', 'PDFPro-Portable-3.2.22.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.21 (el botón «Conectar Gmail» ya no abre una ventana rota)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.22 (inicio de sesión en una ventana de Chrome real)
────────────────────────────────────────────────────────────────────
  1. Sus capturas revelaron la causa raíz de una vez: la ventana de
     Gmail con su buzón que veía era SU Chrome normal — la app no
     puede usar esa sesión. La ventana de login interna de la app se
     cerraba sola en menos de 2 segundos (algo en el equipo la mataba)
     y el acceso nunca se completaba.
  2. Ahora, cuando Gmail pide sesión, la app abre una VENTANA DE
     CHROME/EDGE REAL (del sistema) con el perfil propio del buscador:
     inicie sesión ahí UNA sola vez. La sesión queda guardada en ese
     perfil — no se transfiere ninguna cookie y sobrevive a reinicios
     de la app: los siguientes PDF buscan la hora solos, sin ventanas.
  3. La ventana interna de la app queda solo como respaldo si la
     ventana real no puede abrirse.

NOVEDADES DE LA VERSIÓN 3.2.21 (el botón «Conectar Gmail» ya no abre una ventana rota)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.22 + LEEME')
