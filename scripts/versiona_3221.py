# v3.2.21 — EL BOTÓN «CONECTAR GMAIL» YA NO ABRE UNA VENTANA ROTA. La
# captura del usuario reveló dos cosas: (1) el monitor OAuth pedía
# consentimiento a Google con el client_id VACÍO («Error 400:
# invalid_request — Missing required parameter: client_id») porque
# src/gmail-credentials.json no viaja en el build — el botón nunca
# funcionó en ningún instalador; (2) la captura mostraba una ventana de
# Gmail con el buzón abierto (sesión válida en el almacén) a la vez que
# la búsqueda fallaba — y el log no permitía saber qué build corría ni
# qué encontró la comprobación de sesión previa. (1) gmail:conectar
# responde «sin-credenciales» SIN abrir nada y el aviso explica que la
# hora NO necesita ese flujo; (2) el aviso de «ningún navegador» ya no
# manda al botón roto; (3) el título de la ventana de progreso lleva la
# versión (cada captura se autoidentifica); (4) la comprobación previa
# queda SIEMPRE anotada en gmail-hora.log.
import sys

def rep(s, old, new, n=1):
    if s.count(old) != n:
        sys.exit(f'✗ parche no aplica ({s.count(old)} veces): {old[:70]!r}')
    return s.replace(old, new)

p = 'web/index.html'
s = open(p, encoding='utf-8').read()
s = rep(s, 'CORPAC AIS/ARO Platform v3.2.20', 'CORPAC AIS/ARO Platform v3.2.21')
open(p, 'w', encoding='utf-8').write(s)

for p in ('package.json', 'package-lock.json'):
    s = open(p, encoding='utf-8').read()
    if p == 'package.json' and s.count('"version": "3.2.20"') != 1:
        sys.exit(f'✗ {p}: «version 3.2.20» no aparece exactamente 1 vez')
    s = s.replace('"version": "3.2.20"', '"version": "3.2.21"')
    open(p, 'w', encoding='utf-8').write(s)

s = open('build-windows.bat', encoding='utf-8').read()
s = rep(s, 'PDFPro v3.2.20 - Compilar', 'PDFPro v3.2.21 - Compilar')
s = s.replace('PDFPro-Setup-3.2.20.exe', 'PDFPro-Setup-3.2.21.exe').replace('PDFPro-Portable-3.2.20.exe', 'PDFPro-Portable-3.2.21.exe')
open('build-windows.bat', 'w', encoding='utf-8').write(s)

p = 'LEEME.txt'
s = open(p, encoding='utf-8').read()
old = 'NOVEDADES DE LA VERSIÓN 3.2.20 (la sesión activa ya no necesita ventana)'
new = '''NOVEDADES DE LA VERSIÓN 3.2.21 (el botón «Conectar Gmail» ya no abre una ventana rota)
────────────────────────────────────────────────────────────────────
  1. Su captura reveló que el botón «CONECTAR GMAIL» abría un
     consentimiento de Google que moría con «Error 400: Missing
     required parameter: client_id»: las credenciales de ese monitor
     no viajan en el instalador. Ahora el botón avisa la verdad SIN
     abrir nada — y aclara que PARA LA HORA DE RECEPCIÓN NO HACE
     FALTA: basta cargar el PDF (la sesión de Gmail se usa directa).
  2. La ventana de progreso ahora muestra la versión en su título
     («PDFPro — Progreso Gmail (v3.2.21)»): toda captura delata qué
     build corre.
  3. La comprobación de sesión previa queda SIEMPRE anotada en el
     log de diagnóstico (gmail-hora.log): «previa: N cookies» o
     «sin sesión en el almacén».
  4. El aviso de «ningún navegador disponible» ya no remite al botón
     del monitor (callejón sin salida): pide instalar Chrome/Edge.

NOVEDADES DE LA VERSIÓN 3.2.20 (la sesión activa ya no necesita ventana)'''
s = rep(s, old, new)
open(p, 'w', encoding='utf-8').write(s)
print('✓ versiones 3.2.21 + LEEME')
