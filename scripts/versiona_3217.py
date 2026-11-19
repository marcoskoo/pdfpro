# v3.2.17 — VENTANA DE PROGRESO de la búsqueda de la hora de recepción:
# el usuario reporta «carga Gmail pero no hace nada más» y pide VER en
# texto, en una pequeña ventana minimizable, los pasos que ejecuta la
# búsqueda. Antes los pasos solo llegaban como toasts que desaparecen a
# los pocos segundos. Nueva ventana independiente (src/progreso.html +
# src/preload-progreso.js) con el historial de pasos en tiempo real:
# navegador, login, cookies, cada consulta EXACTA a Gmail, el recorrido de
# la bandeja correo por correo y el resultado final ✔/✖. Minimizarla o
# cerrarla no cancela la búsqueda; se reabre con la siguiente.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.16', 'CORPAC AIS/ARO Platform v3.2.17')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.16"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.16» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.16"', '"version": "3.2.17"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.16 - Compilar', 'PDFPro v3.2.17 - Compilar')
s = s.replace('PDFPro-Setup-3.2.16.exe', 'PDFPro-Setup-3.2.17.exe').replace('PDFPro-Portable-3.2.16.exe', 'PDFPro-Portable-3.2.17.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.16 (match con archivos «(1) (1)»)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.17 (ventana de progreso de la búsqueda)
────────────────────────────────────────────────────────────────────
  1. NUEVA VENTANA DE PROGRESO: una ventana pequeña, independiente
     y minimizable que muestra EN TEXTO los pasos que va ejecutando
     la búsqueda de la hora de recepción — qué navegador usa, el
     estado del inicio de sesión, las cookies, cada consulta EXACTA
     a Gmail y el recorrido de la bandeja CORREO POR CORREO, hasta
     el resultado final (✔ hora obtenida / ✖ causa del fallo).
  2. Se abre sola con cada búsqueda (sin robar el foco de la app);
     minimizarla o cerrarla NO cancela la búsqueda — es solo un
     visor, y el historial completo se reenvía al volver a abrirse.
  3. Los pasos con marca de hora (hora de Lima) y colores: normales
     en blanco, inicio de sesión en amarillo, resultado en verde y
     errores en rojo. Botón «Limpiar» para vaciar la vista.

NOVEDADES DE LA VERSIÓN 3.2.16 (match con archivos «(1) (1)»)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.17 + LEEME')
