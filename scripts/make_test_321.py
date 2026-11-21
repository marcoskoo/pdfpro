# Genera scripts/test_gmail_hora_321.js a partir del de v3.2.0:
# v3.2.1 — fallos VISIBLES (login cancelado / sesión no transferida / hora
# no interpretada), inyección de cookies cookie-a-cookie (SameSite=None→Secure,
# una rechazada no arrastra), reintento ×2 con re-cosecha, ventana de login se
# cierra sola, registro gmail-hora.log y serialización de búsquedas.
# Regresión 150 de v3.2.0 íntegra.
import sys

src = open('scripts/test_gmail_hora_320.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.0 — HORA DEL CORREO POR ARCHIVO CARGADO, 100% AUTOMÁTICA
   (sin botón, sin toggle) y LOGIN DE GMAIL DENTRO DE LA APP: ventana hija
   de Electron con mail.google.com (partición persistente), cosecha de
   cookies de google.com y transferencia al navegador invisible de
   Playwright (inyectarCookies). Incluye la regresión completa v3.1.9
   (130 pruebas). Ejecuta el CÓDIGO REAL de web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_320.js */""",
    """/* Pruebas v3.2.1 — HORA DEL CORREO POR ARCHIVO CARGADO (corrección de la
   v3.2.0): los fallos reales ahora se MUESTRAN (login cancelado, sesión no
   transferida, hora leída pero no interpretada) — solo calla «no hay
   correo» y «correo sin hora». Inyección de cookies cookie-a-cookie
   (SameSite=None viaja con Secure forzado; una rechazada no arrastra a las
   demás), reintento ×2 con re-cosecha, ventana de login se cierra sola,
   registro <userData>/gmail-hora.log y búsquedas serializadas. Incluye la
   regresión completa v3.2.0 (150 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_321.js */""")

# 2) banner → v3.2.1
rep("T('banner v3.2.0', /CORPAC AIS\\/ARO Platform v3\\.2\\.0/.test(html), true);",
    "T('banner v3.2.1', /CORPAC AIS\\/ARO Platform v3\\.2\\.1/.test(html), true);")

# 3) servicio: urlActual + nuevas pruebas de texto
rep("T('servicio: _esperarLogin lanza LoginRequerido (login fuera del servicio)', /throw new LoginRequeridoError\\('Gmail requiere iniciar sesión\\.'\\)/.test(svcjs), true);",
    r"""T('servicio: _esperarLogin lanza LoginRequerido (login fuera del servicio)', /throw new LoginRequeridoError\('Gmail requiere iniciar sesión\.'\)/.test(svcjs), true);
T('servicio: urlActual() para diagnóstico', /urlActual\(\)\s*\{/.test(svcjs), true);""")

# 4) main: nuevas pruebas (registro, cola, rondas, cooldown, cierre auto)
rep("T('main.js: cierra también la ventana de login al salir', /_gmailHoraLoginWin && !_gmailHoraLoginWin\\.isDestroyed\\(\\)/.test(mainjs), true);",
    r"""T('main.js: cierra también la ventana de login al salir', /_gmailHoraLoginWin && !_gmailHoraLoginWin\.isDestroyed\(\)/.test(mainjs), true);
T('main.js: registro de diagnóstico gmail-hora.log', /gmail-hora\.log/.test(mainjs) && /function gmailHoraLog\(/.test(mainjs), true);
T('main.js: todo evento también se anota en el registro', /gmailHoraLog\(\(tipo === 'login' \? '\[login\] ' : ''\) \+ msg\)/.test(mainjs), true);
T('main.js: búsquedas serializadas (una a la vez)', /_gmailHoraCadena/.test(mainjs) && /_gmailHoraBuscar\(String\(archivo/.test(mainjs), true);
T('main.js: hasta 2 rondas de login+inyección', /ronda <= 2/.test(mainjs), true);
T('main.js: tipo SesionNoTransferida tras agotar rondas', /tipo: 'SesionNoTransferida'/.test(mainjs), true);
T('main.js: tipo LoginCancelado + cooldown 30 s', /tipo: 'LoginCancelado'/.test(mainjs) && /_gmailHoraUltimoFalloLogin < 30000/.test(mainjs), true);
T('main.js: la ventana de login se cierra sola al cosechar', /ventana ya cumplió su misión: se cierra sola/.test(mainjs), true);
T('main.js: la URL del navegador se anota en cada ronda', /_gmailHoraSvc\.urlActual\(\)/.test(mainjs), true);""")

# 5) renderer: fallos visibles + silencios justos
rep("T('fallo automático silencioso (no molesta al operador)', /if\\(!r\\|\\|!r\\.ok\\)return;\\s*\\/\\/ sin correo \\/ sin sesión: silencioso/.test(html), true);",
    r"""T('silencio SOLO si no hay correo con ese archivo', /tipo==='ArchivoNoEncontradoError'\)return;/.test(html), true);
T('silencio también si el correo no muestra hora', /tipo==='HoraNoExtraidaError'\)return;/.test(html), true);
T('login cancelado se AVISA', /tipo==='LoginCancelado'\)toast/.test(html), true);
T('sesión no transferida se AVISA', /tipo==='SesionNoTransferida'\)toast/.test(html), true);
T('aviso de sesión indica enviar gmail-hora.log', /%APPDATA%/.test(html) && /gmail-hora\.log/.test(html), true);""")

# 6) hora no interpretada vuelve a ser visible (con el texto crudo)
rep("T('sin toasts de error en modo automático', /repórtala para ajustar el parser/.test(html), false);",
    r"""T('hora leída pero no interpretada → toast con texto crudo', /no interpretada: «'\+r\.horaRecepcion/.test(html), true);
T('error inesperado del flujo también se avisa', /Error buscando el correo: '\+e\.message/.test(html), true);""")

# 7) bloque async: inyectarCookies cookie-a-cookie con contexto falso
rep("""  // —— v3.2.0: inyectarCookies (Electron→Playwright) con contexto falso ——
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
  T('lista vacía → 0 cookies (no llama a addCookies)', k0, 0);""",
    r"""  // —— v3.2.1: inyectarCookies cookie-a-cookie (contexto falso) ——
  var capturadas = [];
  var svc = new GH.GmailHoraService({});
  svc.context = { addCookies: async function (c) {
    if (c[0] && c[0].name === 'MALA') throw new Error('cookie rechazada por Chromium');
    capturadas.push.apply(capturadas, c);
  } };
  svc.page = {};
  var k = await svc.inyectarCookies([
    { name: 'SID', value: 'abc', domain: '.google.com', path: '/', secure: false, httpOnly: true, expirationDate: 1900000000.7, sameSite: 'no_restriction' },
    { name: 'NID', value: 'xyz', domain: '.google.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax' },
    { name: 'MALA', value: 'x', domain: '.google.com', path: '/' },
    { name: 'OSS', value: 'ses', domain: 'accounts.google.com', path: '/' }
  ]);
  T('inyectarCookies devuelve {total, ok, fallos}', k.total === 4 && k.ok === 3 && k.fallos.length === 1, true);
  T('cookie rechazada no arrastra a las demás', capturadas.length, 3);
  var sid = capturadas[0];
  T('sameSite no_restriction → None', sid.sameSite, 'None');
  T('SameSite=None viaja con Secure forzado (v3.2.1)', sid.secure, true);
  T('sameSite lax → Lax', capturadas[1].sameSite, 'Lax');
  T('sin sameSite no se envía el campo', 'sameSite' in capturadas[2], false);
  T('expirationDate pasa como expires (entero)', sid.expires, 1900000000);
  T('httpOnly se conserva', sid.httpOnly, true);
  T('dominio y ruta se conservan', sid.domain, '.google.com');
  T('el fallo identifica la cookie por nombre', /MALA/.test(k.fallos[0]), true);
  var k0 = await svc.inyectarCookies([]);
  T('lista vacía → {total:0, ok:0}', k0.total === 0 && k0.ok === 0, true);""")

open('scripts/test_gmail_hora_321.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_321.js generado')
