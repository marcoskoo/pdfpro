# Genera scripts/test_gmail_hora_3217.js a partir del de v3.2.16:
# v3.2.17 — VENTANA DE PROGRESO de la búsqueda de la hora (petición del
# usuario: «ver en texto los pasos que está haciendo en una pequeña
# ventana que pueda minimizarse»). Prueba la ventana (src/progreso.html +
# src/preload-progreso.js), su gestión en main (abrir con cada búsqueda,
# historial con tope, showInactive, did-finish-load, cierre al salir), los
# mensajes finales ✔/✖, la marca de hora de Lima y que cada consulta
# EXACTA a Gmail se muestra. 344 de regresión + 12 nuevas = 356.
import sys

src = open('scripts/test_gmail_hora_3216.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.16 — el MATCH del nombre soporta varios «(n)» de
   duplicado: los archivos reales se descargan como «ATC CM468 11NOV
   (1) (1).pdf» y la comparación solo quitaba UN «(n)» → «atccm46811nov1»
   ≠ «atccm46811nov» → ningún correo hacía match y la hora JAMÁS se
   capturaba. (1) nombreComparable (hora.js, compartida por API escritorio
   y vía asistida) y gmailNombreBase (renderer, API web) quitan TODOS los
   «(n)» finales; (2) la búsqueda filename: reintenta con la base sin
   marcadores y el texto libre/match estricto usan esa misma base; (3) el
   año por defecto de parseHoraGmail es el de la ZONA de la cuenta (Lima),
   no el de UTC (bug de fin de año). Incluye la regresión completa
   v3.2.15 (335 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3216.js */""",
    """/* Pruebas v3.2.17 — VENTANA DE PROGRESO de la búsqueda de la hora
   (petición del usuario: «carga Gmail pero no hace nada más — ver en
   texto los pasos que está haciendo en una pequeña ventana que pueda
   minimizarse»). (1) ventana independiente y minimizable
   (src/progreso.html + src/preload-progreso.js) con el historial de pasos
   en tiempo real: navegador, login, cookies, cada consulta EXACTA a
   Gmail, el recorrido de la bandeja correo por correo y el resultado
   final ✔/✖; (2) se abre con cada búsqueda sin robar el foco
   (showInactive), el historial completo se reenvía al cargar
   (did-finish-load) y al reabrirse, con tope de 400 líneas; (3)
   minimizarla o cerrarla NO cancela la búsqueda; (4) before-quit la
   cierra. Incluye la regresión completa v3.2.16 (344 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3217.js */""")

# 2) banner
rep(r"""T('banner v3.2.16', /CORPAC AIS\/ARO Platform v3\.2\.16/.test(html), true);""",
    r"""T('banner v3.2.17', /CORPAC AIS\/ARO Platform v3\.2\.17/.test(html), true);""")

# 2b) el patrón del candado (v3.2.15) permite el mensaje de progreso
#     intercalado entre «= true» y la limpieza del candado
rep(r"""T('main: el candado se activa al cancelar y se limpia al completar el login', /_gmailHoraLoginCancelado = true;[\s\S]{0,400}\/\/ el login sí se completó/.test(mainjs) && /_gmailHoraLoginCancelado = false;\s+\/\/ el login sí se completó/.test(mainjs), true);""",
    r"""T('main: el candado se activa al cancelar y se limpia al completar el login', /_gmailHoraLoginCancelado = true;[\s\S]{0,700}\/\/ el login sí se completó/.test(mainjs) && /_gmailHoraLoginCancelado = false;\s+\/\/ el login sí se completó/.test(mainjs), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.17 — ventana de progreso de la búsqueda de la hora ════ */
  console.log('── v3.2.17: ventana de progreso (pasos visibles en texto) ──');
  var progresoHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'progreso.html'), 'utf8');
  var progresoPre = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload-progreso.js'), 'utf8');
  T('main: ventana de progreso — pequeña, MINIMIZABLE e independiente', /width: 480, height: 360/.test(mainjs) && mainjs.includes('minimizable: true') && mainjs.includes("'PDFPro — Progreso Gmail'") && mainjs.includes('preload-progreso.js'), true);
  T('main: el historial de pasos viaja por «gmail-hora:progreso» con tope de 400 líneas', mainjs.includes("'gmail-hora:progreso'") && mainjs.includes('_GMAIL_PROGRESO_MAX = 400') && /function gmailProgresoLinea\(msg, tipo, archivo\) \{[\s\S]{0,400}_gmailProgresoLista\.push/.test(mainjs), true);
  T('main: gmailHoraEvento alimenta la ventana de progreso (cada paso llega a ambas ventanas)', /function gmailHoraEvento\(msg, tipo\) \{[\s\S]{0,700}gmailProgresoLinea\(msg, tipo\);\s*\}/.test(mainjs), true);
  T('main: la ventana se abre con cada búsqueda y anuncia el archivo buscado', mainjs.includes('gmailProgresoAbrir(nombre);') && mainjs.includes('Búsqueda de la hora de recepción de «${nombre}» (vía asistida)…'), true);
  T('main: mensajes finales — ✔ hora obtenida y ✖ en cada fallo (navegador, login, sesión)', mainjs.includes('✔ Hora de recepción de «${nombre}»') && mainjs.includes('✖ No se pudo iniciar el navegador de búsqueda') && mainjs.includes('✖ No se completó el inicio de sesión en Gmail (') && mainjs.includes('✖ Se omitió el inicio de sesión') && mainjs.includes('✖ La sesión de Gmail no se pudo transferir'), true);
  T('main: se muestra sin robar el foco (showInactive) y el historial se reenvía al terminar de cargar', mainjs.includes('showInactive()') && mainjs.includes("webContents.on('did-finish-load', gmailProgresoEnviar)"), true);
  T('main: minimizar o cerrar la ventana NO cancela la búsqueda (visor; se reabre con la siguiente)', /'closed', \(\) => \{ _gmailProgresoWin = null; \}/.test(mainjs), true);
  T('main: before-quit cierra también la ventana de progreso', /before-quit[\s\S]{0,600}_gmailProgresoWin\.close\(\)/.test(mainjs), true);
  T('preload-progreso.js: expone onGmailProgreso escuchando «gmail-hora:progreso»', progresoPre.includes("ipcRenderer.on('gmail-hora:progreso'") && progresoPre.includes('onGmailProgreso'), true);
  T('progreso.html: consola de texto con auto-scroll, tope de líneas y aviso de que puede minimizarse', progresoHtml.includes('scrollTop = log.scrollHeight') && progresoHtml.includes('MAX_LINEAS = 400') && progresoHtml.includes('Puede minimizarse o cerrarse — la búsqueda sigue en segundo plano') && progresoHtml.includes('onGmailProgreso'), true);
  T('progreso.html: marcas de hora en hora de Lima (UTC−5) y colores por tipo', progresoHtml.includes('300 * 60000') && progresoHtml.includes('.login{') && progresoHtml.includes('.ok{') && progresoHtml.includes('.err{'), true);
  T('service: cada consulta EXACTA a Gmail se muestra («Consultando Gmail: …»)', svcjs.includes('Consultando Gmail: ${query}'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3217.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3217.js generado')
