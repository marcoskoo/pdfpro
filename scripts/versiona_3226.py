# v3.2.26 — TODAS LAS PESTAÑAS BUSCAN SU HORA. Reporte del usuario:
# «solo actualizó la hora de recepción en dos pestañas/archivos de las
# 04 que cargué». Causa raíz: gmailHoraAuto tenía UN solo temporizador
# global con clearTimeout — cargar otro archivo CANCELABA la búsqueda
# pendiente del anterior; al abrir varios en ráfaga solo el último era
# buscado (y otra pestaña si se visitaba, porque cambiar de pestaña
# re-dispara). Además gmailAplicarHitApi miraba el campo del formulario,
# que en una búsqueda de pestaña en segundo plano muestra la hora de
# OTRA pestaña.
# (1) gmailHoraAuto agenda POR PESTAÑA (cargar otro archivo ya no cancela
# las búsquedas anteriores; main.js ya encola las búsquedas de a una);
# (2) gmailHoraArchivo acepta la pestaña explícita y busca aunque no esté
# activa — el guard del campo solo vale para la pestaña VISIBLE;
# (3) el reintento captura SU pestaña (la que falló) y la rebusca a ella;
# (4) gmailAplicarHitApi consciente de la pestaña activa;
# (5) bandera _gmailHoraManual: una hora escrita a mano (ficha de
# escritorio o móvil) jamás se borra ni se rebusca.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.25', 'CORPAC AIS/ARO Platform v3.2.26')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.25"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.25» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.25"', '"version": "3.2.26"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.25 - Compilar', 'PDFPro v3.2.26 - Compilar')
s = s.replace('PDFPro-Setup-3.2.25.exe', 'PDFPro-Setup-3.2.26.exe').replace('PDFPro-Portable-3.2.25.exe', 'PDFPro-Portable-3.2.26.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.25 (la hora ya no viaja a la pestaña nueva)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.26 (todas las pestañas buscan su hora)
────────────────────────────────────────────────────────────────────
  1. Reporte del usuario: «solo actualizó la hora de recepción en dos
     pestañas/archivos de las 04 que cargué». La causa: al abrir varios
     archivos en ráfaga, cargar el siguiente CANCELABA la búsqueda
     pendiente del anterior — solo el último archivo era buscado (y
     otro, si lo visitabas, porque cambiar de pestaña re-dispara la
     búsqueda).
  2. Ahora CADA pestaña agenda su propia búsqueda: los N archivos que
     cargues reciben cada uno la hora de su correo, uno tras otro (se
     ejecutan en cola, de a una). Ya no importa cuántos abras ni en qué
     orden.
  3. La re-búsqueda automática (correo que aún no llega) también
     pertenece al archivo que la necesita, no a la pestaña que esté
     abierta.
  4. Una hora ESCRITA A MANO (ficha de escritorio o móvil) queda
     blindada: jamás se borra ni se rebusca.

NOVEDADES DE LA VERSIÓN 3.2.25 (la hora ya no viaja a la pestaña nueva)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.26 + LEEME')
