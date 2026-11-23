# v3.2.10 — garantiza la captura de la hora de recepción del correo:
# 1) sin vía asistida (web / escritorio sin Playwright) ya no termina en
#    silencio: botón «🔗 Iniciar sesión en Gmail» + aviso, y reintento;
# 2) el botón en escritorio sin servicio conecta por OAuth (antes volvía a
#    caer en la vía bloqueada);
# 3) correo tardío: re-búsqueda silenciosa por la API cada 60 s hasta 4;
# 4) ArchivoNoEncontrado ahora avisa que se reintentará (antes, silencio).
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.9', 'CORPAC AIS/ARO Platform v3.2.10')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.9"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.9» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.9"', '"version": "3.2.10"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.9 - Compilar', 'PDFPro v3.2.10 - Compilar')
s = s.replace('PDFPro-Setup-3.2.9.exe', 'PDFPro-Setup-3.2.10.exe').replace('PDFPro-Portable-3.2.9.exe', 'PDFPro-Portable-3.2.10.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.9 (interfaz más limpia)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.10 (la captura de la hora, garantizada)
────────────────────────────────────────────────────────────────────
  1. Se cerraron los puntos por los que la captura de la hora de
     recepción podía quedar sin cumplirse:
       - En la WEB (o en el escritorio sin el servicio asistido), la
         búsqueda terminaba en silencio si no había sesión de Google.
         Ahora aparece el botón «🔗 Iniciar sesión en Gmail» con un
         aviso claro, y al conectar se rebusca sola la hora.
       - En el escritorio sin el servicio asistido, ese botón caía de
         nuevo en la misma vía bloqueada; ahora conecta por OAuth con
         el navegador del sistema.
  2. Si el correo con el archivo todavía no llegó a Gmail cuando
     abres el PDF, la app lo vuelve a buscar sola cada 60 s (hasta 4
     veces, en silencio, sin abrir ventanas) y avisa que lo
     reintentará.
  3. Al capturarse la hora, la re-búsqueda se cancela sola; cada
     carga de documento o cambio de pestaña la renueva.

NOVEDADES DE LA VERSIÓN 3.2.9 (interfaz más limpia)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.10 + LEEME')
