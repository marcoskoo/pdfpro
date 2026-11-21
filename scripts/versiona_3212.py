# v3.2.12 — RESTAURA el panel «📧 Monitoreo Gmail» en la ficha del sello
# (pedido del usuario: «se ha perdido funciones»). Al retirar el panel en
# v3.2.9 las funciones de conexión/estado/lista (gmailConnect, gmailDisconnect,
# gmailRenderState, gmailBarrer, gmailRenderList) quedaron inalcanzables —
# código muerto sin su HTML. Se restauran los elementos (título, dot, estado,
# Conectar Gmail, Desconectar, Barrer ahora 7 días, lista de correos) SIN
# duplicar la caja del código OAuth ni el botón «🔗 Iniciar sesión» (v3.2.9+).
# Las correcciones de captura v3.2.10/v3.2.11 siguen intactas.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.11', 'CORPAC AIS/ARO Platform v3.2.12')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.11"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.11» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.11"', '"version": "3.2.12"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.11 - Compilar', 'PDFPro v3.2.12 - Compilar')
s = s.replace('PDFPro-Setup-3.2.11.exe', 'PDFPro-Setup-3.2.12.exe').replace('PDFPro-Portable-3.2.11.exe', 'PDFPro-Portable-3.2.12.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.11 (captura de la hora: causa raíz corregida)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.12 (panel de Gmail restaurado)
────────────────────────────────────────────────────────────────────
  1. VUELVE el panel «📧 Monitoreo Gmail» a la ficha del sello:
     estado de la conexión (punto de color + texto), botones
     «Conectar Gmail» / «Desconectar», «🔄 Barrer ahora (últimos
     7 días)» y la lista de correos con adjunto. Se había retirado
     en la 3.2.9 y con él se perdieron las funciones visibles de
     conexión — sin ellas no había forma de ver si Gmail estaba
     conectado ni de conectarlo a mano.
  2. La captura de la hora de recepción sigue siendo 100 %
     automática al cargar el documento, y al pulsar «Conectar
     Gmail» la hora del archivo cargado se rebusca sola.
  3. Se conservan TODAS las correcciones de captura de las
     versiones 3.2.10 y 3.2.11 (espera real a que Gmail renderice,
     relectura de la hora, re-búsquedas cada 60 s, avisos en vez
     de silencios).

NOVEDADES DE LA VERSIÓN 3.2.11 (captura de la hora: causa raíz corregida)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.12 + LEEME')
