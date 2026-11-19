# Genera scripts/test_gmail_hora_3210.js a partir del de v3.2.9:
# v3.2.10 — la captura de la hora garantizada: sin vía asistida → botón +
# aviso + reintento (antes silencio); escritorio sin servicio → OAuth;
# correo tardío → re-búsqueda silenciosa cada 60 s (máx. 4); al aplicar la
# hora se cancela. Regresión 275 + 12 nuevas = 287.
import sys

src = open('scripts/test_gmail_hora_329.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.9 — el panel «📧 Monitoreo Gmail» se retiró de la ficha
   del sello; el inicio de sesión pasa por el botón «🔗 Iniciar sesión
   en Gmail» (web → OAuth, escritorio → Gmail dentro de la app), la
   caja del código OAuth vive junto a ese botón y tras conectar se
   rebusca sola la hora del archivo cargado. La búsqueda automática de
   la hora (adjunto → +5 h → UTC) y los campos por pestaña de v3.2.8
   siguen intactos. Incluye la regresión completa v3.2.8 (269 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_329.js */""",
    """/* Pruebas v3.2.10 — la captura de la hora de recepción GARANTIZADA:
   sin vía asistida (web o escritorio sin Playwright) la búsqueda ya no
   termina en silencio (botón «🔗 Iniciar sesión en Gmail» + aviso +
   reintento); en escritorio sin servicio ese botón conecta por OAuth;
   si el correo aún no llegó se rebusca solo cada 60 s (máx. 4, solo
   API, sin ventanas) y al aplicarse la hora la re-búsqueda se cancela.
   Incluye la regresión completa v3.2.9 (275 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3210.js */""")

# 2) banner
rep(r"""T('banner v3.2.9', /CORPAC AIS\/ARO Platform v3\.2\.9/.test(html), true);""",
    r"""T('banner v3.2.10', /CORPAC AIS\/ARO Platform v3\.2\.10/.test(html), true);""")

# 3) globals reales al sandbox (declaran _gmailSesionToast/_gmailReintento*)
rep("""global.window = { currentUser: { name: 'Marcos Roberto Koo Paz' } };""",
    """global.window = { currentUser: { name: 'Marcos Roberto Koo Paz' } };
/* v3.2.10 — globals REALES de web/index.html: declaran _gmailSesionToast,
   _gmailReintentoT y _gmailReintentoN (los usa gmailAplicarHora real y la
   re-búsqueda silenciosa evaluadas más abajo) */
(0, eval)(extraerVar('_gmailHoraOk'));""")

# 4) prueba v3.2.0 actualizada: ArchivoNoEncontrado ya no es silencio total
rep(r"""T('silencio SOLO si no hay correo con ese archivo (la sesión funcionó)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);""",
    r"""T('archivo aún no llegado: avisa que reintentará y agenda la re-búsqueda (v3.2.10)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);gmailHoraReintentoAgendar\(\);toast\('📭/.test(html), true);""")

# 5) prueba v3.2.6 actualizada: la rama sin vía asistida ya no es un return desnudo
rep(r"""T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre,_tab\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)return;/.test(html), true);""",
    r"""T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre,_tab\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)\{/.test(html), true);""")

# 6) prueba v3.2.9 actualizada: escritorio sin servicio también va por OAuth
rep("""  T('gmailLoginManual: WEB → OAuth (gmailConnect) · ESCRITORIO → vía asistida', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 900); return /if\\(!gmailIsDesktop\\(\\)\\)\\{[\\s\\S]*?gmailConnect\\(\\);[\\s\\S]*?return;[\\s\\S]*?gmailHoraArchivo\\(true\\);/.test(s); })(), true);""",
    """  T('gmailLoginManual: WEB o ESCRITORIO sin servicio → OAuth · escritorio con servicio → vía asistida', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 1000); return /if\\(!gmailIsDesktop\\(\\)\\|\\|!gmailHoraPuede\\(\\)\\)\\{[\\s\\S]*?gmailConnect\\(\\);[\\s\\S]*?return;[\\s\\S]*?gmailHoraArchivo\\(true\\);/.test(s); })(), true);""")

# 7) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.10 — la captura de la hora, garantizada ════ */
  console.log('── v3.2.10: sin vía asistida ya no hay silencio ──');
  T('globals de sesión/reintento declarados junto a los de la hora', html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0;'), true);
  T('sin vía asistida: botón «🔗» + aviso (una vez por sesión) en lugar del retorno silencioso', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 3500); return /if\(!gmailHoraPuede\(\)\)\{[\s\S]{0,800}gmailHoraReintentoAgendar\(\);[\s\S]{0,500}gmailLoginBtnMostrar\(\);[\s\S]{0,700}_gmailSesionToast=true;[\s\S]{0,700}return;\s*\}/.test(s); })(), true);
  T('el aviso distingue escritorio («falta iniciar sesión») y web («Conecta Google»)', html.includes('falta iniciar sesión para capturar la hora') && html.includes('Conecta Google para capturar la hora'), true);
  T('con sesión OAuth pero sin resultados: reintento silencioso SIN botón', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 3500); return /gmailHoraReintentoAgendar\(\);\s*\n\s*var _tok=null[\s\S]{0,200}if\(!_tok\)\{[\s\S]{0,80}gmailLoginBtnMostrar\(\);/.test(s); })(), true);
  T('escritorio sin servicio asistido: el botón 🔗 conecta por OAuth (no vuelve a caer en la vía bloqueada)', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 1000); return /if\(!gmailIsDesktop\(\)\|\|!gmailHoraPuede\(\)\)\{/.test(s); })(), true);
  T('cada búsqueda renueva el presupuesto de reintentos', /async function gmailHoraArchivo\(manual\)\{\s*\n\s*_gmailReintentoN=0;/.test(html), true);
  T('al aplicar la hora se cancela la re-búsqueda pendiente', (function () { var i = html.indexOf('function gmailAplicarHora'); var s = html.slice(i, i + 400); return /^function gmailAplicarHora\(ms,origen,gmailLocal,tab\)\{\s*\n\s*if\(_gmailReintentoT\)\{clearTimeout\(_gmailReintentoT\);_gmailReintentoT=null;\}/.test(s); })(), true);
  T('re-búsqueda: solo la vía API (nunca gmailHoraArchivo ni ventanas), cada 60 s, máx. 4', (function () { var i = html.indexOf('function gmailHoraReintentoAgendar'); var s = html.slice(i, i + 1200); return s.includes('},60000);') && s.includes('_gmailReintentoN>=4') && s.includes('gmailHoraApiPorArchivo(nombre,_tab)') && !s.includes('gmailHoraArchivo(') && !s.includes('gmailHoraBuscar'); })(), true);

  console.log('── v3.2.10: la re-búsqueda silenciosa funciona (código real) ──');
  (0, eval)(extraerFn('gmailHoraReintentoAgendar'));
  var CB = null, CBMS = 0, RETRY = [];
  var _st = global.setTimeout, _ct = global.clearTimeout;
  global.setTimeout = function (f, ms) { CB = f; CBMS = ms; return 1; };
  global.clearTimeout = function () {};
  gmailHoraApiPorArchivo = async function (n, t) { RETRY.push(n); return false; };
  docTabs = [{ id: 'A', fileName: 'PV CIX LIM        2226' }]; activeTabId = 'A';
  campos.selloRxTime = { value: '' };
  _gmailReintentoN = 0; _gmailReintentoT = null;
  gmailHoraReintentoAgendar();
  T('agenda la 1.ª re-búsqueda a 60 s', CBMS, 60000);
  await CB();
  T('la ronda busca el archivo de la pestaña activa por la API (nunca ventanas)', RETRY.length, 1);
  T('y agenda la siguiente ronda (presupuesto 2/4)', CBMS === 60000 && _gmailReintentoN, 2);
  global.setTimeout = _st; global.clearTimeout = _ct;

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3210.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3210.js generado')
