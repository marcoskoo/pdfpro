# v3.2.27 — LA HORA QUE SE APLICA ES DEL CORREO DE ESE ARCHIVO. Reporte
# del usuario: «solo buscó la hora de recepción de 1, y lo repite en las
# demás pestañas/archivos». Causa raíz: con varios archivos abiertos las
# búsquedas se encolan sobre el MISMO navegador invisible, y navegar de
# #search/a a #search/b es solo un cambio de hash (mismo documento): el
# sondeo de _buscar podía dar por buena la vista ANTERIOR (los resultados
# de otra consulta, o el correo que quedó ABIERTO de la búsqueda previa) y
# se extraía la hora del correo equivocado — el del archivo 1, repetido
# en todas las pestañas.
# (1) _buscar pasa por about:blank antes de cada consulta: recarga real,
#     lo que aparece en pantalla pertenece siempre a ESTA consulta;
# (2) _buscarYExtraer VERIFICA que el correo abierto trae el archivo como
#     adjunto (adjuntoCoincide) antes de usar su hora — si no es su
#     correo, no se usa (ArchivoNoEncontrado → re-búsqueda).
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.26', 'CORPAC AIS/ARO Platform v3.2.27')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.26"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.26» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.26"', '"version": "3.2.27"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.26 - Compilar', 'PDFPro v3.2.27 - Compilar')
s = s.replace('PDFPro-Setup-3.2.26.exe', 'PDFPro-Setup-3.2.27.exe').replace('PDFPro-Portable-3.2.26.exe', 'PDFPro-Portable-3.2.27.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.26 (todas las pestañas buscan su hora)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.27 (la hora que se aplica es del correo de ESE archivo)
─────────────────────────────────────────────────────────────────────────────────
  1. Reporte del usuario: «solo buscó la hora de recepción de 1, y lo
     repite en las demás pestañas/archivos». La causa: al encolarse las
     búsquedas de varios archivos sobre el mismo navegador invisible, la
     página no se recargaba de verdad entre consultas — la 2.ª, 3.ª y
     4.ª terminaban leyendo el correo que quedaba abierto (el del 1.er
     archivo) y repetían SU hora en todas las pestañas.
  2. Ahora cada consulta recarga la página de verdad: lo que aparece en
     pantalla pertenece siempre a la consulta de ESE archivo.
  3. Y la doble verificación final: si el correo abierto no trae el
     archivo como adjunto, SU HORA NO SE USA (se reintenta solo). Ya no
     es posible que un archivo reciba la hora del correo de otro.

NOVEDADES DE LA VERSIÓN 3.2.26 (todas las pestañas buscan su hora)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.27 + LEEME')
