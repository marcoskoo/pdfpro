# v3.2.9 — quita el panel «📧 Monitoreo Gmail» (título, estado Sin conectar,
# Conectar Gmail/Desconectar, 🔄 Barrer ahora y lista de correos), pedido del
# usuario. La búsqueda de la hora sigue 100 % automática al cargar el
# documento; el inicio de sesión pasa por el botón «🔗 Iniciar sesión en
# Gmail» (web → OAuth; escritorio → Gmail dentro de la app) y la caja del
# código OAuth se reubica oculta junto a ese botón. Tras conectar OAuth se
# rebusca sola la hora del archivo cargado.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.8', 'CORPAC AIS/ARO Platform v3.2.9')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.8"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.8» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.8"', '"version": "3.2.9"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.8 - Compilar', 'PDFPro v3.2.9 - Compilar')
s = s.replace('PDFPro-Setup-3.2.8.exe', 'PDFPro-Setup-3.2.9.exe').replace('PDFPro-Portable-3.2.8.exe', 'PDFPro-Portable-3.2.9.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = """  PDFPro Suite 3.2.8 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════
"""
new = """  PDFPro Suite 3.2.9 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════

NOVEDADES DE LA VERSIÓN 3.2.9 (interfaz más limpia)
────────────────────────────────────────────────────────────────────
  1. Se retiró el panel «📧 Monitoreo Gmail» de la ficha del sello
     (estado «Sin conectar», botones «Conectar Gmail» / «Desconectar»,
     «🔄 Barrer ahora (últimos 7 días)» y la lista de correos) —
     pedido del usuario. Todo lo demás sigue igual.
  2. La búsqueda de la hora de recepción del correo sigue siendo
     100 % automática al cargar el documento (por el nombre del
     archivo adjunto, +5 h → UTC), igual que antes.
  3. El inicio de sesión pasa por el botón «🔗 Iniciar sesión en
     Gmail y buscar la hora» (junto a Hora Recepción): en el
     escritorio abre Gmail dentro de la app, como siempre; en la web
     inicia la conexión de Google. Tras conectar se vuelve a buscar
     sola la hora del archivo cargado.
  4. La caja para pegar el código de Google (si el flujo lo pide)
     vive ahora junto a ese botón, oculta; solo aparece cuando una
     conexión la necesita.
"""
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.9 + LEEME')
