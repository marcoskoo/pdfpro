# Genera scripts/test_gmail_hora_3221.js a partir del de v3.2.20:
# v3.2.21 — EL BOTÓN «CONECTAR GMAIL» YA NO ABRE UNA VENTANA ROTA.
# La captura del usuario mostró el consentimiento de Google muriendo con
# «Error 400: invalid_request — Missing required parameter: client_id»
# (las credenciales del monitor OAuth no viajan en el build — el botón
# nunca funcionó) y una ventana de Gmail con sesión válida mientras la
# búsqueda fallaba sin que el log dijera qué build corría ni qué encontró
# la sesión previa. (1) gmail:conectar responde «sin-credenciales» sin
# abrir nada + aviso honesto en el renderer; (2) el aviso de «ningún
# navegador» ya no manda al botón roto; (3) el título de la ventana de
# progreso lleva la versión; (4) la comprobación previa siempre al log.
# 376 + 7 = 383.
import sys

src = open('scripts/test_gmail_hora_3220.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.20 — SESIÓN PREVIA SIN VENTANA. La captura del usuario
   lo probó: la ventana de login estaba ABIERTA mostrando el buzón (sesión
   de Gmail válida) un minuto DESPUÉS de que la búsqueda fallara con
   «ventana cerrada» en <1 s — la cosecha de cookies dependía de que esa
   ventana sobreviviera los ~3,5 s del sondeo, y algo la mataba antes.
   (1) _gmailHoraSesionYaValida() lee el ALMACÉN de la partición
   'persist:gmail-login' (sin ventana): si hay cookies de sesión de
   google.com (SID/SAPISID/HSID/SSID/APISID) devuelve todas las de
   google.com; (2) la ronda de login usa esa sesión previa ANTES del
   candado v3.2.15 y ANTES de abrir la ventana: inyecta y reintenta la
   búsqueda sin ceremonia — con sesión activa NO se abre ventana alguna;
   (3) cierre anómalo = <5 s, la haya visto o no (v3.2.19 exigía «nunca
   vista» y dejaba fuera el caso real); (4) el cierre de la ventana tras
   un login completado (resuelto) ya no se reporta como fallo. Incluye la
   regresión completa v3.2.19 (370 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3220.js */""",
    """/* Pruebas v3.2.21 — EL BOTÓN «CONECTAR GMAIL» YA NO ABRE UNA VENTANA
   ROTA. La captura del usuario mostró el consentimiento de Google
   muriendo con «Error 400: invalid_request — Missing required parameter:
   client_id»: las credenciales del monitor OAuth (src/gmail-credentials.json)
   no viajan en el build — el botón nunca funcionó en ningún instalador.
   Además, la misma captura mostraba una ventana de Gmail con el buzón
   (sesión válida en el almacén) mientras la búsqueda fallaba, sin que el
   log dijera qué build corría ni qué encontró la sesión previa.
   (1) gmail:conectar responde «sin-credenciales» SIN abrir nada y el
   aviso del renderer explica que la hora NO necesita ese flujo;
   (2) el aviso de «ningún navegador» ya no remite al botón roto (pide
   instalar Chrome/Edge); (3) el título de la ventana de progreso lleva
   la versión — cada captura se autoidentifica; (4) la comprobación de
   sesión previa queda SIEMPRE anotada en gmail-hora.log. Incluye la
   regresión completa v3.2.20 (376 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3221.js */""")

# 2) banner
rep(r"""T('banner v3.2.20', /CORPAC AIS\/ARO Platform v3\.2\.20/.test(html), true);""",
    r"""T('banner v3.2.21', /CORPAC AIS\/ARO Platform v3\.2\.21/.test(html), true);""")

# 2b) las anclas v3.2.13/v3.2.17 se actualizan a la forma v3.2.21:
#     el aviso NavegadorFalta ya NO remite al OAuth roto (pide Chrome/Edge)
#     y el título de la ventana de progreso lleva la versión
rep(r"""T('renderer: rama NavegadorFalta — aviso con la causa y alternativa «Conectar Gmail» sin navegador', (function () { var i = html.indexOf("r.tipo==='NavegadorFalta'"); var s = html.slice(i, i + 400); return i >= 0 && s.includes('Conectar Gmail') && s.includes('sin navegador'); })(), true);""",
    r"""T('renderer: rama NavegadorFalta — aviso con la causa y alternativa real (v3.2.21: instalar Chrome/Edge, no el OAuth roto)', (function () { var i = html.indexOf("r.tipo==='NavegadorFalta'"); var s = html.slice(i, i + 700); return i >= 0 && s.includes('instala Google Chrome o Microsoft Edge') && s.includes('la hora se buscará sola'); })(), true);""")
rep(r"""T('main: ventana de progreso — pequeña, MINIMIZABLE e independiente', /width: 480, height: 360/.test(mainjs) && mainjs.includes('minimizable: true') && mainjs.includes("'PDFPro — Progreso Gmail'") && mainjs.includes('preload-progreso.js'), true);""",
    r"""T('main: ventana de progreso — pequeña, MINIMIZABLE e independiente (v3.2.21: título con versión)', /width: 480, height: 360/.test(mainjs) && mainjs.includes('minimizable: true') && mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'") && mainjs.includes('preload-progreso.js'), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.21 — botón Conectar Gmail sin ventana rota + autoidentificación ════ */
  console.log('── v3.2.21: OAuth del monitor honesto y capturas autoidentificadas ──');
  T('main: gmail:conectar rechaza SIN abrir nada cuando faltan credenciales OAuth (client_id vacío)', /gmail:conectar', async \(\) => \{[\s\S]{0,900}if \(!gmail\.CLIENT_ID \|\| !gmail\.CLIENT_SECRET\)[\s\S]{0,200}return \{ error: 'sin-credenciales' \};/.test(mainjs), true);
  T('main: el rechazo queda anotado en gmail-hora.log («build sin credenciales OAuth»)', mainjs.includes('gmail:conectar rechazado: build sin credenciales OAuth del monitor (client_id vacío)'), true);
  T('html: el aviso del botón explica que la hora NO necesita OAuth (client_id)', html.includes("r.error==='sin-credenciales'") && html.includes('no hacen falta para la hora'), true);
  T('html: el aviso de «ningún navegador» ya NO remite al botón «Conectar Gmail» (callejón sin salida)', !html.includes('pulsa «Conectar Gmail» en el panel 📧 y la hora se buscará por Google sin navegador') && html.includes('instala Google Chrome o Microsoft Edge y vuelve a cargar el PDF'), true);
  T('main: el título de la ventana de progreso lleva la versión (cada captura se autoidentifica)', mainjs.includes("title: 'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'"), true);
  T('main: la comprobación previa queda SIEMPRE al log (¿qué encontró el almacén?)', mainjs.includes("gmailHoraLog('previa: ' + (previas ? previas.length + ' cookies de google.com — sesión válida en el almacén de login' : 'sin sesión de google.com en el almacén de login'))"), true);
  T('main: v3.2.20 intacto (sesión previa antes del candado y de la ventana)', /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2400}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3221.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3221.js generado')
