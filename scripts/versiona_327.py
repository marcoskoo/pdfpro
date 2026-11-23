# v3.2.7 — versiona banner/pie/LEEME tras el fix del SRU2226: la búsqueda
# del correo colapsa los espacios múltiples del nombre real
# («PV CIX LIM        2226») en las consultas a Gmail (API y vía asistida),
# y el toast de la hora aplicada muestra la regla completa de conversión
# (Gmail 04:00 pm = 16:00 Lima + 5 h → 21:00 UTC).
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.6', 'CORPAC AIS/ARO Platform v3.2.7')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.6"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.6» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.6"', '"version": "3.2.7"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.6 - Compilar', 'PDFPro v3.2.7 - Compilar')
s = s.replace('PDFPro-Setup-3.2.6.exe', 'PDFPro-Setup-3.2.7.exe').replace('PDFPro-Portable-3.2.6.exe', 'PDFPro-Portable-3.2.7.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = """  PDFPro Suite 3.2.6 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════
"""
new = """  PDFPro Suite 3.2.7 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
════════════════════════════════════════════════════════════════════

NOVEDADES DE LA VERSIÓN 3.2.7 (caso real SRU2226 — «PV CIX LIM
2226» con espacios múltiples)
────────────────────────────────────────────────────────────────────
  1. CORREGIDO: con planes cuyo nombre de archivo trae ESPACIOS
     MÚLTIPLES (como «PV CIX LIM        2226.pdf» del SRU2226) Gmail
     no devolvía resultados con filename:"…" tal cual y la hora NO se
     capturaba. Ahora la búsqueda prueba, en orden: filename con los
     espacios colapsados («PV CIX LIM 2226.pdf») → el nombre tal cual
     llegó → sin extensión (ambas formas) → texto libre con
     has:attachment. El emparejamiento sigue siendo ESTRICTO: solo se
     acepta el correo cuyo ADJUNTO coincide con el archivo cargado.
     Aplica a la vía API de Gmail (web y escritorio) y también a la
     vía asistida (Playwright) del escritorio.
  2. La conversión de la hora se muestra completa en el aviso al
     aplicar: «Gmail: «16:00» (hora Lima) +5 h → UTC». Ejemplo real
     del SRU2226: Gmail muestra 04:00 pm (= 16:00 Lima) → la app
     presenta 21:00 en «Hora Recepción (UTC)» (16:00 + 5 h), con la
     fecha UTC correspondiente (cruza la medianoche si toca).
"""
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.7 + LEEME')
