# Genera scripts/test_gmail_hora_3214.js a partir del de v3.2.13:
# v3.2.14 — ORDEN EXIGIDO POR EL USUARIO para la búsqueda de la hora:
# recorrer los correos RECIBIDOS del MÁS NUEVO al MÁS VIEJO, comparar el
# nombre de cada adjunto con el del archivo cargado y tomar la hora del
# PRIMER correo que hace match (si no, penúltimo y sucesivamente, hasta 40;
# luego respaldo filename:/texto libre). En las DOS vías: API OAuth
# (pollOrdenado/gmailWebBarridoOrdenado, corte en el acierto) y asistida
# (_recorrerBandeja por el DOM de Gmail). Comparación compartida:
# nombreComparable/adjuntoCoincide (extensión, «(n)», signos y espacios no
# importan). 303 de regresión + 15 nuevas = 318.
import sys

src = open('scripts/test_gmail_hora_3213.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.13 — captura de la hora: NAVEGADOR GARANTIZADO. Los
   navegadores de ms-playwright NO van dentro del instalador; si en la
   máquina faltan o su revisión no coincide con la del paquete,
   chromium.launch() fallaba («Executable doesn't exist»), el main SE
   TRAGABA ese fallo como «aviso» y la captura moría sin explicación —
   la causa real de «no se da la captura». Ahora iniciar() encadena 4
   intentos (PDFPRO_GMAIL_CHROMIUM → Chrome del sistema → Edge del
   sistema → Chromium empaquetado), el fallo se devuelve como
   NavegadorFalta con la causa real y el renderer avisa ofreciendo
   «Conectar Gmail» (Google/OAuth busca sin navegador). La cadena se
   verificó de verdad contra gmail.com (scripts/test_servicio_real_3213.js).
   Incluye la regresión completa v3.2.12 (298 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3213.js */""",
    """/* Pruebas v3.2.14 — ORDEN EXIGIDO POR EL USUARIO para la búsqueda de
   la hora de recepción: primero se verifica el ÚLTIMO correo recibido,
   comparando el nombre de su adjunto con el del archivo cargado; si hace
   match se toma su hora; si no, se repite con el penúltimo y sucesivos
   (hasta 40; después cae al respaldo filename:/texto libre para correos
   más antiguos o archivados). En las DOS vías: API OAuth
   (gmail-monitor.pollOrdenado / gmailWebBarridoOrdenado — corta en el
   primer acierto) y asistida (_recorrerBandeja por el DOM de Gmail).
   Comparación compartida nombreComparable/adjuntoCoincide: extensión,
   «(n)» de duplicados, signos, mayúsculas y espacios múltiples no
   importan. La cadena se verificó de verdad contra gmail.com
   (scripts/test_servicio_real_3214.js). Incluye la regresión completa
   v3.2.13 (303 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3214.js */""")

# 2) banner
rep(r"""T('banner v3.2.13', /CORPAC AIS\/ARO Platform v3\.2\.13/.test(html), true);""",
    r"""T('banner v3.2.14', /CORPAC AIS\/ARO Platform v3\.2\.14/.test(html), true);""")

# 3) extracción de las funciones nuevas
rep("""  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true),
  extraerFn('gmailHoraLimaTxt')""",
    """  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true),
  extraerFn('gmailWebBarridoOrdenado', true), extraerFn('gmailAplicarHitApi'),
  extraerFn('gmailHoraLimaTxt')""")

# 4) fuente de gmail-monitor.js
rep("""const preloadjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');""",
    """const preloadjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
const monjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-monitor.js'), 'utf8');""")

# 5) stub del recorrido ordenado en el bloque v3.2.6 (para que las pruebas
#    de la cadena filename: heredada sigan probando exactamente eso); antes
#    se guarda la función REAL extraída del html para probarla más abajo
rep("""  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  gmailWebBarrido = async function (q, max) {""",
    """  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  var gmailWebBarridoOrdenadoReal = gmailWebBarridoOrdenado; // v3.2.14: la REAL (extraída del html), para probarla abajo
  gmailWebBarridoOrdenado = async function () { return null; }; // v3.2.14: el recorrido no acierta → respaldo filename:
  gmailWebBarrido = async function (q, max) {""")

