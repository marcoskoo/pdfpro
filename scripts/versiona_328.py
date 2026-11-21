# v3.2.8 — versiona banner/pie/LEEME tras hacer que «Hora Recepción (UTC)»
# y «Matrícula (Aeronave / Espacio)» sean por PESTAÑA: al cambiar de
# archivo o pestaña la ficha se actualiza automáticamente al documento
# activo, y si el documento aún no tiene hora se busca en Gmail la de SU
# correo (la búsqueda usa el archivo de la pestaña activa).
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.7', 'CORPAC AIS/ARO Platform v3.2.8')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.7"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.7» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.7"', '"version": "3.2.8"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.7 - Compilar', 'PDFPro v3.2.8 - Compilar')
s = s.replace('PDFPro-Setup-3.2.7.exe', 'PDFPro-Setup-3.2.8.exe').replace('PDFPro-Portable-3.2.7.exe', 'PDFPro-Portable-3.2.8.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = """  PDFPro Suite 3.2.7 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════
"""
new = """  PDFPro Suite 3.2.8 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════

NOVEDADES DE LA VERSIÓN 3.2.8 (múltiples archivos: la ficha sigue a
la pestaña activa)
────────────────────────────────────────────────────────────────────
  1. NUEVO: «Hora Recepción (UTC)» y «Matrícula (Aeronave / Espacio)»
     son ahora POR PESTAÑA. Al cambiar de archivo o pestaña la ficha
     del sello se actualiza automáticamente con los valores del
     documento activo (antes conservaba los del documento anterior).
  2. Si el documento de la pestaña a la que cambias aún no tiene hora
     de recepción, se busca automáticamente en Gmail la de SU correo
     (la búsqueda usa el archivo de esa pestaña). La hora viaja con la
     pestaña: alternar entre archivos no repite búsquedas ya hechas ni
     pisa horas — si la respuesta de Gmail llega cuando ya cambiaste
     de pestaña, la hora se guarda en SU pestaña y no toca la ficha
     del documento que estás viendo.
  3. La matrícula detectada al cargar también queda guardada en su
     pestaña, y los valores escritos a mano se conservan al alternar.
  4. Al cerrar la última pestaña la ficha queda limpia (sin documento
     → sin hora ni matrícula), coherente con que el campo refleja
     siempre el documento cargado.
"""
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.8 + LEEME')
