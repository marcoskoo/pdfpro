# v3.2.18 — CORRECCIÓN de la ventana de progreso: quedaba VACÍA. El
# preload asignaba «window.pdfproProgreso» en su mundo aislado (con
# contextIsolation la página nunca lo veía) → ningún listener → la ventana
# no indicaba nada. Además: (1) las líneas se duplicaban (cada envío
# re-pegaba el historial completo) — ahora solo se añaden las nuevas;
# (2) más detalle por consulta («Bandeja: N correos», «sin resultados»,
# «12 s sin respuesta de Gmail»); (3) guardia global de 7 min: si algo se
# cuelga de verdad, la búsqueda se cancela y se cierra el navegador —
# antes la cola podía quedar bloqueada PARA SIEMPRE y cada PDF cargado se
# encolaba sin que pasara nada.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.17', 'CORPAC AIS/ARO Platform v3.2.18')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.17"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.17» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.17"', '"version": "3.2.18"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.17 - Compilar', 'PDFPro v3.2.18 - Compilar')
s = s.replace('PDFPro-Setup-3.2.17.exe', 'PDFPro-Setup-3.2.18.exe').replace('PDFPro-Portable-3.2.17.exe', 'PDFPro-Portable-3.2.18.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.17 (ventana de progreso de la búsqueda)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.18 (corrección de la ventana de progreso)
────────────────────────────────────────────────────────────────────
  1. CORRECCIÓN CRÍTICA: la ventana de progreso quedaba VACÍA («no
     indica nada») — el puente interno usaba una asignación que, con
     el aislamiento de contextos de Electron, nunca llegaba a la
     página. Ahora sí se ven todos los pasos en texto, en vivo.
  2. Las líneas ya no se duplican: solo se añaden las nuevas.
  3. Más detalle por consulta: «Bandeja: N correos traídos», «sin
     resultados para esta consulta» y un aviso si Gmail no responde
     tras 12 segundos (antes ese caso era invisible).
  4. GUARDIA GLOBAL DE 7 MINUTOS: si algo se cuelga de verdad, la
     búsqueda se cancela, se cierra el navegador y la siguiente
     arranca limpia — antes la cola de búsquedas podía quedar
     bloqueada para siempre: cada PDF cargado se encolaba detrás y
     «no pasaba nada».

NOVEDADES DE LA VERSIÓN 3.2.17 (ventana de progreso de la búsqueda)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.18 + LEEME')
