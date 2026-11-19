# Genera scripts/test_gmail_hora_328.js a partir del de v3.2.7:
# v3.2.8 — «Hora Recepción (UTC)» y «Matrícula (Aeronave / Espacio)»
# por PESTAÑA: al cambiar de archivo o pestaña la ficha se actualiza al
# documento activo (guarda saliente / restaura entrante en docTabSwitch
# y en la apertura multi-archivo); gmailAplicarHora lleva la hora a SU
# pestaña y solo toca la ficha si esa pestaña sigue activa; si el
# documento aún no tiene hora, docTabSwitch lanza la búsqueda de Gmail
# del archivo de esa pestaña. Regresión 254 de v3.2.7.
import sys

src = open('scripts/test_gmail_hora_327.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.7 — caso real SRU2226: el archivo «PV CIX LIM
   2226.pdf» trae ESPACIOS MÚLTIPLES y Gmail no devolvía resultados
   con filename:"…" tal cual, por lo que la hora no se capturaba.
   Ahora la búsqueda colapsa los espacios (API de Gmail y vía
   Playwright) y el toast muestra la regla completa de conversión
   (Gmail «16:00» hora Lima +5 h → UTC). Regla del usuario probada
   con su caso exacto: Gmail 04:00 pm = 16:00 Lima → «Hora Recepción»
   presenta 2100 (UTC). Incluye la regresión completa v3.2.6 (236
   pruebas). Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/
   y src/main.js.
   Ejecutar: node scripts/test_gmail_hora_327.js */""",
    """/* Pruebas v3.2.8 — «Hora Recepción (UTC)» y «Matrícula (Aeronave /
   Espacio)» POR PESTAÑA: al cambiar de archivo o pestaña la ficha se
   actualiza al documento activo; gmailAplicarHora guarda la hora en
   SU pestaña y solo toca la ficha si sigue activa; docTabSwitch
   restaura los campos y rebusca en Gmail la hora del archivo si falta.
   Incluye la regresión completa v3.2.7 (254 pruebas, con el caso real
   SRU2226 de espacios múltiples y la regla 04:00 pm → 21:00 UTC).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_328.js */""")

# 2) banner
rep(r"""T('banner v3.2.7', /CORPAC AIS\/ARO Platform v3\.2\.7/.test(html), true);""",
    r"""T('banner v3.2.8', /CORPAC AIS\/ARO Platform v3\.2\.8/.test(html), true);""")

# 2b) pruebas v3.2.1–3.2.6 actualizadas a la nueva firma (4.º parámetro tab,
#     _tab en gmailHoraArchivo y el 4.º enganche de gmailHoraAuto en el switch)
rep("""T('3 enganches gmailHoraAuto tras cargar documento', (html.match(/gmailHoraAuto\\(\\);?\\}catch/g) || []).length, 3);""",
    """T('4 enganches gmailHoraAuto (3 al cargar + re-búsqueda al cambiar de pestaña)', (html.match(/gmailHoraAuto\\(\\);?\\}catch/g) || []).length, 4);""")
rep(r"""T('v3.2.2: gmailAplicarHora recibe el texto crudo de Gmail', /gmailAplicarHora\(ms,origen,gmailLocal\)/.test(html), true);""",
    r"""T('v3.2.2: gmailAplicarHora recibe el texto crudo de Gmail', /gmailAplicarHora\(ms,origen,gmailLocal,tab\)/.test(html), true);""")
rep(r"""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion\)/.test(html), true);""",
    r"""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion,_tab\)/.test(html), true);""")
rep(r"""T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)return;/.test(html), true);""",
    r"""T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre,_tab\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)return;/.test(html), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.8 — Hora Recepción (UTC) y Matrícula por PESTAÑA ════ */
  console.log('── v3.2.8: los campos siguen a la pestaña activa ──');
  (0, eval)(extraerFn('docTabGet'));
  (0, eval)(extraerFn('_selloCamposGuardar'));
  (0, eval)(extraerFn('_selloCamposRestaurar'));
  fplMatriculaChanged = function () {};
  var tA = { id: 'A', fileName: 'PV CIX LIM        2226' };
  var tB = { id: 'B', fileName: 'ATC JAP 7361' };
  docTabs = [tA, tB]; activeTabId = 'A';
  campos.selloRxDate = { value: '' }; campos.selloRxTime = { value: '' }; campos.selloMatricula = { value: '' };

  gmailAplicarHora(Date.UTC(2026, 10, 19, 21, 0), 'correo SRU2226', '16:00', tA);
  T('A activa: 2100 queda en la ficha Y en la pestaña A (con su fecha)', campos.selloRxTime.value === '2100' && tA.selloHora === '2100' && tA.selloFecha === '2026-11-19', true);

  gmailAplicarHora(Date.UTC(2026, 10, 18, 7, 0), 'correo JAP7361', '07:00', tB);
  T('B inactiva: su 0700 se guarda en la pestaña B y NO pisa la ficha', tB.selloHora === '0700' && tB.selloFecha === '2026-11-18' && campos.selloRxTime.value === '2100', true);

  _fplSetMatricula('SRU2226 OB2176P MK');
  T('la matrícula detectada queda en la pestaña activa (A)', tA.selloMatricula === 'SRU2226 OB2176P MK' && campos.selloMatricula.value === 'SRU2226 OB2176P MK', true);

  _selloCamposGuardar(tA);
  _selloCamposRestaurar(tB);
  activeTabId = 'B';
  T('al cambiar a B la ficha muestra SUS valores (0700, sin su matrícula aún)', campos.selloRxTime.value === '0700' && campos.selloRxDate.value === '2026-11-18' && campos.selloMatricula.value === '', true);
  _fplSetMatricula('JAP7361 CCDIU MK');
  _selloCamposGuardar(tB);
  _selloCamposRestaurar(tA);
  activeTabId = 'A';
  T('al volver a A la ficha muestra 2100 y SU matrícula', campos.selloRxTime.value === '2100' && campos.selloMatricula.value === 'SRU2226 OB2176P MK', true);
  T('la matrícula de B no se perdió al alternar', tB.selloMatricula === 'JAP7361 CCDIU MK', true);

  _selloCamposRestaurar(null);
  T('sin documento → ficha limpia', campos.selloRxTime.value === '' && campos.selloMatricula.value === '', true);

  console.log('── v3.2.8: enganches del switch y de la apertura multi-archivo ──');
  T('docTabSwitch guarda los campos de la pestaña saliente', html.includes('_selloCamposGuardar(_sal)'), true);
  T('docTabSwitch restaura los campos del documento activo', html.includes('_selloCamposRestaurar(tab)'), true);
  T('docTabSwitch rebusca la hora en Gmail si el documento no la tiene', html.includes("if(!(tab.selloHora||'')&&tab.fileName&&tab.fileName!=='Sin título'){try{gmailHoraAuto();}catch(e){}}"), true);
  T('openFilesList guarda los campos antes de abrir la pestaña siguiente', /docTabSaveCurrent\(\);\s*_selloCamposGuardar\(docTabGet\(activeTabId\)\);/.test(html), true);
  T('gmailAplicarHora acepta la pestaña (4.º parámetro)', /function gmailAplicarHora\(ms,origen,gmailLocal,tab\)/.test(html), true);
  T('gmailHoraArchivo pasa SU pestaña a la búsqueda y a la aplicación', html.includes('gmailHoraApiPorArchivo(nombre,_tab)') && html.includes('r.horaRecepcion,_tab)'), true);
  T('cerrar el último tab limpia la ficha', html.includes('_selloCamposRestaurar(null)'), true);
  T('_fplSetMatricula guarda la matrícula en la pestaña activa', /if\(t\)t\.selloMatricula=v;/.test(html), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_328.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_328.js generado')
