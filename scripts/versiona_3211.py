# v3.2.11 — garantiza de verdad la captura de la hora de recepción:
# 1) GmailHoraService._buscar: espera hasta 12 s a que Gmail renderice filas
#    o el aviso de «sin resultados» (antes 2,5 s fijos → en frío la lista aún
#    no existía y daba «archivo no encontrado» aunque el correo estaba);
# 2) _extraerHora: reintentos hasta 8 s vía _extraerHoraUna (antes una sola
#    lectura → HoraNoExtraidaError silencioso en el renderer);
# 3) renderer: HoraNoExtraida ya no es silencio (avisa + reintenta);
#    bandera _gmailAsistidaSesionOk (la sesión respondió) y la re-búsqueda
#    de 60 s también usa la vía asistida (antes solo API: sin OAuth no hacía
#    NADA — el caso del usuario). Toasts solo fuera de reintentos.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.10', 'CORPAC AIS/ARO Platform v3.2.11')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.10"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.10» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.10"', '"version": "3.2.11"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.10 - Compilar', 'PDFPro v3.2.11 - Compilar')
s = s.replace('PDFPro-Setup-3.2.10.exe', 'PDFPro-Setup-3.2.11.exe').replace('PDFPro-Portable-3.2.10.exe', 'PDFPro-Portable-3.2.11.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.10 (la captura de la hora, garantizada)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.11 (captura de la hora: causa raíz corregida)
────────────────────────────────────────────────────────────────────
  1. Causa raíz de que «la captura no se da»: la búsqueda en Gmail
     esperaba 2,5 segundos fijos a que la lista de resultados
     apareciera. Gmail es una aplicación web y en arranque en frío
     (primer uso del día, máquina lenta, antivirus) la lista aún no
     existía: la app concluía «no hay correo con este archivo»
     aunque el correo SÍ estaba. Ahora espera hasta 12 s a que la
     lista o el aviso de «sin resultados» aparezca de verdad.
  2. Lo mismo al leer la hora del correo abierto: antes una sola
     lectura (fallaba en silencio si el mensaje aún renderizaba);
     ahora reintenta hasta 8 s y, si no logra leerla, lo AVISA y
     reintenta la captura completa.
  3. La re-búsqueda automática cada 60 s ya no depende de OAuth:
     si la sesión de Gmail respondió, también rebusca por la vía
     asistida (antes solo usaba la API y sin OAuth las rondas no
     hacían nada). Nunca abre ventanas de login sin que estés
     delante de la app.

NOVEDADES DE LA VERSIÓN 3.2.10 (la captura de la hora, garantizada)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.11 + LEEME')
