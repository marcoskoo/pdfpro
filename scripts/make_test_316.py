# Genera scripts/test_gmail_hora_3216.js a partir del de v3.2.15:
# v3.2.16 — el match del nombre de archivo soporta UNO o VARIOS «(n)» de
# duplicado («ATC CM468 11NOV (1) (1).pdf», el caso real del usuario: sin
# esto ningún correo hacía match y la hora jamás se capturaba). En las tres
# vías (nombreComparable compartido por API escritorio y asistida;
# gmailNombreBase en el renderer para la API web) + reintento filename:
# y texto libre con la base sin marcadores + año por defecto del parser
# tomado de la zona de la cuenta (Lima). 335 de regresión + 9 nuevas = 344.
import sys

src = open('scripts/test_gmail_hora_3215.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.15 — fin del aviso en bucle «No se completó el inicio
   de sesión de Gmail»: (1) candado por sesión en main — tras UN login
   cancelado las búsquedas AUTOMÁTICAS no vuelven a abrir la ventana
   (antes el cooldown era de 30 s y cada PDF la reabría); solo el botón
   «🔗 Iniciar sesión en Gmail» (manual=true) la abre; (2) el PORQUÉ del
   fallo (ventana cerrada / tiempo agotado / no se pudo cargar) llega al
   aviso vía { cookies, motivo }; (3) la ventana queda alwaysOnTop (no se
   esconde tras otras ventanas); (4) con Google/OAuth conectado NO se
   abre la ventana del buscador (la API es la vía autorizada); (5) el
   aviso sale UNA vez por sesión. Incluye la regresión completa v3.2.14
   (325 pruebas, con las 2 del cooldown v3.2.3 actualizadas al candado).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3215.js */""",
    """/* Pruebas v3.2.16 — el MATCH del nombre soporta varios «(n)» de
   duplicado: los archivos reales se descargan como «ATC CM468 11NOV
   (1) (1).pdf» y la comparación solo quitaba UN «(n)» → «atccm46811nov1»
   ≠ «atccm46811nov» → ningún correo hacía match y la hora JAMÁS se
   capturaba. (1) nombreComparable (hora.js, compartida por API escritorio
   y vía asistida) y gmailNombreBase (renderer, API web) quitan TODOS los
   «(n)» finales; (2) la búsqueda filename: reintenta con la base sin
   marcadores y el texto libre/match estricto usan esa misma base; (3) el
   año por defecto de parseHoraGmail es el de la ZONA de la cuenta (Lima),
   no el de UTC (bug de fin de año). Incluye la regresión completa
   v3.2.15 (335 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3216.js */""")

# 2) banner
rep(r"""T('banner v3.2.15', /CORPAC AIS\/ARO Platform v3\.2\.15/.test(html), true);""",
    r"""T('banner v3.2.16', /CORPAC AIS\/ARO Platform v3\.2\.16/.test(html), true);""")

# 2b) la prueba v3.2.7 del texto libre anclaba la llamada anterior: ahora el
#     texto libre usa la base sin «(n)» con espacios colapsados
rep(r"""T('servicio: el texto libre usa el nombre colapsado', svcjs.includes('await this._buscar(colapsada || base)'), true);""",
    r"""T('servicio: el texto libre usa el nombre SIN «(n)» y con espacios colapsados', svcjs.includes("await this._buscar((sinMarcas ? sinMarcas.replace(/\\s+/g, ' ').trim() : colapsada) || base)"), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.16 — match con archivos «(1) (1)» (varios «(n)» de duplicado) ════ */
  console.log('── v3.2.16: el match soporta UNO o VARIOS «(n)» de duplicado ──');
  T('hora.js: nombreComparable quita TODOS los «(n)» finales — caso real «ATC CM468 11NOV (1) (1).pdf»', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === HORA.nombreComparable('ATC CM468 11NOV.pdf') && HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov', true);
  T('hora.js: …también contra el adjunto renombrado por Gmail «(1).pdf» y con un solo «(n)»', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === HORA.nombreComparable('ATC CM468 11NOV (1).pdf') && HORA.nombreComparable('X (1).pdf') === HORA.nombreComparable('x'), true);
  T('hora.js: adjuntoCoincide acierta con el archivo descargado dos veces', HORA.adjuntoCoincide('ATC CM468 11NOV (1) (1).pdf', ['OTRO.doc', 'ATC CM468 11NOV.pdf']) === true && HORA.adjuntoCoincide('ATC CM468 11NOV (1) (1).pdf', ['OTRO.doc']) === false, true);
  T('hora.js y renderer: nombreComparable y gmailNombreBase dan el MISMO resultado (regla compartida entre vías)', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') && HORA.nombreComparable('PV CIX LIM        2226.pdf') === gmailNombreBase('PV CIX LIM        2226.pdf'), true);
  T('renderer: gmailNombreBase (API web) — misma regla multi-«(n)»', gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === gmailNombreBase('ATC CM468 11NOV.pdf') && gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov', true);
  FETCH_URLS = []; DETALLES = [];
  gmailWebFetch = async function (url) {
    if (url.indexOf('/messages?maxResults=') >= 0) return { messages: [{ id: 'ultimo' }, { id: 'previo' }] };
    var id = url.match(/\/messages\/([^?]+)/)[1];
    DETALLES.push(id);
    return id === 'ultimo' ? mkMsg('ultimo', 5000, ['ATC CM468 11NOV.pdf']) : mkMsg('previo', 4000, ['OTRO.pdf']);
  };
  var ordDoble = await gmailWebBarridoOrdenadoReal('ATC CM468 11NOV (1) (1).pdf', 50);
  T('recorrido web ordenado: acierta con el archivo descargado dos veces (doble «(n)»)', ordDoble && ordDoble.id === 'ultimo' && ordDoble.recibidoMs === 5000 && DETALLES.length === 1, true);
  T('servicio: la búsqueda filename: reintenta con la base SIN «(n)» (entre colapsada y texto libre)', /filename:"\$\{colapsada\}"[\s\S]{0,600}sinMarcas[\s\S]{0,400}filename:"\$\{sinMarcas\}"[\s\S]{0,900}probando texto libre/.test(svcjs), true);
  T('servicio: el texto libre busca y abre con el nombre SIN «(n)»', svcjs.includes("await this._buscar((sinMarcas ? sinMarcas.replace(/\\s+/g, ' ').trim() : colapsada) || base)") && svcjs.includes("modo === 'texto' ? (sinMarcas || base) : base"), true);
  T('hora.js: el año por defecto es el de la ZONA de la cuenta (Lima), no el de UTC', fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-hora', 'hora.js'), 'utf8').includes('if (anio == null) anio = ahoraZona(off).anio;') && HORA.parseHoraGmail('31 dic, 8:00 p. m.') !== null, true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3216.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3216.js generado')
