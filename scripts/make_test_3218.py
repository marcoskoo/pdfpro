# Genera scripts/test_gmail_hora_3218.js a partir del de v3.2.17:
# v3.2.18 — corrección de la VENTANA DE PROGRESO que quedaba VACÍA.
# (1) El preload asignaba «window.pdfproProgreso» en su mundo aislado:
#     con contextIsolation la página NUNCA lo veía, el listener no se
#     registraba y no llegaba ni una línea — ahora puente por
#     contextBridge.exposeInMainWorld (como 'pdfproDesktop'). (2) El
#     renderer re-pegaba el historial completo en cada envío (líneas
#     duplicadas): ahora solo añade las nuevas, con reinicio si el
#     historial se recortó. (3) El servicio informa cuántos correos trajo
#     cada consulta / «sin resultados» / «12 s sin respuesta de Gmail».
#     (4) Guardia global de 7 min en main: si algo se cuelga, se cancela,
#     se cierra el navegador + login y la cola no queda bloqueada.
#     356 de regresión + 5 nuevas = 361.
import sys

src = open('scripts/test_gmail_hora_3217.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.17 — VENTANA DE PROGRESO de la búsqueda de la hora
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
   Ejecutar: node scripts/test_gmail_hora_3217.js */""",
    """/* Pruebas v3.2.18 — CORRECCIÓN de la ventana de progreso que quedaba
   VACÍA («solo ventana de progreso, no indica nada» — reporte del
   usuario). (1) El preload asignaba «window.pdfproProgreso» en su mundo
   aislado: con contextIsolation la página NUNCA lo veía, el listener no
   se registraba y no llegaba ni una línea — ahora puente por
   contextBridge.exposeInMainWorld (como 'pdfproDesktop'). (2) El
   renderer re-pegaba el historial completo en cada envío (líneas
   duplicadas): ahora solo añade las nuevas, con reinicio si el historial
   se recortó. (3) El servicio informa cuántos correos trajo cada
   consulta / «sin resultados» / «12 s sin respuesta de Gmail». (4)
   Guardia global de 7 min en main: si algo se cuelga de verdad, la
   búsqueda se cancela, se cierra el navegador + login y la cola no
   queda bloqueada para siempre. Incluye la regresión completa v3.2.17
   (356 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3218.js */""")

# 2) banner
rep(r"""T('banner v3.2.17', /CORPAC AIS\/ARO Platform v3\.2\.17/.test(html), true);""",
    r"""T('banner v3.2.18', /CORPAC AIS\/ARO Platform v3\.2\.18/.test(html), true);""")

# 3) el test del preload se REFUERZA: debe exigir el puente por
#     contextBridge (la causa raíz de la ventana vacía era la asignación
#     directa window.* en el mundo aislado)
rep(r"""T('preload-progreso.js: expone onGmailProgreso escuchando «gmail-hora:progreso»', progresoPre.includes("ipcRenderer.on('gmail-hora:progreso'") && progresoPre.includes('onGmailProgreso'), true);""",
    r"""T('preload-progreso.js: puente por contextBridge (bug v3.2.17: window.* en el mundo aislado NUNCA llegaba a la página)', progresoPre.includes("contextBridge.exposeInMainWorld('pdfproProgreso'") && progresoPre.includes("ipcRenderer.on('gmail-hora:progreso'") && !progresoPre.includes('window.pdfproProgreso ='), true);""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.18 — ventana de progreso que SÍ muestra los pasos ════ */
  console.log('── v3.2.18: corrección de la ventana de progreso ──');
  T('progreso.html: solo añade las líneas NUEVAS (antes se re-pegaba todo el historial)', progresoHtml.includes('var vistos = 0;') && progresoHtml.includes('lineas.slice(vistos)') && progresoHtml.includes('if (lineas.length < vistos)'), true);
  T('service: cada consulta informa cuántos correos trajo (o «sin resultados»)', svcjs.includes('Bandeja: ${n} correo(s) traídos por la consulta.') && svcjs.includes('Gmail responde: sin resultados para esta consulta.'), true);
  T('service: aviso si Gmail no responde tras 12 s (antes invisible)', svcjs.includes('12 s sin resultados ni aviso de Gmail'), true);
  T('main: guardia global de 7 min — el núcleo corre contra un timeout (GmailHoraTimeout)', mainjs.includes('_gmailHoraBuscarNucleo') && mainjs.includes('Promise.race([nucleo, guardia])') && mainjs.includes("'GmailHoraTimeout'") && mainjs.includes('7 * 60 * 1000') && mainjs.includes('nucleo.catch(() => {})'), true);
  T('main: al vencer la guardia se cierra el navegador y el login, y el servicio se renueva', /name === 'GmailHoraTimeout'[\s\S]{0,700}_gmailHoraLoginWin\.close\(\)/.test(mainjs) && /GmailHoraTimeout'[\s\S]{0,500}_gmailHoraSvc = null/.test(mainjs), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3218.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3218.js generado')
