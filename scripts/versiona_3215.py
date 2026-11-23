# v3.2.15 — fin del aviso en bucle «No se completó el inicio de sesión de
# Gmail»: (1) candado por sesión en el proceso principal — tras UN login
# cancelado, las búsquedas automáticas no vuelven a abrir la ventana (antes
# el cooldown era de 30 s y cada PDF cargado la reabría); solo el botón
# «🔗 Iniciar sesión en Gmail» la abre; (2) el PORQUÉ (ventana cerrada,
# tiempo agotado, no se pudo cargar) llega al aviso; (3) la ventana queda
# siempre visible (alwaysOnTop, no se esconde tras otras ventanas);
# (4) con Google/OAuth ya conectado NO se abre la ventana del buscador
# (la API es la vía autorizada; el correo aún no llegó y la re-búsqueda lo
# encontrará); (5) el aviso sale UNA vez por sesión.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.14', 'CORPAC AIS/ARO Platform v3.2.15')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.14"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.14» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.14"', '"version": "3.2.15"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.14 - Compilar', 'PDFPro v3.2.15 - Compilar')
s = s.replace('PDFPro-Setup-3.2.14.exe', 'PDFPro-Setup-3.2.15.exe').replace('PDFPro-Portable-3.2.14.exe', 'PDFPro-Portable-3.2.15.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.14 (búsqueda en el ORDEN correcto)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.15 (fin del aviso en bucle del inicio de sesión)
────────────────────────────────────────────────────────────────────
  1. El aviso «No se completó el inicio de sesión en Gmail» ya no
     sale en bucle: si cierras la ventana de inicio de sesión, la
     app NO la vuelve a abrir sola (antes se reabría cada 30 s con
     cada PDF cargado). Se abre solo cuando TÚ lo pidas con el botón
     «🔗 Iniciar sesión en Gmail».
  2. El aviso ahora dice el MOTIVO real: «ventana cerrada», «tiempo
     agotado» o «no se pudo cargar Gmail» — antes no decía nada y no
     se podía saber qué pasó.
  3. La ventana de inicio de sesión ya no puede quedar escondida
     detrás de otras ventanas (siempre queda a la vista).
  4. Si ya conectaste Google («Conectar Gmail» o el botón «🔗»), la
     ventana del buscador NO se abre nunca: la búsqueda por Google es
     la vía autorizada y se re-intenta sola hasta que el correo
     llegue.

NOVEDADES DE LA VERSIÓN 3.2.14 (búsqueda en el ORDEN correcto)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.15 + LEEME')
