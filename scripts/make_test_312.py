# Genera scripts/test_gmail_hora_3212.js a partir del de v3.2.11:
# v3.2.12 — panel «📧 Monitoreo Gmail» RESTAURADO (pedido del usuario:
# «se ha perdido funciones»). En v3.2.9 se retiró el HTML del panel y las
# funciones (gmailConnect/gmailDisconnect/gmailRenderState/gmailBarrer/
# gmailRenderList) quedaron inalcanzables. Se actualizan las 2 pruebas que
# exigían el panel AUSENTE y se añaden 5 nuevas de la restauración (IDs
# únicos, sin duplicar la caja OAuth, funciones enganchadas, re-búsqueda
# al conectar). Regresión 293 + 5 = 298.
import sys

src = open('scripts/test_gmail_hora_3211.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.11 — causa raíz de «la captura de la hora no se da»:
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
   Ejecutar: node scripts/test_gmail_hora_3211.js */""",
    """/* Pruebas v3.2.12 — panel «📧 Monitoreo Gmail» RESTAURADO (pedido del
   usuario: «se ha perdido funciones»). En v3.2.9 se retiró el HTML del
   panel (título, estado, Conectar Gmail/Desconectar, Barrer ahora,
   lista de correos) y sus funciones quedaron inalcanzables — sin ese
   panel no había forma de ver el estado ni conectar Gmail a mano.
   Se restauran los elementos SIN duplicar la caja del código OAuth ni
   el botón «🔗 Iniciar sesión» (v3.2.9/v3.2.10), y se conservan todas
   las correcciones de captura v3.2.10/v3.2.11.
   Incluye la regresión completa v3.2.11 (293 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3212.js */""")

# 2) banner
rep(r"""T('banner v3.2.11', /CORPAC AIS\/ARO Platform v3\.2\.11/.test(html), true);""",
    r"""T('banner v3.2.12', /CORPAC AIS\/ARO Platform v3\.2\.12/.test(html), true);""")

# 3) las 2 pruebas v3.2.9 de ausencia → presencia restaurada
rep("""  /* ════ v3.2.9 — panel «Monitoreo Gmail» retirado ════ */
  console.log('── v3.2.9: el panel de monitoreo de Gmail se retiró ──');
  T('panel eliminado: sin título «Monitoreo Gmail», ni estado, ni Barrer ahora, ni lista', !html.includes('Monitoreo Gmail') && !html.includes('Barrer ahora') && !html.includes('id="gmailList"') && !html.includes('id="gmailDot"') && !html.includes('id="gmailState"'), true);
  T('sin botones «Conectar Gmail» / «Desconectar» / «Barrer ahora» en la interfaz', !html.includes('>Conectar Gmail<') && !html.includes('>Desconectar<') && !/onclick="gmailBarrer\\(true\\)"/.test(html), true);""",
    """  /* ════ v3.2.9 → v3.2.12 — panel «Monitoreo Gmail»: retirado y RESTAURADO ════ */
  console.log('── v3.2.12: el panel de monitoreo de Gmail vuelve a la ficha ──');
  T('panel RESTAURADO: título «Monitoreo Gmail», estado, dot, Barrer ahora y lista', html.includes('Monitoreo Gmail') && html.includes('Barrer ahora') && html.includes('id="gmailList"') && html.includes('id="gmailDot"') && html.includes('id="gmailState"'), true);
  T('botones «Conectar Gmail» / «Desconectar» / «Barrer ahora» de vuelta en la interfaz', html.includes('>Conectar Gmail<') && html.includes('>Desconectar<') && /onclick="gmailBarrer\\(true\\)"/.test(html), true);""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.12 — restauración sin duplicados ni regresiones ════ */
  console.log('── v3.2.12: restauración limpia, sin duplicados ──');
  T('cada elemento del panel aparece EXACTAMENTE una vez (sin IDs duplicados)', ['id="gmailDot"', 'id="gmailState"', 'id="gmailConnectBtn"', 'id="gmailList"'].every(function (x) { return html.split(x).length - 1 === 1; }), true);
  T('la caja del código OAuth NO se duplicó: sigue única y junto al botón de login, no en el panel', (function () { var n = html.split('id="gmailManualBox"').length - 1; var pi = html.indexOf('id="gmailConnectBtn"'); var pf = html.indexOf('id="gmailList"'); var dentro = html.slice(pi, pf).includes('gmailManualBox'); return n === 1 && !dentro && html.indexOf('id="gmailLoginBtn"') < html.indexOf('id="gmailManualBox"'); })(), true);
  T('las funciones del panel siguen enganchadas por onclick (gmailConnect/gmailDisconnect/gmailBarrer)', html.includes('onclick="gmailConnect()"') && html.includes('onclick="gmailDisconnect()"') && html.includes('onclick="gmailBarrer(true)"'), true);
  T('gmailRenderState reactiva los tres elementos del panel (dot, estado y texto del botón)', (function () { var i = html.indexOf('function gmailRenderState'); var s = html.slice(i, i + 400); return s.includes("getElementById('gmailDot')") && s.includes("getElementById('gmailState')") && s.includes("getElementById('gmailConnectBtn')"); })(), true);
  T('al conectar desde el panel («Conectar Gmail») la hora del archivo cargado se rebusca sola', (function () { var i = html.indexOf('async function gmailConnect'); var s = html.slice(i, i + 2200); return /gmailRefreshState\(\);try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/.test(s); })(), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3212.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3212.js generado')
