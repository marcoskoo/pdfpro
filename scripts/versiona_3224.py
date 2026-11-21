# v3.2.24 — LA HORA DE RECEPCIÓN PERTENECE AL ARCHIVO, NO A LA PESTAÑA.
# El usuario lo reportó tras el login exitoso: «ahora ya carga la hora,
# pero al cargar otro archivo la hora de recepción no se actualiza de
# acuerdo al archivo seleccionado». Causa raíz (código real): loadPDF
# reutiliza la pestaña activa — cambia fileName pero NO limpia los
# campos selloRxDate/selloRxTime ni tab.selloHora; con la hora del
# archivo ANTERIOR en el campo, el guard de gmailHoraArchivo
# («if(t&&t.value&&!manual) return» // ya hay hora: no se toca) cancelaba
# la búsqueda y el usuario quedaba con la hora del correo de OTRO vuelo
# (y docTabSaveCurrent la persistía en la pestaña del archivo nuevo).
# (1) loadPDF limpia fecha/hora (campo, ficha móvil y pestaña) al cargar
# un archivo DISTINTO en la misma pestaña; (2) gmailAplicarHora firma la
# hora con su archivo (tab.selloHoraArchivo); (3) el guard de
# gmailHoraArchivo y el del reintento solo respetan horas de ESTE archivo
# o escritas a mano — una hora de OTRO archivo se limpia y se busca la
# nueva.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.23', 'CORPAC AIS/ARO Platform v3.2.24')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.23"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.23» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.23"', '"version": "3.2.24"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.23 - Compilar', 'PDFPro v3.2.24 - Compilar')
s = s.replace('PDFPro-Setup-3.2.23.exe', 'PDFPro-Setup-3.2.24.exe').replace('PDFPro-Portable-3.2.23.exe', 'PDFPro-Portable-3.2.24.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.23 (Google ya no deniega el acceso en la ventana de Chrome)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.24 (la hora de recepción pertenece al archivo, no a la pestaña)
────────────────────────────────────────────────────────────────────
  1. Reporte del usuario tras el acceso exitoso: «ahora ya carga la
     hora, pero al cargar otro archivo la hora de recepción no se
     actualiza de acuerdo al archivo seleccionado». La causa: al abrir
     otro PDF en la misma pestaña, la fecha/hora del archivo ANTERIOR
     quedaban puestas en la ficha y el sistema las respetaba («ya hay
     hora: no se toca») — se corría el riesgo de sellar con la hora del
     correo de OTRO vuelo.
  2. Ahora la hora queda firmada con el archivo al que pertenece: al
     cargar un archivo distinto la ficha se limpia y se busca la hora
     del correo de ESE archivo. Recargar el MISMO archivo conserva su
     hora (no se rebusca sin necesidad) y una hora escrita a mano se
     respeta como siempre.

NOVEDADES DE LA VERSIÓN 3.2.23 (Google ya no deniega el acceso en la ventana de Chrome)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.24 + LEEME')
