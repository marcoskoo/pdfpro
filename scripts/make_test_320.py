# Genera scripts/test_gmail_hora_320.js a partir del de v3.1.9:
# + regresión 130 íntegra (banner → v3.2.0) · botón y toggle ELIMINADOS
# (función 100% automática) · login de Gmail DENTRO de la app (ventana hija
# Electron + cosecha de cookies .google.com + inyectarCookies al Playwright)
# · conversión de cookies Electron→Playwright probada con contexto falso.
import sys

src = open('scripts/test_gmail_hora_319.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.1.9 — HORA DE RECEPCIÓN POR ARCHIVO CARGADO (Gmail asistido
   con Playwright, sin OAuth): parser de la hora tal como la muestra Gmail
   («17 nov 2026, 8:00 p. m.» → epoch, zona Lima UTC-5), coincidencia
   estricta de fila, integración Electron (main/preload/servicio) y UI
   (botón, toggle automático, campos en UTC). Incluye la regresión completa
   v3.1.8 (92 pruebas). Ejecuta el CÓDIGO REAL de web/index.html y
   src/gmail-hora/. Ejecutar: node scripts/test_gmail_hora_319.js */""",
    """/* Pruebas v3.2.0 — HORA DEL CORREO POR ARCHIVO CARGADO, 100% AUTOMÁTICA
   (sin botón, sin toggle) y LOGIN DE GMAIL DENTRO DE LA APP: ventana hija
   de Electron con mail.google.com (partición persistente), cosecha de
   cookies de google.com y transferencia al navegador invisible de
   Playwright (inyectarCookies). Incluye la regresión completa v3.1.9
   (130 pruebas). Ejecuta el CÓDIGO REAL de web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_320.js */""")

# 2) banner → v3.2.0
rep("T('banner v3.1.9', /CORPAC AIS\\/ARO Platform v3\\.1\\.9/.test(html), true);",
    "T('banner v3.2.0', /CORPAC AIS\\/ARO Platform v3\\.2\\.0/.test(html), true);\n"
    "T('banner: «100% automática (Gmail asistido, login dentro de la app)»', /hora de recepción del correo por archivo cargado 100% automática/.test(html), true);")

# 3) servicio: el relanzamiento visible se sustituye por inyectarCookies
rep("T('servicio: reintento con ventana visible si pide login', /_visible = true/.test(svcjs), true);",
    r"""T('servicio: inyectarCookies() presente (sesión desde la ventana en-app)', /async inyectarCookies\(/.test(svcjs), true);
T('servicio: ya NO relanza ventana de Chrome para login', /_visible/.test(svcjs), false);
T('servicio: _esperarLogin lanza LoginRequerido (login fuera del servicio)', /throw new LoginRequeridoError\('Gmail requiere iniciar sesión\.'\)/.test(svcjs), true);""")

# 4) bloque nuevo: orquestación del login (síncrono, chequeos de texto)
rep("console.log('── v3.1.9: UI — panel Gmail + enganches tras carga ──');",
    r"""console.log('── v3.2.0: login de Gmail DENTRO de la app (main) ──');
T('main.js: abrirLoginGmailEnApp() abre ventana hija', /function abrirLoginGmailEnApp\(\)/.test(mainjs), true);
T('main.js: ventana con partición persistente gmail-login', /persist:gmail-login/.test(mainjs), true);
T('main.js: cosecha cookies de google.com (cookies.getAll + filtro)', /cookies\.getAll\(\{\}\)/.test(mainjs) && /google\\\.com\$/.test(mainjs), true);
T('main.js: al pedir sesión → login en-app + inyección + reintento', /LoginRequeridoError/.test(mainjs) && /inyectarCookies\(cookies\)/.test(mainjs) && /buscando de nuevo/.test(mainjs), true);
T('main.js: detecta sesión viendo mail.google.com en la ventana', /mail\\\.google\\\.com/.test(mainjs), true);
T('main.js: cierra también la ventana de login al salir', /_gmailHoraLoginWin && !_gmailHoraLoginWin\.isDestroyed\(\)/.test(mainjs), true);

console.log('── v3.1.9: UI — panel Gmail + enganches tras carga ──');""")

# 5) UI: botón y toggle ahora AUSENTES; fallos silenciosos
rep("""T('botón «🕐 Hora del correo del archivo cargado» presente', /gmailHoraArchivo\\(false\\)/.test(html) && /id="gmailHoraBox"/.test(html), true);
T('toggle «Automático al cargar» persistente', /id="gmailHoraAuto"/.test(html) && /pdfpro_gmail_hora_auto/.test(html), true);""",
    r"""T('botón «🕐 Hora del correo» ELIMINADO (v3.2.0)', /gmailHoraArchivo\(false\)/.test(html) || /id="gmailHoraBox"/.test(html) || /Hora del correo del archivo cargado<\/button>/.test(html), false);
T('toggle «Automático al cargar» ELIMINADO', /id="gmailHoraAuto"/.test(html) || /pdfpro_gmail_hora_auto/.test(html), false);
T('gmailHoraArchivo sin argumento (siempre automática)', /async function gmailHoraArchivo\(\)\{/.test(html), true);
T('fallo automático silencioso (no molesta al operador)', /if\(!r\|\|!r\.ok\)return;\s*\/\/ sin correo \/ sin sesión: silencioso/.test(html), true);""")

# 6) el aviso «no interpretable» desapareció (silencioso)
rep("T('UI avisa si la hora no es interpretable', /no interpretable/.test(html), true);",
    "T('sin toasts de error en modo automático', /repórtala para ajustar el parser/.test(html), false);")

# 7) conversión Electron→Playwright: DENTRO del IIFE asíncrono (usa await,
#    y así sus T() cuentan antes del resumen final)
rep("""(async function () {
  // —— autoOcrMatricula: llena y SOBRESCRIBE ——""",
    r"""(async function () {
  // —— v3.2.0: inyectarCookies (Electron→Playwright) con contexto falso ——
  var capturadas = null;
  var svc = new GH.GmailHoraService({});
  svc.context = { addCookies: async function (c) { capturadas = c; } };
  svc.page = {};
  var k = await svc.inyectarCookies([
    { name: 'SID', value: 'abc', domain: '.google.com', path: '/', secure: true, httpOnly: true, expirationDate: 1900000000, sameSite: 'no_restriction' },
    { name: 'NID', value: 'xyz', domain: '.google.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax' },
    { name: 'OSS', value: 'ses', domain: 'accounts.google.com', path: '/' }
  ]);
  T('inyectarCookies devuelve el número de cookies', k, 3);
  T('mismas cookies llegan a addCookies', capturadas && capturadas.length, 3);
  var sid = capturadas[0];
  T('sameSite no_restriction → None', sid.sameSite, 'None');
  T('sameSite lax → Lax', capturadas[1].sameSite, 'Lax');
  T('sin sameSite no se envía el campo', 'sameSite' in capturadas[2], false);
  T('expirationDate pasa como expires (segundos)', sid.expires, 1900000000);
  T('secure/httpOnly se conservan', sid.secure && sid.httpOnly, true);
  T('dominio y ruta se conservan', sid.domain, '.google.com');
  var k0 = await svc.inyectarCookies([]);
  T('lista vacía → 0 cookies (no llama a addCookies)', k0, 0);

  // —— autoOcrMatricula: llena y SOBRESCRIBE ——""")

open('scripts/test_gmail_hora_320.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_320.js generado (' + str(out.count(chr(10))) + ' líneas)')
