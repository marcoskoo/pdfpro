# Genera scripts/test_gmail_hora_3219.js a partir del de v3.2.18:
# v3.2.19 — blindaje del INICIO DE SESIÓN en Gmail. El log del usuario
# mostró la ventana de login cerrándose «sola» en <1 s y luego el candado
# v3.2.15 bloqueaba el login de todos los PDF siguientes. (1) el cierre
# se instrumenta (edad + si llegó a verse, al log); (2) cierre ANÓMALO
# (<5 s sin verse o renderer muerto) → se reintenta una vez y NO dispara
# el candado; (3) loadURL reintenta tras el ERR_ABORTED del redirect de
# Google; (4) motivos honestos ('sesión ok', nunca ''→'ventana cerrada');
# (5) línea de guía con el botón 🔗 tras el fallo. 361 + 9 = 370.
import sys

src = open('scripts/test_gmail_hora_3218.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.18 — CORRECCIÓN de la ventana de progreso que quedaba
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
   Ejecutar: node scripts/test_gmail_hora_3218.js */""",
    """/* Pruebas v3.2.19 — BLINDAJE DEL INICIO DE SESIÓN en Gmail. El log del
   usuario mostró la ventana de login cerrándose «sola» en <1 s
   («✖ No se completó el inicio de sesión (ventana cerrada)» al instante)
   y después el candado v3.2.15 dejaba de intentar el login en TODOS los
   PDF siguientes. (1) El cierre de la ventana se instrumenta: edad en
   segundos + si llegó a verse, anotado en gmail-hora.log; (2) CIERRE
   ANÓMALO (<5 s sin verse, o proceso del renderer muerto) → el llamador
   REINTENTA una vez y NO dispara el candado de sesión; (3) loadURL ya no
   rinde al primer fallo: el redirect de Google a accounts.google.com
   aborta la carga inicial (ERR_ABORTED) sin que nada esté roto — se
   reintenta una vez; (4) motivos honestos: la sesión completa llega como
   «sesión ok» y nunca como «ventana cerrada» (bug del motivo vacío con
   '' || …); (5) tras un fallo, la ventana de progreso indica el paso
   siguiente (botón «🔗 Iniciar sesión en Gmail»). Incluye la regresión
   completa v3.2.18 (361 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3219.js */""")

# 2) banner
rep(r"""T('banner v3.2.18', /CORPAC AIS\/ARO Platform v3\.2\.18/.test(html), true);""",
    r"""T('banner v3.2.19', /CORPAC AIS\/ARO Platform v3\.2\.19/.test(html), true);""")

# 2b) las anclas v3.2.15 del motivo se actualizan a la forma v3.2.19:
#     «salir({cookies, motivo: ''})» era JUSTO el bug (motivo vacío →
#     «ventana cerrada» mentiroso); ahora el motivo siempre viene lleno
#     y el llamador lo imprime desde una variable
rep(r"""T('main: abrirLoginGmailEnApp resuelve { cookies, motivo } — el porqué del fallo viaja', mainjs.includes("salir({ cookies: null, motivo: motivo || 'ventana cerrada' })") && mainjs.includes("salir({ cookies, motivo: '' })"), true);""",
    r"""T('main: abrirLoginGmailEnApp resuelve { cookies, motivo } — el porqué del fallo viaja', mainjs.includes("salir({ cookies: null, motivo: motivo || 'ventana cerrada', anomalia: !!anomalia })") && mainjs.includes("motivo: cookies.length ? 'sesión ok' : 'sesión detectada pero sin cookies de google.com'"), true);""")
rep(r"""T('main: el motivo llega al aviso («ventana cerrada», «tiempo agotado»…)', /No se completó el inicio de sesión en Gmail \(' \+ \(\(login && login\.motivo\)/.test(mainjs), true);""",
    r"""T('main: el motivo llega al aviso («ventana cerrada», «tiempo agotado»…)', /const motivo = \(login && login\.motivo\) \|\| 'ventana cerrada';/.test(mainjs) && /'No se completó el inicio de sesión en Gmail \(' \+ motivo \+ '\)'/.test(mainjs), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.19 — blindaje del inicio de sesión en Gmail ════ */
  console.log('── v3.2.19: login que no se rinde (cierre anómalo ≠ cancelación) ──');
  T('main: el cierre de la ventana se instrumenta (edad + si llegó a verse, al log)', mainjs.includes('login: ventana cerrada a los ${') && mainjs.includes('visible: ${vista ? \'sí\' : \'no\'}'), true);
  T('main: cierre ANÓMALO (<5 s sin verse) → motivo propio y anomalia:true', mainjs.includes('la ventana de inicio de sesión se cerró sola a los ${') && mainjs.includes('CIERRE ANÓMALO'), true);
  T('main: renderer muerto → se reporta la causa y marca anomalía (antes quedaba mudo)', mainjs.includes("on('render-process-gone'") && mainjs.includes('proceso del navegador muerto (${det && det.reason})'), true);
  T('main: loadURL reintenta una vez (el ERR_ABORTED del redirect de Google ya no rinde)', mainjs.includes('login: loadURL falló (intento ${n})') && mainjs.includes('cargar(2);'), true);
  T('main: motivo honesto — la sesión completa es «sesión ok», jamás «ventana cerrada»', mainjs.includes("motivo: cookies.length ? 'sesión ok' : 'sesión detectada pero sin cookies de google.com'"), true);
  T('main: el login se REINTENTA una vez ante cierre anómalo (bucle de 2 intentos)', mainjs.includes('login.anomalia && intento === 1') && mainjs.includes('se reabre la ventana una vez…'), true);
  T('main: el candado v3.2.15 SOLO se activa con cancelación real del usuario', /if \(!\(login && login\.anomalia\)\) \{\s*\n\s*_gmailHoraLoginCancelado = true;/.test(mainjs), true);
  T('main: el fallo de login imprime el motivo del objeto (sin «ventana cerrada» por defecto engañoso)', mainjs.includes('const motivo = (login && login.motivo) || \'ventana cerrada\';'), true);
  T('main: tras el fallo, la ventana de progreso guía con el botón «🔗 Iniciar sesión en Gmail»', mainjs.includes('Cuando pueda, pulse «🔗 Iniciar sesión en Gmail» en la app y complete el acceso'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3219.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3219.js generado')
