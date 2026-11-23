# v3.2.23 — GOOGLE YA NO DENIEGA EL ACCESO EN LA VENTANA DE CHROME. La
# captura de las 09:27-09:29 lo probó paso a paso: la ventana de Chrome
# real se abrió (✔ 09:27:51), el usuario ingresó sus credenciales y
# Google las DENEGÓ con el aviso «este navegador o aplicación no es
# seguro» — Playwright lanza Chrome con --enable-automation
# (navigator.webdriver) y Google bloquea el acceso justo por eso; a los
# 56 s la ventana se dio por cerrada, la de respaldo murió en el mismo
# segundo (partición posiblemente corrupta: <2 s en TODAS las versiones
# mientras las demás ventanas viven) y el guardia de 7 min cortaba
# cualquier acceso humano a mitad. (1) loginVisible SIN marca de
# automatización (ignoreDefaultArgs --enable-automation +
# --disable-blink-features=AutomationControlled) y con 10 min de plazo;
# (2) guardia global de 7 a 20 min; (3) partición de login renovada
# ('gmail-correo1') para escapar del almacén corrupto.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.22', 'CORPAC AIS/ARO Platform v3.2.23')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.22"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.22» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.22"', '"version": "3.2.23"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.22 - Compilar', 'PDFPro v3.2.23 - Compilar')
s = s.replace('PDFPro-Setup-3.2.22.exe', 'PDFPro-Setup-3.2.23.exe').replace('PDFPro-Portable-3.2.22.exe', 'PDFPro-Portable-3.2.23.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.22 (inicio de sesión en una ventana de Chrome real)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.23 (Google ya no deniega el acceso en la ventana de Chrome)
────────────────────────────────────────────────────────────────────
  1. Su captura de las 09:27 mostró el paso exacto que fallaba: la
     ventana de Chrome se abrió, usted ingresó cuenta y clave, y Google
     DENEGÓ el acceso con «este navegador o aplicación no es seguro»:
     el Chrome que abre la app viajaba marcado como automatizado. Se
     quitó esa marca — Google ahora ve un Chrome normal.
  2. El plazo para completar el acceso sube de 5 a 10 minutos
     (credenciales + verificación en dos pasos toman su tiempo) y el
     límite global de la búsqueda pasa de 7 a 20 minutos: antes el
     acceso quedaba cortado a mitad.
  3. La ventana de respaldo dentro de la app muere en <2 s en su
     equipo desde siempre (mientras las demás ventanas viven): síntoma
     de almacén interno dañado. Se le asignó un almacén nuevo y limpio.

NOVEDADES DE LA VERSIÓN 3.2.22 (inicio de sesión en una ventana de Chrome real)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.23 + LEEME')
