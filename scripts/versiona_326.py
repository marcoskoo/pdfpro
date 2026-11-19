# v3.2.6 — versiona banner/pie/LEEME tras el fix de la hora de recepción
# (búsqueda A PARTIR DEL ARCHIVO CARGADO por API de Gmail en web y
# escritorio) y la retirada de los 4 textos de ayuda de la ficha del sello.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.5', 'CORPAC AIS/ARO Platform v3.2.6')
s = rep(s,
    'hora de recepción del correo por archivo cargado 100% automática (Gmail asistido, login dentro de la app)',
    'hora de recepción del correo por archivo cargado 100% automática (API de Gmail: busca el correo por el nombre del archivo cargado; en escritorio además vía asistida)')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.5"') != 1:
        sys.exit(f'✗ {p}: versiones 3.2.5 = {s.count(chr(34) + "version" + chr(34) + ": " + chr(34) + "3.2.5")}')
    s = s.replace('"version": "3.2.5"', '"version": "3.2.6"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.5 - Compilar', 'PDFPro v3.2.6 - Compilar')
s = s.replace('PDFPro-Setup-3.2.5.exe', 'PDFPro-Setup-3.2.6.exe').replace('PDFPro-Portable-3.2.5.exe', 'PDFPro-Portable-3.2.6.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = """  PDFPro Suite 3.2.5 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════
"""
new = """  PDFPro Suite 3.2.6 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════

NOVEDADES DE LA VERSIÓN 3.2.6 (hora de recepción del correo: se busca
A PARTIR DEL ARCHIVO CARGADO)
────────────────────────────────────────────────────────────────────
  1. AL CARGAR UN DOCUMENTO la app busca en Gmail el correo que trae
     ese archivo como adjunto y llena sola «Hora Recepción»: consulta
     dirigida filename:"nombre del archivo" (y luego texto libre si no
     aparece), por la API de Gmail — funciona en la WEB y en el
     ESCRITORIO. Solo se acepta un correo cuyo ADJUNTO coincida con el
     archivo cargado (nunca uno al azar) y no se pisa una hora escrita
     a mano. Antes: en la web cargar un documento NO buscaba nada y en
     el escritorio dependía de la vía asistida (Playwright).
  2. La vía asistida (Playwright, sin OAuth) sigue de respaldo en el
     escritorio cuando la API no está conectada.
  3. Se quitaron los 4 textos de ayuda de la ficha del sello
     (monitoreo Gmail, recepción, iniciales, armado de la matrícula):
     los campos funcionan igual, sin las explicaciones debajo.
"""
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.6 + banner + LEEME')
