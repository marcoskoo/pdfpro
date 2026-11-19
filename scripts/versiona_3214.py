# v3.2.14 — ORDEN EXIGIDO POR EL USUARIO para la búsqueda de la hora de
# recepción: primero se verifica el ÚLTIMO correo recibido comparando el
# nombre de su adjunto con el del archivo cargado; si hacen match se toma
# su hora; si no, se repite con el penúltimo y sucesivos (hasta 40; luego
# respaldo filename:/texto libre). En las dos vías (API OAuth y asistida
# por el navegador) con la misma comparación normalizada (extensión,
# «(n)» de duplicados, signos, mayúsculas y espacios múltiples no importan).
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.13', 'CORPAC AIS/ARO Platform v3.2.14')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.13"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.13» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.13"', '"version": "3.2.14"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.13 - Compilar', 'PDFPro v3.2.14 - Compilar')
s = s.replace('PDFPro-Setup-3.2.13.exe', 'PDFPro-Setup-3.2.14.exe').replace('PDFPro-Portable-3.2.13.exe', 'PDFPro-Portable-3.2.14.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.13 (captura de la hora: navegador garantizado)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.14 (búsqueda en el ORDEN correcto)
────────────────────────────────────────────────────────────────────
  1. La hora de recepción ahora se busca EXACTAMENTE en el orden
     pedido: se verifica primero el ÚLTIMO correo recibido y se
     compara el nombre de su adjunto con el del archivo cargado;
     si hacen match, esa es la hora; si no, se repite con el
     penúltimo correo y así sucesivamente (hasta los 40 más
     recientes; después, respaldo por nombre de archivo).
  2. La comparación de nombres es estricta pero tolerante: no
     importan mayúsculas, espacios múltiples, signos, la extensión
     ni el «(1)» que Gmail añade a adjuntos duplicados.
  3. El mismo orden y la misma comparación en las dos vías: por
     Google (con «Conectar Gmail», sin navegador) y por el buscador
     invisible de la app. En ambas se toma el correo MÁS RECIENTE
     que tenga el adjunto.

NOVEDADES DE LA VERSIÓN 3.2.13 (captura de la hora: navegador garantizado)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.14 + LEEME')
