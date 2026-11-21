# Genera scripts/test_gmail_hora_329.js a partir del de v3.2.8:
# v3.2.9 — el panel «📧 Monitoreo Gmail» se retiró (título, estado, Conectar
# Gmail/Desconectar, «🔄 Barrer ahora», lista). La búsqueda de la hora sigue
# automática; el login pasa por «🔗 Iniciar sesión en Gmail» (web → OAuth,
# escritorio → vía asistida) y la caja del código OAuth se reubica junto a
# ese botón; tras conectar se rebusca la hora (4 puntos). Regresión 269.
import sys

src = open('scripts/test_gmail_hora_328.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.8 — «Hora Recepción (UTC)» y «Matrícula (Aeronave /
   Espacio)» POR PESTAÑA: al cambiar de archivo o pestaña la ficha se
   actualiza al documento activo; gmailAplicarHora guarda la hora en
   SU pestaña y solo toca la ficha si sigue activa; docTabSwitch
   restaura los campos y rebusca en Gmail la hora del archivo si falta.
   Incluye la regresión completa v3.2.7 (254 pruebas, con el caso real
   SRU2226 de espacios múltiples y la regla 04:00 pm → 21:00 UTC).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_328.js */""",
    """/* Pruebas v3.2.9 — el panel «📧 Monitoreo Gmail» se retiró de la ficha
   del sello; el inicio de sesión pasa por el botón «🔗 Iniciar sesión
   en Gmail» (web → OAuth, escritorio → Gmail dentro de la app), la
   caja del código OAuth vive junto a ese botón y tras conectar se
   rebusca sola la hora del archivo cargado. La búsqueda automática de
   la hora (adjunto → +5 h → UTC) y los campos por pestaña de v3.2.8
   siguen intactos. Incluye la regresión completa v3.2.8 (269 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_329.js */""")

# 2) banner
rep(r"""T('banner v3.2.8', /CORPAC AIS\/ARO Platform v3\.2\.8/.test(html), true);""",
    r"""T('banner v3.2.9', /CORPAC AIS\/ARO Platform v3\.2\.9/.test(html), true);""")

# 3) contador de enganches: 4 → 8 (4 nuevos tras conectar OAuth)
rep("""T('4 enganches gmailHoraAuto (3 al cargar + re-búsqueda al cambiar de pestaña)', (html.match(/gmailHoraAuto\\(\\);?\\}catch/g) || []).length, 4);""",
    """T('8 enganches gmailHoraAuto (3 al cargar + 1 al cambiar de pestaña + 4 tras conectar OAuth)', (html.match(/gmailHoraAuto\\(\\);?\\}catch/g) || []).length, 8);""")

# 3b) v3.2.3: gmailLoginManual ahora tiene la rama web (OAuth) antes de la
#     vía asistida de escritorio — el reintento manual=true sigue al final
rep(r"""T('v3.2.3: gmailLoginManual reintenta al momento (manual=true)', /function gmailLoginManual\(\)\{[^}]*gmailHoraArchivo\(true\)/.test(html), true);""",
    r"""T('v3.2.3: gmailLoginManual reintenta al momento (manual=true; v3.2.9: la web va antes por OAuth)', /function gmailLoginManual\(\)\{[\s\S]*?gmailHoraArchivo\(true\);\s*\}/.test(html), true);""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.9 — panel «Monitoreo Gmail» retirado ════ */
  console.log('── v3.2.9: el panel de monitoreo de Gmail se retiró ──');
  T('panel eliminado: sin título «Monitoreo Gmail», ni estado, ni Barrer ahora, ni lista', !html.includes('Monitoreo Gmail') && !html.includes('Barrer ahora') && !html.includes('id="gmailList"') && !html.includes('id="gmailDot"') && !html.includes('id="gmailState"'), true);
  T('sin botones «Conectar Gmail» / «Desconectar» / «Barrer ahora» en la interfaz', !html.includes('>Conectar Gmail<') && !html.includes('>Desconectar<') && !/onclick="gmailBarrer\(true\)"/.test(html), true);
  T('el botón «🔗 Iniciar sesión en Gmail» sigue en la ficha del sello', html.includes('id="gmailLoginBtn"') && html.includes('gmailLoginManual()'), true);
  T('la caja del código OAuth vive junto al botón de login (oculta, como antes)', html.indexOf('id="gmailLoginBtn"') < html.indexOf('id="gmailManualBox"') && html.includes('id="gmailCodeInp"'), true);
  T('gmailLoginManual: WEB → OAuth (gmailConnect) · ESCRITORIO → vía asistida', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 900); return /if\(!gmailIsDesktop\(\)\)\{[\s\S]*?gmailConnect\(\);[\s\S]*?return;[\s\S]*?gmailHoraArchivo\(true\);/.test(s); })(), true);
  T('tras conectar OAuth se rebusca la hora del archivo cargado (4 puntos de conexión)', (html.match(/gmailRefreshState\(\);try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/g) || []).length, 4);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_329.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_329.js generado')
