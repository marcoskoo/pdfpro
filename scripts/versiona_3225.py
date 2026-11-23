# v3.2.25 — LA HORA NO VIAJA A LA PESTAÑA NUEVA. Reporte del usuario:
# «Hora Recepción (UTC) no actualiza cuando se cambia de pestaña/archivo
# dentro de la app, sigue mostrando la hora de recepción del primer
# pestaña/archivo». Causa raíz: openFilesList (v2.7.0) crea una pestaña
# NUEVA por archivo cuando ya hay un documento abierto — guarda los
# campos del saliente pero NO limpia el formulario, que sigue mostrando
# la hora del archivo anterior; la pestaña nueva nace sin selloHora/
# selloHoraArchivo, el guard de gmailHoraArchivo (v3.2.24) clasificaba
# esa hora ajena como «propia o manual» y cancelaba la búsqueda; y al
# alternar pestañas la hora ajena quedaba guardada como suya.
# (1) openFilesList limpia fecha/hora/matrícula al crear la pestaña
# nueva; (2) el guard solo respeta horas firmadas con este archivo o
# guardadas en la pestaña sin firma (manuales) — un valor sin rastro en
# la pestaña es de otro archivo: se limpia y se busca.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.24', 'CORPAC AIS/ARO Platform v3.2.25')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.24"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.24» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.24"', '"version": "3.2.25"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.24 - Compilar', 'PDFPro v3.2.25 - Compilar')
s = s.replace('PDFPro-Setup-3.2.24.exe', 'PDFPro-Setup-3.2.25.exe').replace('PDFPro-Portable-3.2.24.exe', 'PDFPro-Portable-3.2.25.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.24 (la hora de recepción pertenece al archivo, no a la pestaña)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.25 (la hora ya no viaja a la pestaña nueva)
────────────────────────────────────────────────────────────────────
  1. Reporte del usuario: «Hora Recepción (UTC) no actualiza cuando se
     cambia de pestaña/archivo dentro de la app, sigue mostrando la hora
     de recepción del primer pestaña/archivo». La causa: al abrir un
     archivo con otro documento ya cargado, la app crea una pestaña
     nueva — pero el formulario seguía mostrando la fecha/hora del
     documento anterior, el sistema la daba por buena y no buscaba la
     del archivo nuevo (y al alternar pestañas, la hora ajena quedaba
     guardada como suya).
  2. Ahora la pestaña nueva nace limpia: fecha, hora y matrícula en
     blanco (la matrícula la detecta el auto-OCR del nuevo archivo) y se
     busca la hora del correo de ESE archivo. Al alternar entre
     pestañas, cada una muestra su propia hora.

NOVEDADES DE LA VERSIÓN 3.2.24 (la hora de recepción pertenece al archivo, no a la pestaña)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.25 + LEEME')
