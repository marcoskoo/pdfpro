# Genera scripts/test_gmail_hora_324.js a partir del de v3.2.3:
# v3.2.4 — corrige dos reportes reales con captura:
# (1) «la ventana de Gmail cargó por un segundo y se cerró»: el sondeo
#     tomaba la pantalla de carga de mail.google.com (que aparece SIN
#     sesión 1-3 s antes del redirect al login) por «sesión lista» y
#     cerraba la ventana cosechando cookies parciales. Ahora exige
#     cookies de sesión (SID/SAPISID/HSID/SSID/APISID) + navegación
#     terminada + 2 sondeos consecutivos.
# (2) «no se obtuvieron los datos correctamente de Matrícula»: plan
#     SRU 2226 (designador ICAO + nº de vuelo) no se extraía y el campo
#     conservaba la matrícula del documento ANTERIOR (OB-2176P…), que
#     viajaba al nombre del archivo exportado. Ahora: respaldo c7 para
#     callsigns de empresa + el campo se LIMPIA si nada se detecta.
# Regresión 191 de v3.2.3 íntegra (1 prueba actualizada al nuevo
# comportamiento pedido por el usuario).
import sys

src = open('scripts/test_gmail_hora_323.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.3 — corrige «No se completó el inicio de sesión en Gmail»:
   la ventana de login interna ahora usa un User-Agent de Chrome REAL
   (Google bloquea el login de navegadores embebidos con UA de Electron —
   «Este navegador o aplicación podría no ser seguro»), hay un botón
   «🔗 Iniciar sesión en Gmail» junto a Hora Recepción para reintentar al
   momento (manual=true salta el cooldown de 30 s), el login comparte
   promesa entre llamadas concurrentes y la ventana toma el foco. Incluye
   la regresión completa v3.2.2 (175 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_323.js */""",
    """/* Pruebas v3.2.4 — corrige «la ventana de Gmail cargó un segundo y se
   cerró» (el sondeo tomaba la pantalla de carga de mail.google.com SIN
   sesión por «sesión lista»: ahora exige cookies SID/SAPISID/… con la
   página terminada de cargar, 2 sondeos seguidos) y la matrícula de
   planes de aerolínea (SRU 2226, JAP 7163…): el casillero 7 con
   designador ICAO + nº de vuelo se reconoce también suelto en el texto,
   y si nada se detecta el campo se LIMPIA (antes quedaba la matrícula
   del documento anterior, que viajaba al nombre del archivo exportado).
   Incluye la regresión completa v3.2.3 (191 pruebas). Ejecuta el CÓDIGO
   REAL de web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_324.js */""")

# 2) banner → v3.2.4
rep("T('banner v3.2.3', /CORPAC AIS\\/ARO Platform v3\\.2\\.3/.test(html), true);",
    "T('banner v3.2.4', /CORPAC AIS\\/ARO Platform v3\\.2\\.4/.test(html), true);")

# 3) main.js — sondeo del login con sesión real (tras las pruebas v3.2.3)
rep("""T('v3.2.3: preload reenvía manual al IPC', preloadjs.includes("gmailHoraBuscar: (archivo, manual) => ipcRenderer.invoke('gmail-hora:buscar', archivo, manual)"), true);""",
    r"""T('v3.2.3: preload reenvía manual al IPC', preloadjs.includes("gmailHoraBuscar: (archivo, manual) => ipcRenderer.invoke('gmail-hora:buscar', archivo, manual)"), true);
T('v3.2.4: el sondeo del login exige cookies de sesión (SID/SAPISID/HSID/SSID/APISID)', /const conSesionGoogle = async \(\) =>/.test(mainjs) && /\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\]/.test(mainjs), true);
T('v3.2.4: la ventana NO se cierra mientras la página sigue cargando (pantalla de carga sin sesión)', /webContents\.isLoading\(\)/.test(mainjs), true);
T('v3.2.4: sesión confirmada 2 sondeos seguidos antes de cerrar la ventana', mainjs.includes('confirmaciones === 2'), true);
T('v3.2.4: log de login incompleto incluye la URL final (diagnóstico)', /login no completado \(\$\{motivo \|\| 'ventana cerrada'\}\)\$\{urlLogin/.test(mainjs), true);""")

# 4) estáticas del renderer (matrícula) — tras la prueba de autoOcrMatricula
rep("""T('autoOcrMatricula sobrescribe con _fplSetMatricula', /autoOcrMatricula[\\s\\S]*?_fplSetMatricula\\(m\\)/.test((function(){var i=html.indexOf('async function autoOcrMatricula');return html.slice(i,i+2600);})()), true);""",
    r"""T('autoOcrMatricula sobrescribe con _fplSetMatricula', /autoOcrMatricula[\s\S]*?_fplSetMatricula\(m\)/.test((function(){var i=html.indexOf('async function autoOcrMatricula');return html.slice(i,i+2600);})()), true);
T('v3.2.4: sin detección el campo se LIMPIA y se avisa («✈ Matrícula no detectada»)', /var nadaDetectado=function\(\)\{\s*_fplSetMatricula\(''\);/.test(html) && html.includes('Matrícula no detectada en este documento'), true);
T('v3.2.4: autoOcrMatricula termina en nadaDetectado() y el OCR es vía interna', html.includes('nadaDetectado();') && /if\(window\.Tesseract&&pdfDoc\)\{/.test(html), true);
T('v3.2.4: respaldo c7 con designadores ICAO + nº de vuelo (SRU2226, JAP7163…)', html.includes('_FPL_DESIGNADOR.source.replace'), true);
T('v3.2.4: nvAutoMatricula (Word/Excel) también limpia sin detección', /function nvAutoMatricula[\s\S]{0,700}?_fplSetMatricula\(''\)/.test(html), true);""")

# 5) funcional: plan SRU 2226 (reporte real con captura) — tras la prueba
#    de sobrescritura entre documentos
rep("""  campos.selloMatricula.value = 'OB2032 1100 MK';   // valor del documento anterior
  await autoOcrMatricula();
  T('cargar otro FPL SOBRESCRIBE («OB2032 1100 MK» → «OB2066 2020 MK»)', campos.selloMatricula.value, 'OB2066 2020 MK');""",
    r"""  campos.selloMatricula.value = 'OB2032 1100 MK';   // valor del documento anterior
  await autoOcrMatricula();
  T('cargar otro FPL SOBRESCRIBE («OB2032 1100 MK» → «OB2066 2020 MK»)', campos.selloMatricula.value, 'OB2066 2020 MK');
  global.pageTexts = ['PV CIX LIM 2226\nAERONAVE SRU2226 B733\nAERODROMO DE SALIDA SPJC 0145'];
  global.fileName = 'PV CIX LIM 2226.pdf';
  await autoOcrMatricula();
  T('v3.2.4: plan de aerolínea SRU 2226 → campo «SRU2226 0145 MK» (reporte real)', campos.selloMatricula.value, 'SRU2226 0145 MK');""")

# 6) actualizar la prueba del comportamiento viejo: el usuario pidió que
#    el campo SIEMPRE refleje el documento cargado (se limpia sin detección)
rep("""  campos.selloMatricula.value = 'OB2147 MK';        // escrito a mano
  await autoOcrMatricula();
  T('documento sin matrícula → conserva lo escrito a mano', campos.selloMatricula.value, 'OB2147 MK');""",
    """  campos.selloMatricula.value = 'OB2147 MK';        // valor del documento ANTERIOR
  await autoOcrMatricula();
  T('v3.2.4: documento sin matrícula → el campo se LIMPIA (antes quedaba el valor viejo y viajaba al exportar)', campos.selloMatricula.value, '');""")

open('scripts/test_gmail_hora_324.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_324.js generado')
