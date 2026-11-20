# v3.2.19 — Diagnóstico y blindaje del INICIO DE SESIÓN en Gmail: el log
# del usuario mostró la ventana de login cerrándose «sola» en <1 s
# («✖ No se completó el inicio de sesión (ventana cerrada)» a los 0-1 s de
# abrirse — imposible de hacer a mano). (1) instrumentación completa del
# ciclo de vida: edad al cerrarse, si llegó a verse, proceso muerto y
# fallo de carga, todo al log; (2) CIERRE ANÓMALO (<5 s sin verse /
# renderer muerto): se reintenta una vez y NO dispara el candado de
# sesión (antes TODO cierre lo activaba y los PDF siguientes dejaban de
# intentar el login); (3) loadURL reintenta tras ERR_ABORTED (el redirect
# de Google aborta la carga inicial sin que nada esté roto); (4) motivos
# honestos: la sesión completa ya no se reporta como «ventana cerrada».
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.18', 'CORPAC AIS/ARO Platform v3.2.19')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.18"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.18» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.18"', '"version": "3.2.19"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.18 - Compilar', 'PDFPro v3.2.19 - Compilar')
s = s.replace('PDFPro-Setup-3.2.18.exe', 'PDFPro-Setup-3.2.19.exe').replace('PDFPro-Portable-3.2.18.exe', 'PDFPro-Portable-3.2.19.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.18 (corrección de la ventana de progreso)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.19 (blindaje del inicio de sesión en Gmail)
────────────────────────────────────────────────────────────────────
  1. La ventana de inicio de sesión se estaba cerrando «sola» en
     menos de 1 segundo y el programa lo reportaba como «ventana
     cerrada», bloqueando el login de TODOS los archivos siguientes.
     Ahora se distingue un cierre REAL del usuario de uno ANÓMALO
     (antivirus, bloqueador, fallo del navegador): el anómalo se
     REINTENTA una vez y ya no bloquea los archivos siguientes.
  2. Todo el ciclo de la ventana queda anotado en el log de
     diagnóstico (gmail-hora.log): a los cuántos segundos se cerró,
     si llegó a verse y, si el navegador falló, la causa exacta.
  3. La carga de Gmail reintenta sola: la primera redirección de
     Google podía abortarla sin que nada estuviera roto.
  4. Mensajes honestos: una sesión completada ya nunca se reporta
     como «ventana cerrada», y tras un fallo la ventana de progreso
     indica el paso siguiente (botón «🔗 Iniciar sesión en Gmail»).

NOVEDADES DE LA VERSIÓN 3.2.18 (corrección de la ventana de progreso)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.19 + LEEME')