# 6) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.14 — ORDEN DEL USUARIO: recorrido de la bandeja ════ */
  console.log('── v3.2.14: del último correo recibido hacia atrás, primer match = hora ──');
  T('gmailNombreBase: extensión, «(n)» de duplicados, mayúsculas y signos no importan', gmailNombreBase('PV CIX (1).pdf') === gmailNombreBase('pv cix.pdf') && gmailNombreBase('ATC JAP 7163.PDF') === gmailNombreBase('atc jap 7163'), true);
  T('gmailNombreBase estricto: nombres distintos NO hacen match', gmailNombreBase('A.pdf') === gmailNombreBase('B.pdf'), false);

  function mkMsg(id, ms, adj) {
    return { id: id, threadId: 't' + id, internalDate: String(ms), payload: { headers: [{ name: 'From', value: 'CORPAC <ais@corpac.gob.pe>' }, { name: 'Subject', value: 'FPL' }], parts: adj.map(function (a) { return { filename: a }; }) } };
  }
  var FETCH_URLS = [], DETALLES = [];
  gmailWebFetch = async function (url) {
    FETCH_URLS.push(url);
    if (url.indexOf('/messages?maxResults=') >= 0) return { messages: [{ id: 'nuevo' }, { id: 'medio' }, { id: 'viejo' }] };
    var id = url.match(/\/messages\/([^?]+)/)[1];
    DETALLES.push(id);
    if (id === 'nuevo') return mkMsg('nuevo', 3000, ['OTRO.pdf']);
    if (id === 'medio') return mkMsg('medio', 2000, ['PV CIX LIM        2226.pdf']);
    return mkMsg('viejo', 1000, ['X.pdf']);
  };
  var ord = await gmailWebBarridoOrdenadoReal('PV CIX LIM 2226.pdf', 50);
  T('recorrido ordenado: salta el más nuevo sin match y acierta con el siguiente', ord && ord.id === 'medio' && ord.recibidoMs === 2000, true);
  T('…corta en el acierto: no descarga los detalles restantes', DETALLES.join(','), 'nuevo,medio');
  T('…la lista consultada es la bandeja de recibidos con adjunto (in:inbox has:attachment)', FETCH_URLS[0].indexOf(encodeURIComponent('in:inbox has:attachment')) >= 0, true);
  FETCH_URLS = []; DETALLES = [];
  var ordNull = await gmailWebBarridoOrdenadoReal('INEXISTENTE.pdf', 50);
  T('sin match en la bandeja → null (cae al respaldo filename: tras agotar los correos)', ordNull === null && DETALLES.length === 3, true);
  FETCH_URLS = [];
  var ordVacio = await gmailWebBarridoOrdenadoReal('', 50);
  T('nombre vacío → null sin consultar la API', ordVacio === null && FETCH_URLS.length === 0, true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '' };
  gmailAplicarHora = function (ms, origen, gl) { CAPT = { ms: ms, origen: origen, gl: gl }; }; // re-stub: una prueba posterior restauró la real
  (0, eval)(extraerFn('gmailHoraApiPorArchivo', true).replace('function gmailHoraApiPorArchivo(', 'function gmailHoraApiPorArchivoReal('));
  gmailHoraApiPorArchivo = gmailHoraApiPorArchivoReal; // una prueba v3.2.10 stubbeó la función; se restaura la REAL del html
  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  gmailWebBarridoOrdenado = async function () { LLAMADAS.push('ordenado'); return { recibidoMs: HITMS + 2, de: 'CORPAC <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }; };
  gmailWebBarrido = async function (q) { LLAMADAS.push(q); return []; };
  var rOrden = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web: el RECORRIDO ORDENADO va primero y aplica su hora (filename: queda de respaldo)', rOrden === true && CAPT && CAPT.ms === HITMS + 2 && LLAMADAS.length === 1 && LLAMADAS[0] === 'ordenado', true);
  T('…y el origen menciona el remitente y el adjunto que hizo match', CAPT && /CORPAC/.test(CAPT.origen) && /PV CIX LIM 2226\.pdf/.test(CAPT.origen), true);

  CAPT = null; LLAMADAS = [];
  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBuscarPorAdjunto: async function (a, max) { LLAMADAS.push('ordenado:' + a + ':' + max); return { ok: true, mensaje: { recibidoMs: HITMS + 3, de: 'StarPerú', adjuntos: ['PV CIX LIM 2226.pdf'] } }; }, gmailBarrer: async function (q) { LLAMADAS.push(q); return { ok: true, mensajes: [] }; } };
  var rDeskOrden = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('escritorio: recorre la bandeja por IPC (gmailBuscarPorAdjunto, 50) y aplica su hora', rDeskOrden === true && CAPT && CAPT.ms === HITMS + 3 && LLAMADAS.length === 1 && LLAMADAS[0] === 'ordenado:PV CIX LIM 2226.pdf:50', true);

  T('servicio: _recorrerBandeja recorre in:inbox has:attachment del más nuevo al más viejo', (function () { var i = svcjs.indexOf('async _recorrerBandeja'); var s = svcjs.slice(i, i + 2200); return i >= 0 && s.includes("'in:inbox has:attachment'") && s.includes('filas[idx].click()'); })(), true);
  T('servicio: el límite del recorrido es 40 correos (después cae al respaldo filename:)', svcjs.includes('_recorrerBandeja(archivo, 40)'), true);
  T('servicio: la comparación es la compartida adjuntoCoincide (extensión/«(n)»/signos no importan)', /async _recorrerBandeja\(archivo, limite[\s\S]{0,1400}adjuntoCoincide\(archivo, adjuntos\)/.test(svcjs), true);
  T('servicio: el recorrido se hace ANTES de la búsqueda filename: (el orden del usuario)', svcjs.indexOf('_recorrerBandeja(archivo, 40)') < svcjs.indexOf('filename:"${base}"'), true);
  T('servicio: _resultadoDeCorreoAbierto es el final común de las dos vías (2 llamadas)', (svcjs.match(/return this\._resultadoDeCorreoAbierto\(archivo, copiar\);/g) || []).length, 2);
  T('servicio: _adjuntosAbiertos lee los chips de adjunto span.aV3 y .brc[title]', svcjs.includes("querySelectorAll('span.aV3')") && svcjs.includes("querySelectorAll('.brc[title]')"), true);
  T('servicio: _esperarAdjuntos evita saltar un correo cuyo adjunto aún renderiza', /async _esperarAdjuntos\(/.test(svcjs), true);

  T('hora.js: nombreComparable — espacios múltiples, extensión y «(n)» no importan', HORA.nombreComparable('PV CIX LIM        2226.pdf') === HORA.nombreComparable('pv cix lim 2226') && HORA.nombreComparable('X (1).pdf') === HORA.nombreComparable('x'), true);
  T('hora.js: adjuntoCoincide — acierta con el duplicado «(2)» y rechaza nombres distintos', HORA.adjuntoCoincide('A.pdf', ['B.pdf', 'A (2).pdf']) === true && HORA.adjuntoCoincide('A.pdf', ['B.pdf']) === false, true);
  T('gmail-monitor: pollOrdenado recorre la bandeja y corta en el primer acierto', monjs.includes('async function pollOrdenado') && monjs.includes("'in:inbox has:attachment'") && /for \(const m of msgs\)[\s\S]{0,500}nombreComparable\(a\) === objetivo[\s\S]{0,300}return d;/.test(monjs), true);
  T('main: IPC gmail:buscar-por-adjunto → pollOrdenado (el orden del usuario por API)', mainjs.includes("'gmail:buscar-por-adjunto'") && mainjs.includes('gmail.pollOrdenado('), true);
  T('preload: bridge gmailBuscarPorAdjunto', preloadjs.includes('gmailBuscarPorAdjunto'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3214.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3214.js generado')
