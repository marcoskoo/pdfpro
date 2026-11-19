# Genera scripts/test_gmail_hora_326.js a partir del de v3.2.5:
# v3.2.6 — (1) la hora de recepción del correo se busca A PARTIR DEL
# ARCHIVO CARGADO por la API de Gmail (OAuth) en web y escritorio:
# gmailQuerysPorArchivo (filename:"…" → filename sin extensión → texto
# libre) + gmailBuscarHitPorAdjunto (estricto: solo un correo cuyo ADJUNTO
# coincida) + gmailHoraApiPorArchivo (aplica la hora si el campo está
# vacío); la vía Playwright queda de respaldo en escritorio y
# gmailHoraAuto ya no exige escritorio. (2) Se quitaron los 4 textos de
# ayuda de la ficha del sello.
# Regresión 212 de v3.2.5 (3 expectativas actualizadas: tooltip/banner/
# texto de ayuda retirados).
import sys

src = open('scripts/test_gmail_hora_325.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.5 — el plan REAL «PV CIX LIM 2226» (SRU 2226, StarPerú)
   debe componer «SRU2226 OB2176P MK»: en vuelos tipo S el casillero 7
   lleva designador ICAO + nº de vuelo y la matrícula viaja en REG/ del
   casillero 18, SIN guion (Doc 4444 Ap. 2 / regla del usuario). Con el
   PDF real: «SRU 2226» es UN item con espacio 19 pt bajo el rótulo
   (geometría del c-7 ampliada: banda 24 pt + espacios internos), el
   rótulo «REG./» trae punto antes de la barra (patrón tolerante) y el
   respaldo ya no roba la matrícula del REG/ como c-7. Los planes
   «ATC JAP 7361» y el ORIGINAL (c-7 = matrícula → «OB2203 1300 MK»)
   se prueban con sus fixtures REALES sin cambios. Incluye la regresión
   completa v3.2.4 (200 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_325.js */""",
    """/* Pruebas v3.2.6 — la hora de recepción del correo se busca A PARTIR
   DEL ARCHIVO CARGADO por la API de Gmail (OAuth), en web y escritorio:
   consulta dirigida filename:"nombre" (→ sin extensión → texto libre),
   solo se acepta un correo cuyo ADJUNTO coincida con el archivo y no se
   pisa una hora escrita a mano. gmailHoraAuto ya no exige escritorio y
   la vía Playwright queda de respaldo. Además se quitaron los 4 textos
   de ayuda de la ficha del sello. Incluye la regresión completa v3.2.5
   (212 pruebas, 3 expectativas actualizadas). Ejecuta el CÓDIGO REAL de
   web/index.html, src/gmail-hora/ y src/main.js.
   Ejecutar: node scripts/test_gmail_hora_326.js */""")

# 2) eval de las funciones nuevas
rep("""  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula')
].join('\\n');""",
    r"""  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula'),
  extraerFn('gmailNombreBase'), extraerFn('gmailQuerysPorArchivo'),
  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true)
].join('\n');""")

# 3) expectativas UI actualizadas (textos retirados + banner)
rep("""T('tooltip «ⓘ reglas de armado» presente', html.includes('class="tipr"') && html.includes('reglas de armado'), true);
T('reglas completas dentro del recuadro .tipr-b', html.includes('tipr-b') && html.includes('JAP7163 CCDII MK') && html.includes('OB2032 1100 MK'), true);
T('banner v3.2.5', /CORPAC AIS\\/ARO Platform v3\\.2\\.5/.test(html), true);
T('banner: «100% automática (Gmail asistido, login dentro de la app)»', /hora de recepción del correo por archivo cargado 100% automática/.test(html), true);""",
    r"""T('v3.2.6: tooltip «ⓘ reglas de armado» retirado (pedido del usuario)', html.includes('reglas de armado'), false);
