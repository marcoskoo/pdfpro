# v3.2.28 — EOBT CON DOS PUNTOS EN EL CAMPO «MATRÍCULA (AERONAVE /
# ESPACIO)». Reporte del usuario: «para los vuelos que no sean tipo de
# vuelo "S", en el campo de "Matrícula (Aeronave / Espacio)", debe
# mostrarse "Matrícula, hora (EOBT), iniciales (del operador)"… en la
# imagen no se cumple la regla». Causa raíz: el formulario traía la hora
# de salida como «18:50» (CON DOS PUNTOS, casillero 13 junto al
# aeródromo de salida) y el extractor del EOBT solo aceptaba 4 dígitos
# seguidos («1850»): al no encontrar la hora, el campo quedaba
# «OB2147 MK» — sin el EOBT — en vuelos tipo G.
# (1) TEXTO (OCR/formulario ordenado/télex): «18:50», «18 : 50», «18.50»
#     y «8:30» (hora de 1 cifra → «0830») se normalizan a 4 dígitos
#     antes de aplicar los 4 patrones existentes;
# (2) GEOMETRÍA (ítems pdf.js {str,x,y}): se admiten «18:50» como un
#     solo ítem, las parejas «18» «50» y el «:» suelto entre casillas.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.27', 'CORPAC AIS/ARO Platform v3.2.28')
s = rep(s, 'matrícula en c-7 → + EOBT (c-13) + iniciales (OB2134 1120 MK)',
        'matrícula en c-7 → + EOBT (c-13) + iniciales (OB2134 1120 MK, admite la hora con dos puntos «SPHI 18:50»)')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.27"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.27» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.27"', '"version": "3.2.28"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.27 - Compilar', 'PDFPro v3.2.28 - Compilar')
s = s.replace('PDFPro-Setup-3.2.27.exe', 'PDFPro-Setup-3.2.28.exe').replace('PDFPro-Portable-3.2.27.exe', 'PDFPro-Portable-3.2.28.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.27 (la hora que se aplica es del correo de ESE archivo)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.28 (vuelos que NO son tipo «S»: matrícula + EOBT + iniciales)
────────────────────────────────────────────────────────────────────────────────────────
  1. Reporte del usuario: en un plan de vuelo tipo G el campo «Matrícula
     (Aeronave / Espacio)» quedó «OB2147 MK» — le faltaba la hora (EOBT),
     que debía ser «OB2147 1850 MK».
  2. La causa: el formulario traía la hora de salida como «18:50» (con
     dos puntos, junto al aeródromo de salida) y el detector del EOBT
     solo entendía 4 dígitos seguidos («1850»). Al no encontrarla, se
     armaba el campo sin la hora.
  3. Ahora la hora con dos puntos se entiende en TODAS las vías: texto
     del PDF, OCR, formulario electrónico y télex («SPHI 18:50» → 1850,
     «8:30» → 0830), y también en la lectura por geometría de casillas
     («18:50» entero, «18» «50» partido o el «:» suelto).
  4. Los vuelos tipo «S» no cambian: ID de vuelo + REG/ + iniciales
     («SRU2226 OB2176P MK»), igual que antes.

NOVEDADES DE LA VERSIÓN 3.2.27 (la hora que se aplica es del correo de ESE archivo)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.28 + LEEME')
