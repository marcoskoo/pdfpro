# v3.2.16 — match del nombre de archivo con «(n)» de duplicado MÚLTIPLE:
# los archivos reales del usuario se descargan como «ATC CM468 11NOV (1) (1).pdf»
# (uno o varios «(n)» añadidos por Gmail/navegador al descargar dos veces un
# adjunto ya renombrado) y la comparación solo quitaba UN «(n)»: daba
# «atccm46811nov1» ≠ «atccm46811nov» → ningún correo hacía match y la hora
# jamás se capturaba. Ahora se quitan TODOS los «(n)» finales, en las tres
# vías (API web, API escritorio, asistida), y la búsqueda filename:/texto
# libre reintenta con la base sin marcadores. Además el año por defecto del
# parser de la hora es el de la ZONA de la cuenta (Lima), no el de UTC.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.15', 'CORPAC AIS/ARO Platform v3.2.16')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.15"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.15» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.15"', '"version": "3.2.16"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.15 - Compilar', 'PDFPro v3.2.16 - Compilar')
s = s.replace('PDFPro-Setup-3.2.15.exe', 'PDFPro-Setup-3.2.16.exe').replace('PDFPro-Portable-3.2.15.exe', 'PDFPro-Portable-3.2.16.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.15 (fin del aviso en bucle del inicio de sesión)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.16 (match con archivos «(1) (1)»)
────────────────────────────────────────────────────────────────────
  1. CAUSA RAÍZ de que la hora no se capturara con archivos
     descargados dos veces: el archivo queda «ATC CM468 11NOV
     (1) (1).pdf» y la comparación solo quitaba UN «(1)» → el
     nombre nunca hacía match con el adjunto del correo. Ahora
     se quitan TODOS los «(n)» finales, en las tres vías (Google
     web, Google escritorio y buscador asistido).
  2. La búsqueda filename:/texto libre también reintenta con el
     nombre SIN los «(n)» (el correo menciona el adjunto
     original, no la copia renombrada).
  3. El año de la hora, cuando Gmail no lo muestra, se toma de
     la hora de Lima (antes de la de UTC: el 31 dic por la noche
     daba un año de más).

NOVEDADES DE LA VERSIÓN 3.2.15 (fin del aviso en bucle del inicio de sesión)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.16 + LEEME')
