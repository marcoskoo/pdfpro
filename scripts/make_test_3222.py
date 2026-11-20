# Genera scripts/test_gmail_hora_3222.js a partir del de v3.2.21:
# v3.2.22 — LOGIN VISIBLE EN CHROME REAL, CON EL PERFIL DEL BUSCADOR.
# Las capturas del usuario probaron que corría v3.2.21 (el aviso honesto
# del OAuth apareció) con el almacén de sesión VACÍO: la ventana de
# Gmail con su buzón era su Chrome normal (sesión invisible para la app)
# y la ventana de login interna moría en <2 s. (1) GmailHoraService
# .loginVisible(): cierra el buscador invisible, abre Chrome/Edge REAL
# (headless:false) con el MISMO perfil persistente, espera cookies de
# sesión de google.com (SID/SAPISID/HSID/SSID/APISID, 2 confirmaciones)
# y devuelve {ok:true} — sin transferir cookies; (2) la ronda de login
# usa loginVisible ANTES de la ventana de Electron (que queda de
# respaldo); (3) con éxito reinicia el buscador y reintenta directo.
# 383 + 8 = 391.
import sys

src = open('scripts/test_gmail_hora_3221.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.21 — EL BOTÓN «CONECTAR GMAIL» YA NO ABRE UNA VENTANA
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
   Ejecutar: node scripts/test_gmail_hora_3221.js */""",
    """/* Pruebas v3.2.22 — LOGIN VISIBLE EN CHROME REAL, CON EL PERFIL DEL
   BUSCADOR. Las capturas del usuario probaron que corría v3.2.21 (el
   aviso honesto del OAuth apareció en pantalla) con el almacén de sesión
   VACÍO: la ventana de Gmail con su buzón era SU Chrome normal (sesión
   invisible para la app) y la ventana de login interna moría en <2 s
   antes de poder usarse. (1) GmailHoraService.loginVisible(): cierra el
   buscador invisible, abre Chrome/Edge REAL (headless:false) con el
   MISMO perfil persistente, espera cookies de sesión de google.com
   (SID/SAPISID/HSID/SSID/APISID, 2 confirmaciones a 1 s) y devuelve
   {ok:true} — la sesión queda en el perfil, sin transferir cookies;
   detecta la ventana cerrada por el usuario y el tiempo agotado (5 min);
   (2) la ronda de login usa loginVisible ANTES de la ventana de Electron
   (que queda como respaldo) y con éxito reinicia el buscador y reintenta
   directamente; (3) el candado se limpia al completar el acceso. Incluye
   la regresión completa v3.2.21 (383 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3222.js */""")

# 2) banner
rep(r"""T('banner v3.2.21', /CORPAC AIS\/ARO Platform v3\.2\.21/.test(html), true);""",
    r"""T('banner v3.2.22', /CORPAC AIS\/ARO Platform v3\.2\.22/.test(html), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.22 — login visible en Chrome real, perfil del buscador ════ */
  console.log('── v3.2.22: el login ocurre en una ventana de Chrome REAL ──');
  T('service: loginVisible() existe y NO transfiere cookies (usa el perfil del buscador)', typeof GH.GmailHoraService.prototype.loginVisible === 'function' && !/async loginVisible[\s\S]{0,3000}inyectarCookies/.test(svcjs), true);
  T('service: loginVisible abre el navegador REAL (headless:false, maximizado, con el mismo userDataDir)', /async loginVisible[\s\S]{0,1200}headless: false[\s\S]{0,200}--start-maximized[\s\S]{0,900}launchPersistentContext\(this\.opts\.userDataDir/.test(svcjs), true);
  T('service: loginVisible libera el perfil antes de abrir (cierra el buscador invisible)', /async loginVisible[\s\S]{0,400}await this\.cerrar\(true\)/.test(svcjs), true);
  T('service: loginVisible espera cookies de sesión de google.com (SID/SAPISID/HSID/SSID/APISID, 2 confirmaciones)', /async loginVisible[\s\S]{0,2200}\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\][\s\S]{0,900}confirmaciones >= 2/.test(svcjs), true);
  T('service: loginVisible detecta la ventana cerrada por el usuario y el tiempo agotado', svcjs.includes('ventana cerrada antes de completar el acceso') && svcjs.includes('sin completar el acceso'), true);
  T('service: loginVisible sondea las cookies del propio contexto (ctx.cookies) — sin almacén de Electron', /async loginVisible[\s\S]{0,2600}await ctx\.cookies\('https:\/\/mail\.google\.com\/'\)/.test(svcjs), true);
  T('main: la ronda de login usa loginVisible ANTES de la ventana de Electron (respaldo)', /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes('se abre una ventana de Chrome — inicie sesión ahí (solo la primera vez)…'), true);
  T('main: con loginVisible OK reinicia el buscador y reintenta directo (sin inyectar cookies)', /if \(vis && vis\.ok\) \{\s*\n\s*gmailHoraLog\('loginVisible: sesión iniciada y guardada en el perfil del buscador'\)[\s\S]{0,500}await _gmailHoraSvc\.iniciar\(\);[\s\S]{0,300}buscarHoraPorArchivo/.test(mainjs) && mainjs.includes('_gmailHoraLoginCancelado = false;   // v3.2.22'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

# 4) el generador necesita la fuente del servicio a mano: el test v3.2.21 ya
#    lee GmailHoraService.js como svcjs (verificar); si usa otra variable,
#    volcamos el archivo a esa variable.
if 'svcjs' not in out:
    rep("const mainjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');",
        "const mainjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');\nconst svcjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-hora', 'GmailHoraService.js'), 'utf8');")

open('scripts/test_gmail_hora_3222.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3222.js generado')
