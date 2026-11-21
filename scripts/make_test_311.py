# Genera scripts/test_gmail_hora_3211.js a partir del de v3.2.10:
# v3.2.11 — causa raíz de «la captura no se da»: el servicio esperaba 2,5 s
# fijos a que Gmail renderizara los resultados (en frío: «archivo no
# encontrado» aunque el correo estaba) y leía la hora una sola vez
# (HoraNoExtraidaError silencioso). Ahora: espera real de hasta 12 s +
# relectura hasta 8 s; el renderer avisa esos casos y la re-búsqueda de 60 s
# también usa la vía asistida cuando la sesión respondió (sin OAuth, antes
# no hacía nada). Regresión 286 + 7 nuevas = 293.
import sys

src = open('scripts/test_gmail_hora_3210.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.10 — la captura de la hora de recepción GARANTIZADA:
   sin vía asistida (web o escritorio sin Playwright) la búsqueda ya no
   termina en silencio (botón «🔗 Iniciar sesión en Gmail» + aviso +
   reintento); en escritorio sin servicio ese botón conecta por OAuth;
   si el correo aún no llegó se rebusca solo cada 60 s (máx. 4, solo
   API, sin ventanas) y al aplicarse la hora la re-búsqueda se cancela.
   Incluye la regresión completa v3.2.9 (275 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3210.js */""",
    """/* Pruebas v3.2.11 — causa raíz de «la captura de la hora no se da»:
   el servicio esperaba 2,5 s fijos a que Gmail renderizara resultados
   (en arranque en frío concluía «archivo no encontrado» aunque el correo
   estaba) y leía la hora una sola vez (HoraNoExtraidaError en silencio).
   Ahora: _buscar espera hasta 12 s a que haya filas o aviso de vacío
   (chequeando el login cada 400 ms), _extraerHora reintenta hasta 8 s
   (_extraerHoraUna), el renderer AVISA esos casos y la re-búsqueda de
   60 s también usa la vía asistida cuando la sesión respondió
   (_gmailAsistidaSesionOk; sin OAuth antes las rondas no hacían nada).
   Incluye la regresión completa v3.2.10 (286 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3211.js */""")

# 2) banner
rep(r"""T('banner v3.2.10', /CORPAC AIS\/ARO Platform v3\.2\.10/.test(html), true);""",
    r"""T('banner v3.2.11', /CORPAC AIS\/ARO Platform v3\.2\.11/.test(html), true);""")

# 3) firma gmailHoraArchivo: (manual,reintento)
rep(r"""T('gmailHoraArchivo acepta manual; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);""",
    r"""T('gmailHoraArchivo acepta manual y reintento; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual,reintento\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);""")
rep(r"""T('v3.2.3: gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual\)/.test(html) && /gmailHoraBuscar\(nombre,!!manual\)/.test(html), true);""",
    r"""T('v3.2.3: gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual,reintento\)/.test(html) && /gmailHoraBuscar\(nombre,!!manual\)/.test(html), true);""")

# 4) ArchivoNoEncontrado: bandera + toast solo fuera de reintentos
rep(r"""T('archivo aún no llegado: avisa que reintentará y agenda la re-búsqueda (v3.2.10)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);gmailHoraReintentoAgendar\(\);toast\('📭/.test(html), true);""",
    r"""T('archivo aún no llegado: marca sesión válida, agenda re-búsqueda y avisa (toast solo fuera de reintentos)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📭/.test(html), true);""")

# 5) presupuesto renovado solo en búsquedas nuevas
rep(r"""T('cada búsqueda renueva el presupuesto de reintentos', /async function gmailHoraArchivo\(manual\)\{\s*\n\s*_gmailReintentoN=0;/.test(html), true);""",
    r"""T('cada búsqueda NUEVA renueva el presupuesto; las rondas de re-búsqueda no', /async function gmailHoraArchivo\(manual,reintento\)\{\s*\n\s*if\(!reintento\)_gmailReintentoN=0;/.test(html), true);""")

# 6) re-búsqueda: ya no es solo API — también la vía asistida con sesión válida
rep("""  T('re-búsqueda: solo la vía API (nunca gmailHoraArchivo ni ventanas), cada 60 s, máx. 4', (function () { var i = html.indexOf('function gmailHoraReintentoAgendar'); var s = html.slice(i, i + 1200); return s.includes('},60000);') && s.includes('_gmailReintentoN>=4') && s.includes('gmailHoraApiPorArchivo(nombre,_tab)') && !s.includes('gmailHoraArchivo(') && !s.includes('gmailHoraBuscar'); })(), true);""",
    """  T('re-búsqueda: API primero y, con sesión asistida válida, también la vía asistida (jamás login sorpresivo), cada 60 s, máx. 4', (function () { var i = html.indexOf('function gmailHoraReintentoAgendar'); var s = html.slice(i, i + 1600); return s.includes('},60000);') && s.includes('_gmailReintentoN>=4') && s.includes('gmailHoraApiPorArchivo(nombre,_tab)') && s.includes('_gmailAsistidaSesionOk&&gmailHoraPuede()') && s.includes('gmailHoraArchivo(false,true)') && !s.includes('gmailHoraBuscar'); })(), true);""")

# 6b) pruebas antiguas de las ramas de resultado: patrones actualizados a
#     HoraNoExtraida visible y bandera antes del botón en fallos de sesión
rep(r"""T('silencio también si el correo no muestra hora (la sesión funcionó)', /tipo==='HoraNoExtraidaError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);""",
    r"""T('correo sin hora legible: ya NO es silencio — avisa y reintenta (v3.2.11)', /tipo==='HoraNoExtraidaError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📧/.test(html), true);""")
rep(r"""T('login cancelado se AVISA y muestra el botón de reintento', /tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);""",
    r"""T('login cancelado se AVISA y muestra el botón de reintento', /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);""")
rep(r"""T('sesión no transferida se AVISA y muestra el botón de reintento', /tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);""",
    r"""T('sesión no transferida se AVISA y muestra el botón de reintento', /tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);""")
rep(r"""T('v3.2.3: LoginCancelado MUESTRA el botón y lo dice en el toast', /if\(r\.tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html) && /pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);""",
    r"""T('v3.2.3: LoginCancelado MUESTRA el botón y lo dice en el toast', /if\(r\.tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html) && /pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);""")
rep(r"""T('v3.2.3: SesionNoTransferida también muestra el botón', /if\(r\.tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);""",
    r"""T('v3.2.3: SesionNoTransferida también muestra el botón', /if\(r\.tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);""")
rep("""  T('globals de sesión/reintento declarados junto a los de la hora', html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0;'), true);""",
    """  T('globals de sesión/reintento declarados junto a los de la hora', html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false;'), true);""")

# 7) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.11 — causa raíz: el servicio espera a que Gmail renderice ════ */
  console.log('── v3.2.11: el servicio ya no se adelanta a Gmail ──');
  T('servicio: _buscar sin espera fija de 2,5 s — espera hasta 12 s a que haya filas o aviso de vacío', svcjs.includes('while (Date.now() - t0 < 12000)') && svcjs.includes('waitForTimeout(400)') && !svcjs.includes('waitForTimeout(2500)') && /tr\.zA, \[role="row"\]'\)\.length > 0/.test(svcjs), true);
  T('servicio: mientras espera resultados comprueba si Gmail pide sesión (cada 400 ms)', /while \(Date\.now\(\) - t0 < 12000\)\s*\{\s*\n\s*await this\.page\.waitForTimeout\(400\);\s*\n\s*await this\._esperarLogin\(\);/.test(svcjs), true);
  T('servicio: aviso de «sin resultados» unificado (ES y EN, también «no se encontraron mensajes»)', (svcjs.match(/no se encontraron coincidencias\|no se encontraron mensajes\|no matches found/g) || []).length, 2);
  T('servicio: _extraerHora reintenta hasta 8 s con _extraerHoraUna (antes una sola lectura)', svcjs.includes('async _extraerHoraUna()') && svcjs.includes('while (Date.now() - t0 < 8000)') && /throw new HoraNoExtraidaError\(\);/.test(svcjs), true);
  T('renderer: «HoraNoExtraida» ya no es silencio — marca sesión, agenda re-búsqueda y avisa', html.includes("tipo==='HoraNoExtraidaError'){gmailLoginBtnOcultar();_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar();if(!reintento)toast('📧 El correo está, pero la hora no se pudo leer todavía — se reintentará solo','warn',9000);return;}"), true);
  T('renderer: bandera _gmailAsistidaSesionOk — marcada cuando Gmail respondió, limpia si la sesión falla', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 4600); return /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;/.test(s) && /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;/.test(s) && /tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;/.test(s) && /gmailLoginBtnOcultar\(\);\s*\/\/ la sesión quedó funcionando\s*\n\s*_gmailAsistidaSesionOk=true;/.test(s); })(), true);

  console.log('── v3.2.11: la ronda de re-búsqueda también usa la vía asistida (código real) ──');
  _gmailAsistidaSesionOk = true;
  gmailHoraPuede = function () { return true; };
  var CAPT_ASIST = null;
  gmailHoraArchivo = async function (m, r) { CAPT_ASIST = [m, r]; };
  RETRY = [];
  await CB();
  T('con sesión asistida válida: la ronda llama a gmailHoraArchivo(false,true) tras probar la API', RETRY.length === 1 && CAPT_ASIST && CAPT_ASIST[0] === false && CAPT_ASIST[1] === true, true);
  global.setTimeout = _st; global.clearTimeout = _ct;

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3211.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3211.js generado')
