# v3.2.20 — SESIÓN PREVIA SIN VENTANA: el usuario confirmó que la sesión
# de Gmail YA está activa (la ventana de login abría mostrando el buzón)
# pero la búsqueda fallaba con «ventana cerrada»: la sesión solo se
# cosechaba si la ventana sobrevivía ~3,5 s al sondeo. Ahora, al pedir
# Gmail la sesión, se comprueba PRIMERO el almacén de la partición de
# login: si hay cookies de sesión de google.com, se transfieren
# DIRECTAMENTE sin abrir ventana alguna. Además: cierre anómalo = <5 s
# (la haya visto o no) y el cierre normal tras un login exitoso ya no se
# reporta como fallo en el log.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.19', 'CORPAC AIS/ARO Platform v3.2.20')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.19"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.19» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.19"', '"version": "3.2.20"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.19 - Compilar', 'PDFPro v3.2.20 - Compilar')
s = s.replace('PDFPro-Setup-3.2.19.exe', 'PDFPro-Setup-3.2.20.exe').replace('PDFPro-Portable-3.2.19.exe', 'PDFPro-Portable-3.2.20.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.19 (blindaje del inicio de sesión en Gmail)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.20 (la sesión activa ya no necesita ventana)
────────────────────────────────────────────────────────────────────
  1. Usted lo vio: la ventana de inicio de sesión abría con el buzón
     YA visible (la sesión de Gmail estaba activa) y aun así la
     búsqueda fallaba con «ventana cerrada» — la sesión solo se
     aprovechaba si esa ventana sobrevivía unos segundos. Ahora, al
     pedir Gmail la sesión, el programa comprueba PRIMERO su almacén
     interno: si la sesión ya está activa, transfiere las cookies
     DIRECTAMENTE y sigue buscando SIN abrir ninguna ventana.
  2. Con sesión activa ya no se abre (ni se cierra) ventana alguna:
     no hay nada que pueda cerrarse solo ni cancelar la búsqueda.
  3. Un cierre de la ventana a los <5 segundos se considera anómalo
     (antivirus/bloqueador) la haya visto o no: se reintenta una vez
     y no bloquea los archivos siguientes.
  4. El cierre normal de la ventana tras completar el acceso ya no
     se anota como fallo en el log de diagnóstico.

NOVEDADES DE LA VERSIÓN 3.2.19 (blindaje del inicio de sesión en Gmail)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.20 + LEEME')
