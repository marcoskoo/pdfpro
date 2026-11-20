# Genera scripts/test_gmail_hora_3223.js a partir del de v3.2.22:
# v3.2.23 — GOOGLE YA NO DENIEGA EL ACCESO EN LA VENTANA DE CHROME.
# La captura de las 09:27-09:29 mostró el paso exacto: «✔ Ventana de
# acceso abierta (Chrome del sistema)» a las 09:27:51, credenciales
# ingresadas, Google DENEGANDO con el aviso anti-automatización, y a las
# 09:28:47 «⚠ La ventana de Chrome no completó el acceso» + ventana
# interna muerta en el mismo segundo + búsqueda terminada. (1) loginVisible
# sin marca de automatización (ignoreDefaultArgs: ['--enable-automation']
# + --disable-blink-features=AutomationControlled) y plazo de 10 min;
# (2) guardia global de 7 a 20 min; (3) partición de login renovada
# ('gmail-correo1') — la ventana interna moría en <2 s en TODAS las
# versiones en la máquina del usuario (almacén posiblemente corrupto).
# 391 + 7 = 398.
import sys

src = open('scripts/test_gmail_hora_3222.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.22 — LOGIN VISIBLE EN CHROME REAL, CON EL PERFIL DEL
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
   Ejecutar: node scripts/test_gmail_hora_3222.js */""",
    """/* Pruebas v3.2.23 — GOOGLE YA NO DENIEGA EL ACCESO EN LA VENTANA DE
   CHROME. La captura de las 09:27-09:29 mostró el paso exacto que
   fallaba: «✔ Ventana de acceso abierta (Chrome del sistema)» a las
   09:27:51, credenciales ingresadas por el usuario, Google DENEGANDO el
   acceso con el aviso «este navegador o aplicación no es seguro» (el
   Chrome lanzado por Playwright viaja marcado como automatizado con
   --enable-automation / navigator.webdriver), y a las 09:28:47 «⚠ La
   ventana de Chrome no completó el acceso» + la ventana de respaldo
   interna muerta en el mismo segundo + la búsqueda terminada sin más.
   (1) loginVisible SIN marca de automatización
   (ignoreDefaultArgs: ['--enable-automation'] +
   --disable-blink-features=AutomationControlled) y plazo de 10 min;
   (2) guardia global de la búsqueda de 7 a 20 min (el acceso humano ya
   no queda cortado); (3) partición de login renovada
   ('persist:gmail-correo1'): la ventana interna moría en <2 s en TODAS
   las versiones en la máquina del usuario mientras las demás ventanas
   de la app vivían — síntoma de almacén corrupto que sobrevive a las
   reinstalaciones. Incluye la regresión completa v3.2.22 (391 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3223.js */""")

# 2) banner
rep(r"""T('banner v3.2.22', /CORPAC AIS\/ARO Platform v3\.2\.22/.test(html), true);""",
    r"""T('banner v3.2.23', /CORPAC AIS\/ARO Platform v3\.2\.23/.test(html), true);""")

# 3) anclas de versiones anteriores que CAMBIAN de forma en v3.2.23
#    (partición, guardia y plazo): misma intención, forma nueva
out = out.replace("'persist:gmail-login'", "'persist:gmail-correo1'")
# el test de la guardia (v3.2.18) ancla el plazo y el nombre; ambos pasan a 20 min
rep("main: guardia global de 7 min — el núcleo corre contra un timeout (GmailHoraTimeout)", "main: guardia global de 20 min — el núcleo corre contra un timeout (GmailHoraTimeout)")
rep("mainjs.includes('7 * 60 * 1000')", "mainjs.includes('20 * 60 * 1000')")
# el comentario v3.2.23 dentro de loginVisible alarga la distancia hasta las cookies de sesión
rep("[\\s\\S]{0,2200}\\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\\]", "[\\s\\S]{0,3000}\\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\\]")
# la prueba v3.2.12 de la partición ancla por REGEX (sin comillas): pasa al nombre nuevo
rep("T('main.js: ventana con partición persistente gmail-login', /persist:gmail-login/.test(mainjs), true);",
    "T('main.js: ventana con partición persistente gmail-correo1 (v3.2.23: renovada contra el almacén corrupto)', /persist:gmail-correo1/.test(mainjs), true);")
# y el sondeo ctx.cookies también queda ahora más lejos del inicio del método
rep("loginVisible[\\s\\S]{0,2600}await ctx\\.cookies", "loginVisible[\\s\\S]{0,4200}await ctx\\.cookies")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.23 — Google ya no deniega; guardia 20 min; partición nueva ════ */
  console.log('── v3.2.23: el login en Chrome sin marca de automatización ──');
  T('service: loginVisible VIAJA SIN la marca de automatización (Google dejaba de denegar el acceso)',
    svcjs.includes("ignoreDefaultArgs: ['--enable-automation']") && svcjs.includes('--disable-blink-features=AutomationControlled'), true);
  T('service: loginVisible con Chrome de apariencia normal (sin diálogos de primera ejecución)',
    svcjs.includes("'--no-first-run', '--no-default-browser-check'"), true);
  T('service: loginVisible concede 10 min (credenciales + verificación en dos pasos)',
    /async loginVisible\(\{ minutos = 10 \} = \{\}\)/.test(svcjs), true);
  T('main: guardia global de 20 min (antes 7: cortaba el acceso humano a mitad)',
    mainjs.includes('20 * 60 * 1000') && mainjs.includes('excedió 20 minutos'), true);
  T('main: partición de login RENOVADA (gmail-correo1; ningún uso funcional de la vieja gmail-login)',
    mainjs.split("'persist:gmail-correo1'").length - 1 >= 3 && mainjs.split("'persist:gmail-login'").length - 1 === 0, true);
  T('main: la previa (v3.2.20) y la ventana de respaldo usan la MISMA partición nueva',
    /_gmailHoraSesionYaValida[\s\S]{0,400}fromPartition\('persist:gmail-correo1'\)[\s\S]{0,2000}abrirLoginGmailEnApp[\s\S]{0,700}fromPartition\('persist:gmail-correo1'\)/.test(mainjs), true);
  T('main: v3.2.22 intacto (loginVisible ANTES de la ventana de Electron, reinicio+reintento directo)',
    /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes('_gmailHoraLoginCancelado = false;   // v3.2.22'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3223.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3223.js generado')
