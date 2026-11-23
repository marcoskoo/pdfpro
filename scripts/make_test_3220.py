# Genera scripts/test_gmail_hora_3220.js a partir del de v3.2.19:
# v3.2.20 — SESIÓN PREVIA SIN VENTANA. El usuario confirmó (con captura:
# la ventana de login abierta mostrando el buzón con sesión válida un
# minuto DESPUÉS del fallo) que la sesión ya estaba activa y la búsqueda
# aun así moría con «ventana cerrada» en <1 s: la cosecha dependía de que
# la ventana sobreviviera ~3,5 s al sondeo. (1) _gmailHoraSesionYaValida()
# lee el almacén de la partición 'persist:gmail-login' y devuelve las
# cookies de google.com si hay de sesión (SID/SAPISID/HSID/SSID/APISID);
# (2) la ronda de login usa la sesión previa ANTES del candado y de la
# ventana: inyecta y reintenta sin abrir nada; (3) cierre anómalo = <5 s
# la haya visto o no; (4) el cierre tras login exito (resuelto) ya no se
# reporta como fallo. 370 + 6 = 376.
import sys

src = open('scripts/test_gmail_hora_3219.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.19 — BLINDAJE DEL INICIO DE SESIÓN en Gmail. El log del
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
   Ejecutar: node scripts/test_gmail_hora_3219.js */""",
    """/* Pruebas v3.2.20 — SESIÓN PREVIA SIN VENTANA. La captura del usuario
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
   Ejecutar: node scripts/test_gmail_hora_3220.js */""")

# 2) banner
rep(r"""T('banner v3.2.19', /CORPAC AIS\/ARO Platform v3\.2\.19/.test(html), true);""",
    r"""T('banner v3.2.20', /CORPAC AIS\/ARO Platform v3\.2\.20/.test(html), true);""")

# 3) el ancla del test de anomalía v3.2.19 se actualiza a la regla v3.2.20
rep(r"""T('main: cierre ANÓMALO (<5 s sin verse) → motivo propio y anomalia:true', mainjs.includes('la ventana de inicio de sesión se cerró sola a los ${') && mainjs.includes('CIERRE ANÓMALO'), true);""",
    r"""T('main: cierre ANÓMALO (<5 s, la haya visto o no — v3.2.19 dejaba fuera el caso real) → motivo propio y anomalia:true', mainjs.includes('la ventana de inicio de sesión se cerró sola a los ${') && mainjs.includes('CIERRE ANÓMALO') && mainjs.includes('const anomal = edad < 5;') && !mainjs.includes('!vista && edad < 5'), true);""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.20 — sesión previa sin ventana ════ */
  console.log('── v3.2.20: la sesión activa se usa sin abrir ventana ──');
  T('main: _gmailHoraSesionYaValida() lee el almacén de la partición (SID/SAPISID/HSID/SSID/APISID)', mainjs.includes('async function _gmailHoraSesionYaValida()') && /_gmailHoraSesionYaValida\(\)[\s\S]{0,900}\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\]/.test(mainjs), true);
  T('main: la sesión previa se usa ANTES del candado y de la ventana (una sesión válida no es una cancelación)', /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2200}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs), true);
  T('main: con sesión previa se inyecta y se reintenta SIN abrir ventana («sin abrir la ventana…» en el progreso)', mainjs.includes('La sesión de Gmail ya estaba activa — se transfiere (${previas.length} cookies) sin abrir la ventana…') && /if \(previas && previas\.length\) \{[\s\S]{0,1400}buscarHoraPorArchivo/.test(mainjs), true);
  T('main: si las cookies previas no bastan, se abre la ventana de login como antes (sin quedar atascado)', mainjs.includes('las cookies previas no bastaron (Gmail sigue pidiendo sesión) — se abre la ventana de login') && mainjs.includes('La sesión guardada no bastó — se abre la ventana de inicio de sesión…'), true);
  T('main: el cierre de la ventana tras un login completado (resuelto) NO se reporta como fallo', /on\('closed', \(\) => \{[\s\S]{0,300}if \(resuelto\) return;[^\n]*cierre normal tras completar el login/.test(mainjs), true);
  T('service: la coincidencia de nombres aguanta doble espacio + «(n)» (caso real del usuario: «SPRU V  (2)»)', (() => { const h = require(path.join(__dirname, '..', 'src', 'gmail-hora', 'hora.js')); return h.nombreComparable('FLP OB2147 SPHI-SPRU V  (2)') === h.nombreComparable('FLP OB2147 SPHI-SPRU V') && h.adjuntoCoincide('FLP OB2147 SPHI-SPRU V  (2)', ['FLP OB2147 SPHI-SPRU V.pdf']); })(), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3220.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3220.js generado')
