# Genera scripts/test_gmail_hora_327.js a partir del de v3.2.6:
# v3.2.7 — caso real SRU2226: el archivo «PV CIX LIM        2226.pdf»
# trae 8 espacios y Gmail no devolvía resultados con filename:"…" tal
# cual → la hora no se capturaba. Ahora: (1) gmailQuerysPorArchivo arma
# la cadena con espacios colapsados + nombre tal cual + sin extensión +
# texto libre; (2) GmailHoraService (vía Playwright) reintenta igual;
# (3) el toast de la hora aplicada muestra la regla completa
# (Gmail «16:00» hora Lima +5 h → UTC) con gmailHoraLimaTxt; (4) la
# regla del usuario queda probada con su caso exacto: Gmail muestra
# 04:00 pm (16:00 Lima) → «Hora Recepción» presenta 2100 (UTC).
# Regresión 236 de v3.2.6.
import sys

src = open('scripts/test_gmail_hora_326.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.6 — la hora de recepción del correo se busca A PARTIR
   DEL ARCHIVO CARGADO por la API de Gmail (OAuth), en web y escritorio:
   consulta dirigida filename:"nombre" (→ sin extensión → texto libre),
   solo se acepta un correo cuyo ADJUNTO coincida con el archivo y no se
   pisa una hora escrita a mano. gmailHoraAuto ya no exige escritorio y
   la vía Playwright queda de respaldo. Además se quitaron los 4 textos
   de ayuda de la ficha del sello. Incluye la regresión completa v3.2.5
   (212 pruebas, 3 expectativas actualizadas). Ejecuta el CÓDIGO REAL de
   web/index.html, src/gmail-hora/ y src/main.js.
   Ejecutar: node scripts/test_gmail_hora_326.js */""",
    """/* Pruebas v3.2.7 — caso real SRU2226: el archivo «PV CIX LIM
   2226.pdf» trae ESPACIOS MÚLTIPLES y Gmail no devolvía resultados
   con filename:"…" tal cual, por lo que la hora no se capturaba.
   Ahora la búsqueda colapsa los espacios (API de Gmail y vía
   Playwright) y el toast muestra la regla completa de conversión
   (Gmail «16:00» hora Lima +5 h → UTC). Regla del usuario probada
   con su caso exacto: Gmail 04:00 pm = 16:00 Lima → «Hora Recepción»
   presenta 2100 (UTC). Incluye la regresión completa v3.2.6 (236
   pruebas). Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/
   y src/main.js.
   Ejecutar: node scripts/test_gmail_hora_327.js */""")

# 2) banner
rep("""T('banner v3.2.6', /CORPAC AIS\\/ARO Platform v3\\.2\\.6/.test(html), true);""",
    r"""T('banner v3.2.7', /CORPAC AIS\/ARO Platform v3\.2\.7/.test(html), true);""")

# 3) eval de gmailHoraLimaTxt junto a las demás funciones gmail
rep("""  extraerFn('gmailNombreBase'), extraerFn('gmailQuerysPorArchivo'),
  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true)""",
    """  extraerFn('gmailNombreBase'), extraerFn('gmailQuerysPorArchivo'),
  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true),
  extraerFn('gmailHoraLimaTxt')""")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.7 — SRU2226 real: espacios múltiples + regla 04:00 pm → 21:00 UTC ════ */
  console.log('── v3.2.7: consultas con espacios colapsados («PV CIX LIM        2226.pdf») ──');
  var Q8 = gmailQuerysPorArchivo('PV CIX LIM        2226.pdf');
  T('la 1.ª consulta colapsa los 8 espacios del nombre real', Q8[0], 'filename:"PV CIX LIM 2226.pdf"');
  T('también se prueba el nombre tal cual llegó (8 espacios)', Q8.includes('filename:"PV CIX LIM        2226.pdf"'), true);
  T('y sin extensión, colapsado y tal cual', Q8.includes('filename:"PV CIX LIM 2226"') && Q8.includes('filename:"PV CIX LIM        2226"'), true);
  T('y el texto libre con has:attachment', Q8.includes('"PV CIX LIM 2226" has:attachment'), true);
  T('máximo 5 consultas por archivo', Q8.length, 5);

  console.log('── v3.2.7: regla del usuario — Gmail «04:00 pm» (16:00 Lima) + 5 h = 21:00 UTC ──');
  var MS2100 = Date.UTC(2026, 10, 19, 21, 0); // 19 nov 2026 21:00 UTC = 16:00 Lima
  T('«19 nov 2026, 4:00 p. m.» → 21:00 UTC del mismo día', iso(HORA.parseHoraGmail('19 nov 2026, 4:00 p. m.')), '2026-11-19T21:00:00.000Z');
  T('«19 nov 2026, 04:00 pm» (como lo escribe el usuario) → 21:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 04:00 pm')), '2026-11-19T21:00:00.000Z');
  T('«19 nov 2026, 4:00 pm» sin cero inicial → 21:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 4:00 pm')), '2026-11-19T21:00:00.000Z');
  T('solo hora «16:00» → 21:00 UTC (hoy Lima)', new Date(HORA.parseHoraGmail('16:00')).getUTCHours(), 21);
  T('solo hora «04:00 pm» → 21:00 UTC (hoy Lima)', new Date(HORA.parseHoraGmail('04:00 pm')).getUTCHours(), 21);
  var hit8 = gmailBuscarHitPorAdjunto([{ recibidoMs: MS2100, de: 'CORPAC AIS/ARO', adjuntos: ['PV CIX LIM        2226.pdf'] }], 'PV CIX LIM        2226.pdf');
  T('adjunto con 8 espacios coincide con el archivo cargado (normalizado)', hit8 && hit8.recibidoMs, MS2100);

  console.log('── v3.2.7: captura completa del SRU2226 (gmailAplicarHora real) ──');
  (0, eval)(extraerFn('gmailAplicarHora').replace('function gmailAplicarHora(', 'function gmailAplicarHoraReal('));
  updateSelloPreview = function () {};
  gmailAplicarHora = gmailAplicarHoraReal;
  CAPT = null; LLAMADAS = [];
  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBarrer: async function (q, max) {
    LLAMADAS.push(q);
    if (q === 'filename:"PV CIX LIM 2226.pdf"') return { ok: true, mensajes: [{ recibidoMs: MS2100, de: 'CORPAC AIS/ARO <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM        2226.pdf'] }] };
    return { ok: true, mensajes: [] };
  } };
  campos.selloRxDate = campos.selloRxDate || { value: '' };
  campos.selloRxTime = { value: '' };
  var rSRU = await gmailHoraApiPorArchivo('PV CIX LIM        2226.pdf');
  T('SRU2226: la 1.ª consulta (colapsada) encuentra el correo', rSRU === true && LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"', true);
  T('SRU2226: «Hora Recepción» queda en 2100 (16:00 Lima + 5 h)', campos.selloRxTime.value, '2100');
  T('SRU2226: la fecha UTC queda 2026-11-19', campos.selloRxDate.value, '2026-11-19');
  T('SRU2226: gmailHoraLimaTxt muestra la hora Lima «16:00» para el toast', gmailHoraLimaTxt(MS2100), '16:00');
  T('SRU2226: 04:00 pm de Gmail → la app presenta 21:00', HORA.parseHoraGmail('19 nov 2026, 04:00 pm') === MS2100, true);

  console.log('── v3.2.7: vía asistida (Playwright) también colapsa los espacios ──');
  T('servicio: reintenta con espacios colapsados antes del texto libre', /colapsada = base\.replace\(\/\\s\+\/g, ' '\)/.test(svcjs) && svcjs.includes('filename:"${colapsada}"'), true);
  T('servicio: el texto libre usa el nombre colapsado', svcjs.includes('await this._buscar(colapsada || base)'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_327.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_327.js generado')