T('v3.2.6: sin recuadro desplegable .tipr en la ficha del sello', /class="tipr"/.test(html), false);
T('banner v3.2.6', /CORPAC AIS\/ARO Platform v3\.2\.6/.test(html), true);
T('banner: «API de Gmail: busca el correo por el nombre del archivo cargado»', /API de Gmail: busca el correo por el nombre del archivo cargado/.test(html), true);""")

rep("""T('ayuda dice «La detección es automática»', html.includes('La detección es automática'), true);""",
    """T('v3.2.6: texto de ayuda «La detección es automática» retirado', html.includes('La detección es automática'), false);""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.6 — hora del correo POR ARCHIVO CARGADO (API de Gmail) ════ */
  console.log('── v3.2.6: consultas y coincidencia por adjunto (código real) ──');
  T('querys para «PV CIX LIM 2226.pdf»: filename completo, sin extensión y texto libre',
    gmailQuerysPorArchivo('PV CIX LIM 2226.pdf'),
    ['filename:"PV CIX LIM 2226.pdf"', 'filename:"PV CIX LIM 2226"', '"PV CIX LIM 2226" has:attachment']);
  T('sin extensión no repite la consulta filename', gmailQuerysPorArchivo('GENDEC OB2209'), ['filename:"GENDEC OB2209"', '"GENDEC OB2209" has:attachment']);
  T('nombre vacío → sin consultas', gmailQuerysPorArchivo(''), []);
  var HITMS = 1763000000000;
  var msgsHit = [
    { recibidoMs: 0, adjuntos: ['PV CIX LIM 2226.pdf'] },
    { recibidoMs: HITMS, de: 'StarPerú <dsp@sru.com.pe>', adjuntos: ['ATC JAP 7361.pdf', 'PV CIX LIM        2226.pdf'] }
  ];
  var hit = gmailBuscarHitPorAdjunto(msgsHit, 'PV CIX LIM 2226.pdf');
  T('hit: coincide pese a espacios múltiples y salta al mensaje sin hora', hit && hit.recibidoMs, HITMS);
  T('estricto: adjunto distinto → null (nunca un correo al azar)', gmailBuscarHitPorAdjunto([{ recibidoMs: 1, adjuntos: ['OTRO.pdf'] }], 'PV CIX LIM 2226.pdf'), null);
  T('lista nula → null', gmailBuscarHitPorAdjunto(null, 'x.pdf'), null);

  console.log('── v3.2.6: gmailHoraApiPorArchivo (web y escritorio, con stubs) ──');
  var CAPT = null, LLAMADAS = [];
  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  gmailWebBarrido = async function (q, max) {
    LLAMADAS.push(q);
    if (q === 'filename:"PV CIX LIM 2226"') return [{ recibidoMs: HITMS, de: 'StarPerú <dsp@sru.com.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }];
    return [];
  };
  gmailAplicarHora = function (ms, origen, gl) { CAPT = { ms: ms, origen: origen, gl: gl }; };
  campos.selloRxTime = { value: '' };
  var rApi = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web conectada: encuentra el correo y aplica la hora', rApi === true && CAPT && CAPT.ms === HITMS, true);
  T('la cadena avanza: filename con extensión vacía → filename sin extensión acierta', LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"' && LLAMADAS[1] === 'filename:"PV CIX LIM 2226"', true);
  T('el origen menciona remitente y adjunto', CAPT && /StarPerú/.test(CAPT.origen) && /PV CIX LIM 2226\.pdf/.test(CAPT.origen), true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '1300' };
  var rLlena = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('hora ya escrita a mano: encuentra el correo pero NO la pisa', rLlena === true && CAPT === null, true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '' };
  gmailWebBarrido = async function () { LLAMADAS.push(1); return [{ recibidoMs: 5, adjuntos: ['CUALQUIER OTRA COSA.pdf'] }]; };
  var rEstricto = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('adjuntos que no coinciden: no se aplica nada', rEstricto === false && CAPT === null, true);
  T('…y se agotaron las 3 consultas del archivo', LLAMADAS.length, 3);

  gmailWebTokens = function () { return null; };
  LLAMADAS = [];
  var rSinSesion = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web SIN conectar: no consulta y devuelve false (cae a la vía asistida)', rSinSesion === false && LLAMADAS.length === 0, true);

  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBarrer: async function (q, max) { LLAMADAS.push(q); return { ok: true, mensajes: [{ recibidoMs: HITMS + 1, de: 'CORPAC <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }] }; } };
  CAPT = null; LLAMADAS = [];
  var rDesk = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('escritorio OAuth: usa gmailBarrer del proceso principal y aplica la hora', rDesk === true && CAPT && CAPT.ms === HITMS + 1 && LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"', true);

  console.log('── v3.2.6: flujo al cargar + textos retirados (estáticas) ──');
  T('gmailHoraAuto ya NO exige escritorio (la web también busca al cargar)', /function gmailHoraAuto\(\)\{\s*\n\s*if\(_gmailHoraT\)clearTimeout/.test(html), true);
  T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)return;/.test(html), true);
  T('hook al cargar el documento intacto (loadPDF → gmailHoraAuto)', /try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/.test(html), true);
  T('texto «Captura la hora de recepción…» retirado', html.includes('para vincularla al documento cargado y al sello'), false);
  T('texto «Recepción: vacío = fecha/hora actuales…» retirado', html.includes('vacío = fecha/hora actuales'), false);
  T('texto «2 letras: 1er nombre + 1er apellido…» retirado', html.includes('Se calculan solas al iniciar sesión'), false);
  T('texto «Al guardar o exportar…» retirado', html.includes('Al guardar o exportar, el archivo se nombra'), false);
  T('los campos siguen intactos: Fecha/Hora Recepción, Iniciales y Matrícula', !!(html.includes('id="selloRxDate"') && html.includes('id="selloRxTime"') && html.includes('id="selloTxInitials"') && html.includes('id="selloMatricula"')), true);
  T('botón de reintento «Iniciar sesión en Gmail» sigue disponible', html.includes('id="gmailLoginBtn"'), true);
  T('banner del pie: tipo S sin guion y ejemplo del usuario (OB2134 1120 MK)', html.includes('SRU2226 OB2176P MK') && html.includes('OB2134 1120 MK'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_326.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_326.js generado')
