# Genera scripts/test_gmail_hora_3215.js a partir del de v3.2.14:
# v3.2.15 — fin del aviso en bucle «No se completó el inicio de sesión de
# Gmail»: candado por sesión en main (automático no reabre la ventana tras
# un cancel; solo manual), motivo del fallo visible en el aviso, ventana
# alwaysOnTop, OAuth conectado → no se abre la ventana del buscador, aviso
# una vez por sesión. 325 de regresión (2 pruebas del cooldown v3.2.3 se
# actualizan al candado nuevo) + 10 nuevas = 335.
import sys

src = open('scripts/test_gmail_hora_3214.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.14 — ORDEN EXIGIDO POR EL USUARIO para la búsqueda de
   la hora de recepción: primero se verifica el ÚLTIMO correo recibido,
   comparando el nombre de su adjunto con el del archivo cargado; si hace
   match se toma su hora; si no, se repite con el penúltimo y sucesivos
   (hasta 40; después cae al respaldo filename:/texto libre para correos
   más antiguos o archivados). En las DOS vías: API OAuth
   (gmail-monitor.pollOrdenado / gmailWebBarridoOrdenado — corta en el
   primer acierto) y asistida (_recorrerBandeja por el DOM de Gmail).
   Comparación compartida nombreComparable/adjuntoCoincide: extensión,
   «(n)» de duplicados, signos, mayúsculas y espacios múltiples no
   importan. La cadena se verificó de verdad contra gmail.com
   (scripts/test_servicio_real_3214.js). Incluye la regresión completa
   v3.2.13 (303 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3214.js */""",
    """/* Pruebas v3.2.15 — fin del aviso en bucle «No se completó el inicio
   de sesión de Gmail»: (1) candado por sesión en main — tras UN login
   cancelado las búsquedas AUTOMÁTICAS no vuelven a abrir la ventana
   (antes el cooldown era de 30 s y cada PDF la reabría); solo el botón
   «🔗 Iniciar sesión en Gmail» (manual=true) la abre; (2) el PORQUÉ del
   fallo (ventana cerrada / tiempo agotado / no se pudo cargar) llega al
   aviso vía { cookies, motivo }; (3) la ventana queda alwaysOnTop (no se
   esconde tras otras ventanas); (4) con Google/OAuth conectado NO se
   abre la ventana del buscador (la API es la vía autorizada); (5) el
   aviso sale UNA vez por sesión. Incluye la regresión completa v3.2.14
   (325 pruebas, con las 2 del cooldown v3.2.3 actualizadas al candado).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3215.js */""")

# 2) banner
rep(r"""T('banner v3.2.14', /CORPAC AIS\/ARO Platform v3\.2\.14/.test(html), true);""",
    r"""T('banner v3.2.15', /CORPAC AIS\/ARO Platform v3\.2\.15/.test(html), true);""")

# 3) prueba v3.2.3 del cooldown → candado por sesión
rep(r"""T('v3.2.3: manual=true salta el cooldown de 30 s tras login cancelado', /if \(!manual && Date\.now\(\) - _gmailHoraUltimoFalloLogin < 30000\)/.test(mainjs), true);""",
    r"""T('v3.2.15: manual=true salta el candado de sesión tras login cancelado', /if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs), true);""")

# 4) prueba del tipo LoginCancelado + cooldown → candado
rep(r"""T('main.js: tipo LoginCancelado + cooldown 30 s', /tipo: 'LoginCancelado'/.test(mainjs) && /_gmailHoraUltimoFalloLogin < 30000/.test(mainjs), true);""",
    r"""T('main.js: tipo LoginCancelado + candado por sesión (no más ventana en bucle)', /tipo: 'LoginCancelado'/.test(mainjs) && /_gmailHoraLoginCancelado = true;/.test(mainjs), true);""")

# 5) la función gmailHoraArchivo creció con el salto OAuth: ampliar la
#    ventana de la prueba de patrones de la bandera _gmailAsistidaSesionOk
rep("var s = html.slice(i, i + 4600); return /tipo==='ArchivoNoEncontradoError'",
    "var s = html.slice(i, i + 6400); return /tipo==='ArchivoNoEncontradoError'")

# 5b) la línea de globals ahora además declara _gmailLoginCancelToast
#     (v3.2.15): actualizar la cadena exacta de esa prueba heredada
rep("html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false;')",
    "html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false,_gmailLoginCancelToast=false;')")

# 6) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.15 — fin del aviso en bucle del inicio de sesión ════ */
  console.log('── v3.2.15: el aviso «No se completó el inicio de sesión» deja de salir en bucle ──');
  T('main: abrirLoginGmailEnApp resuelve { cookies, motivo } — el porqué del fallo viaja', mainjs.includes("salir({ cookies: null, motivo: motivo || 'ventana cerrada' })") && mainjs.includes("salir({ cookies, motivo: '' })"), true);
  T('main: el motivo llega al aviso («ventana cerrada», «tiempo agotado»…)', /No se completó el inicio de sesión en Gmail \(' \+ \(\(login && login\.motivo\)/.test(mainjs), true);
  T('main: candado por sesión — el automático NO reabre la ventana tras un cancel', /if \(!manual && _gmailHoraLoginCancelado\) \{[\s\S]{0,500}tipo: 'LoginCancelado'/.test(mainjs), true);
  T('main: el candado se activa al cancelar y se limpia al completar el login', /_gmailHoraLoginCancelado = true;[\s\S]{0,400}\/\/ el login sí se completó/.test(mainjs) && /_gmailHoraLoginCancelado = false;\s+\/\/ el login sí se completó/.test(mainjs), true);
  T('main: ventana de login alwaysOnTop (no puede quedar escondida tras otras ventanas)', /alwaysOnTop: true/.test(mainjs), true);
  T('renderer: OAuth conectado → NO se abre la ventana del buscador (la API es la vía autorizada)', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 6000); return /if\(!manual&&gmailIsDesktop\(\)\)\{[\s\S]{0,500}gmailEstado\(\)[\s\S]{0,400}_oauthOk[\s\S]{0,800}gmailHoraReintentoAgendar\(\);[\s\S]{0,300}return;/.test(s); })(), true);
  T('renderer: …y con OAuth el aviso es el mismo «aún no llega el correo» con re-búsqueda', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 6000); return /_oauthOk\)\{[\s\S]{0,300}gmailHoraReintentoAgendar\(\);[\s\S]{0,200}Todavía no llega el correo/.test(s); })(), true);
  T('renderer: el aviso de login cancelado sale UNA vez por sesión (_gmailLoginCancelToast)', /_gmailLoginCancelToast=false/.test(html) && /if\(!_gmailLoginCancelToast\)\{\s*_gmailLoginCancelToast=true;/.test(html), true);
  T('renderer: el aviso muestra el motivo real (r.error) y el botón «🔗» para reintentar', /toast\('🔐 '\+\(\(r&&r\.error\)\|\|'No se completó el inicio de sesión en Gmail'\)\+' — pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);
  T('renderer: la rama LoginCancelado conserva bandera + botón (regresión v3.2.3)', /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3215.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3215.js generado')
