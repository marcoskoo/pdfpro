# v3.2.13 — CAUSA RAÍZ de «no se da la captura de la hora» (3.er reporte):
# en el instalador de escritorio los navegadores de ms-playwright NO van
# dentro del paquete (viven en %LOCALAPPDATA%\ms-playwright); si en la
# máquina del usuario no están (o la revisión no coincide con la del
# paquete), chromium.launch() falla con «Executable doesn't exist», el main
# SE TRAGABA ese fallo como «aviso» y la búsqueda moría en un error genérico
# o en silencio → la captura jamás ocurría. Arreglos:
#  (1) GmailHoraService.iniciar(): cadena de 4 intentos — ruta manual
#      PDFPRO_GMAIL_CHROMIUM (diagnóstico) → Chrome del sistema → Edge del
#      sistema (presente en TODO Windows 10/11) → Chromium empaquetado.
#  (2) main: si iniciar() falla se devuelve {tipo:'NavegadorFalta'} con la
#      causa real (nada se traga).
#  (3) renderer: rama NavegadorFalta con aviso accionable (conectar Gmail
#      por Google/OAuth busca sin navegador).
# Verificado con el SERVICIO REAL contra gmail.com (scripts/test_servicio_real_3213.js):
# launch → búsqueda por nombre de archivo → muro de login en 2.3 s.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.12', 'CORPAC AIS/ARO Platform v3.2.13')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.12"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.12» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.12"', '"version": "3.2.13"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.12 - Compilar', 'PDFPro v3.2.13 - Compilar')
s = s.replace('PDFPro-Setup-3.2.12.exe', 'PDFPro-Setup-3.2.13.exe').replace('PDFPro-Portable-3.2.12.exe', 'PDFPro-Portable-3.2.13.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.12 (panel de Gmail restaurado)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.13 (captura de la hora: navegador garantizado)
────────────────────────────────────────────────────────────────────
  1. CAUSA RAÍZ corregida: en el instalador el buscador invisible
     dependía de unos archivos (navegadores de Playwright) que NO van
     dentro del instalador y no siempre están en el PC. Si faltaban,
     la búsqueda del correo moría sin explicación. Ahora se intenta
     en orden: Chrome del sistema → Edge del sistema (presente en
     TODO Windows 10/11) → Chromium empaquetado → ruta manual de
     diagnóstico.
  2. Si aun así no hay navegador, se avisa con la causa real y se
     ofrece conectar Gmail con «Conectar Gmail» (panel 📧): por Google
     la hora se busca sin navegador.
  3. La cadena se verificó de verdad contra gmail.com (lanzamiento →
     búsqueda por nombre de archivo → detección del inicio de sesión).

NOVEDADES DE LA VERSIÓN 3.2.12 (panel de Gmail restaurado)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.13 + LEEME')
