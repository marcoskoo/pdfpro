/* Test v3.2.37 — la re-búsqueda tolera la PÁGINA LENTA de Gmail.
   Reporte real (pv2066, log 18:17): la v3.2.36 SÍ re-buscó, pero la
   primera consulta filename:"pv2066 1200 (2)" (la base con «(n)» del
   duplicado descargado, que Gmail nunca encuentra) no mostró NI filas NI
   el aviso de «Ningún resultado» en 12 s — «la página no cargó del todo;
   se continúa con lo que haya…» — y la cadena la dio por buena: nunca
   probó la consulta sin «(n)» (filename:"pv2066 1200", la que trae los
   DOS correos del archivo) y se quedó con la cabecera 20/11 5:22 (1022).
   v3.2.37: una consulta sin filas NO se da por buena — se espera a que la
   página pinte (aviso o filas) y si no hay filas se pasa a la siguiente
   consulta. Además el asunto se captura ANTES de re-buscar (el resultado
   decía «Resultados de búsqueda - … — Gmail», no el asunto del correo). */
'use strict';
const GmailHoraService = require('/home/z/my-project/src/gmail-hora/GmailHoraService.js');
const { parseHoraGmail } = require('/home/z/my-project/src/gmail-hora/hora.js');
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}
const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

(async () => {
  /* 1) EL FALLO DE LAS 18:17: la consulta «(2)» no da filas NI aviso (Gmail
        lento) → la cadena debe pasar a la consulta sin «(n)» y abrir el
        correo MÁS RECIENTE de los dos que la traen */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    const consultas = [];
    let esperaLenta = 0;
    svc._buscar = async (q) => { consultas.push(q); };
    svc._haySinResultados = async () => false;          /* jamás aparece el aviso */
    svc._ordenFilasPorFecha = async () =>
      consultas[consultas.length - 1].includes('(2)') ? [] /* la «(2)» no existe en Gmail */
        : [{ idx: 0, fecha: 'sáb, 21 nov 2026, 5:34 a.m.' }, { idx: 1, fecha: 'vie, 20 nov 2026, 5:22 a.m.' }];
    svc.page = { evaluate: async () => true, waitForTimeout: async () => { esperaLenta++; }, title: async () => 'Gmail' };
    svc._esperarAdjuntos = async () => {};
    svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
    const r = await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf');
    chk('consultó la «(2)» Y LUEGO la sin «(n)»', consultas,
      ['filename:"pv2066 1200 (2)"', 'filename:"pv2066 1200"']);
    chk('la «(2)» sin filas: esperó a que la página pintara (≥1 espera)', esperaLenta >= 5, true);
    chk('abrió el MÁS RECIENTE de los dos correos (21/11 5:34)', r, 'sáb, 21 nov 2026, 5:34 a.m.');
    chk('→ 21/11 10:34 UTC (no 20/11 10:22)', iso(parseHoraGmail(r)), '2026-11-21T10:34:00.000Z');
  }

  /* 2) el aviso de «Ningún resultado» aparece a mitad de la espera de la
        primera consulta → se corta y se pasa a la siguiente sin esperar de más */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    const consultas = [];
    let intentos = 0;
    let esperas = 0;
    svc._buscar = async (q) => { consultas.push(q); };
    svc._haySinResultados = async () => consultas.length === 1 && intentos >= 1;
    svc._ordenFilasPorFecha = async () => {
      intentos++;
      return consultas.length === 1 ? []
        : [{ idx: 0, fecha: 'sáb, 21 nov 2026, 5:34 a.m.' }];
    };
    svc.page = { evaluate: async () => true, waitForTimeout: async () => { esperas++; }, title: async () => 'Gmail' };
    svc._esperarAdjuntos = async () => {};
    svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
    const r = await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf');
    chk('aviso a mitad de espera → siguiente consulta → 21/11 5:34', r, 'sáb, 21 nov 2026, 5:34 a.m.');
    chk('no esperó de más tras el aviso (1 del sondeo + 1 al abrir, no 5)', esperas, 2);
  }

  /* 3) ASUNTO CORRECTO AUNQUE LA RE-BÚSQUEDA FALLE: se captura ANTES de
        re-buscar — no más «Resultados de búsqueda - … — Gmail» */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    let enBusqueda = false;
    const consultas = [];
    svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'vie, 20 nov 2026, 5:22 a.m.', esUltimo: false });
    svc._extraerMeta = async () => (enBusqueda
      ? { asunto: 'Resultados de búsqueda - sphiaisaro@gmail.com — Gmail', remitenteNombre: '', remitenteCorreo: '', archivoAdjunto: '' }
      : { asunto: 'ATC JAP 7161 211126', remitenteNombre: 'AIS CORPAC', remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'pv2066 1200.pdf' });
    svc._buscar = async (q) => { consultas.push(q); enBusqueda = true; };   /* tras re-buscar la vista es la de búsqueda */
    svc._haySinResultados = async () => true;                               /* re-búsqueda sin resultados */
    svc.page = { evaluate: async () => true, waitForTimeout: async () => {}, title: async () => 'Gmail' };
    const r = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
    chk('re-búsqueda fallida → cabecera (3.2.31)',
      { hora: r.horaRecepcion, fuente: r.fuente },
      { hora: 'vie, 20 nov 2026, 5:22 a.m.', fuente: 'mensaje-del-adjunto' });
    chk('y el ASUNTO es el del correo emparejado (no «Resultados de búsqueda…»)',
      r.asunto, 'ATC JAP 7161 211126');
  }

  /* 4) re-búsqueda con ÉXITO: el asunto es el del correo RE-ABIERTO (el más
        reciente con el archivo), no el del hilo emparejado */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    let enBusqueda = false;
    svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'vie, 20 nov 2026, 5:22 a.m.', esUltimo: false });
    svc._extraerMeta = async () => (enBusqueda
      ? { asunto: 'pv2066 1200 (nuevo)', remitenteNombre: 'AIS CORPAC', remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'pv2066 1200.pdf' }
      : { asunto: 'ATC JAP 7161 211126', remitenteNombre: 'AIS CORPAC', remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'pv2066 1200.pdf' });
    svc._buscar = async () => { enBusqueda = true; };
    svc._haySinResultados = async () => false;
    svc._ordenFilasPorFecha = async () => [{ idx: 0, fecha: 'sáb, 21 nov 2026, 5:34 a.m.' }];
    svc.page = { evaluate: async () => true, waitForTimeout: async () => {}, title: async () => 'Gmail' };
    svc._esperarAdjuntos = async () => {};
    svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
    svc._horaFilaAbierta = 'sáb, 21 nov 2026, 5:03 p.m.';
    const r = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
    chk('éxito: hora del MÁS RECIENTE (21/11 5:34)', r.horaRecepcion, 'sáb, 21 nov 2026, 5:34 a.m.');
    chk('y asunto del correo re-abierto', r.asunto, 'pv2066 1200 (nuevo)');
  }

  console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ PÁGINA-LENTA OK (11/11)');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
