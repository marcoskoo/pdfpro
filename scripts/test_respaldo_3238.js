/* Test v3.2.38 — LOS CAMINOS DE RESPALDO ya no entregan una hora que no
   sea la de RECEPCIÓN. Reporte (ficha SKX5303, captura 22/11 2337):
   quedaban DOS resquicios por donde entrar una hora equivocada cuando el
   correo emparejado ya era el correcto:
   (1) si el walk de chips no resolvía la fecha del mensaje (p. ej.
       correos sueltos cuya cabecera no expone fecha completa en [title]),
       se caía DIRECTO al camino viejo _extraerHora() — la cabecera
       arbitraria del hilo (el bug original de la 3.2.31);
   (2) la re-búsqueda filename: y su verificación usaban el nombre LOCAL
       del archivo (con «(n)» o renombrado) en vez del nombre REAL del
       adjunto que Gmail tiene a la vista.
   v3.2.38: sin chips → se re-busca por filename: (filas POR MENSAJE, el
   MÁS RECIENTE) antes del camino viejo; y la re-búsqueda usa el nombre
   REAL del adjunto del correo emparejado. */
'use strict';
const GmailHoraService = require('/home/z/my-project/src/gmail-hora/GmailHoraService.js');
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}
const paginabase = () => ({ evaluate: async () => true, waitForTimeout: async () => {}, title: async () => 'Gmail' });

(async () => {
  /* 1) SIN CHIPS RESUELTOS: ya NO cae directo a la cabecera vieja —
        re-busca por filename: y toma la fila del MÁS RECIENTE */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    const avisos = [];
    svc.opts.onProgress = (m) => avisos.push(m);
    svc._adjuntosAbiertos = async () => ['FICHA_ICAO_SPHI_SPJC_V2.pdf'];
    svc._extraerHoraMensajeAdjunto = async () => null;          /* chips no resuelven */
    svc._extraerHora = async () => { throw new Error('el camino viejo NO debe usarse aquí'); };
    svc._extraerMeta = async () => ({ asunto: 'FICHA SPHI SPJC', remitenteNombre: 'AIS', remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'FICHA_ICAO_SPHI_SPJC_V2.pdf' });
    const consultas = [];
    svc._buscar = async (q) => { consultas.push(q); };
    svc._haySinResultados = async () => false;
    svc._ordenFilasPorFecha = async () => [
      { idx: 0, fecha: 'dom, 22 nov 2026, 6:37 p. m.' },
      { idx: 1, fecha: 'sáb, 21 nov 2026, 11:02 a. m.' }
    ];
    svc.page = paginabase();
    svc._esperarAdjuntos = async () => {};
    const r = await svc._resultadoDeCorreoAbierto('FICHA_ICAO_SPHI_SPJC_V2 (2).pdf', false);
    chk('sin chips → re-búsqueda por MENSAJE (no la cabecera vieja)',
      { hora: r.horaRecepcion, fuente: r.fuente },
      { hora: 'dom, 22 nov 2026, 6:37 p. m.', fuente: 'fila-recepcion' });
    chk('consultó con el nombre REAL del adjunto (sin «(2)»)', consultas, ['filename:"FICHA_ICAO_SPHI_SPJC_V2"']);
    chk('aviso con la fuente «lista de Gmail»', avisos.some((m) => m.includes('hora de RECEPCIÓN de la lista de Gmail')), true);
    chk('asunto del correo (no «Resultados de búsqueda…»)', r.asunto, 'FICHA SPHI SPJC');
  }

  /* 2) RE-BÚSQUEDA CON EL NOMBRE REAL cuando el local traía «(2)»:
        la consulta base ya no es la del duplicado descargado */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
    svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'vie, 20 nov 2026, 5:22 a.m.', esUltimo: false });
    svc._extraerMeta = async () => ({ asunto: 'pv2066', remitenteNombre: 'AIS', remitenteCorreo: 'a@b.c', archivoAdjunto: 'pv2066 1200.pdf' });
    const consultas = [];
    svc._buscar = async (q) => { consultas.push(q); };
    svc._haySinResultados = async () => false;
    svc._ordenFilasPorFecha = async () => [{ idx: 0, fecha: 'sáb, 21 nov 2026, 5:34 a.m.' }];
    svc.page = paginabase();
    svc._esperarAdjuntos = async () => {};
    svc._horaFilaAbierta = 'sáb, 21 nov 2026, 5:03 p.m.';
    const r = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
    chk('mensaje anterior → re-búsqueda con el nombre REAL', consultas, ['filename:"pv2066 1200"']);
    chk('→ hora del MÁS RECIENTE (21/11 5:34)', r.horaRecepcion, 'sáb, 21 nov 2026, 5:34 a.m.');
  }

  /* 3) SIN LISTA DE ADJUNTOS al sondear (excepción): usa el nombre local
        y sigue (la «(2)» se descarta al no hallar filas) */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    let veces = 0;
    svc._adjuntosAbiertos = async () => { if (++veces === 1) throw new Error('sin panel'); return ['FICHA_ICAO_SPHI_SPJC_V2.pdf']; };
    svc._extraerHoraMensajeAdjunto = async () => null;
    svc._extraerMeta = async () => ({ asunto: 'X', remitenteNombre: '', remitenteCorreo: '', archivoAdjunto: '' });
    const consultas = [];
    svc._buscar = async (q) => { consultas.push(q); };
    svc._haySinResultados = async () => false;
    svc._ordenFilasPorFecha = async () =>
      (consultas[consultas.length - 1].includes('(2)') ? []
        : [{ idx: 0, fecha: 'dom, 22 nov 2026, 6:37 p. m.' }]);
    svc.page = paginabase();
    svc._esperarAdjuntos = async () => {};
    svc._extraerHora = async () => { throw new Error('no debe llegar aquí'); };
    const r = await svc._resultadoDeCorreoAbierto('FICHA_ICAO_SPHI_SPJC_V2 (2).pdf', false);
    chk('sin panel de adjuntos → nombre local (base y sin «(n)»)',
      consultas, ['filename:"FICHA_ICAO_SPHI_SPJC_V2 (2)"', 'filename:"FICHA_ICAO_SPHI_SPJC_V2"']);
    chk('y aún así captura la recepción del más reciente', r.horaRecepcion, 'dom, 22 nov 2026, 6:37 p. m.');
  }

  /* 4) TODO FALLA (sin chips, re-búsqueda sin resultados) → el camino
        viejo de la cabecera se mantiene como ÚLTIMO recurso */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    svc._adjuntosAbiertos = async () => ['FICHA_ICAO_SPHI_SPJC_V2.pdf'];
    svc._extraerHoraMensajeAdjunto = async () => null;
    svc._extraerMeta = async () => ({ asunto: 'FICHA SPHI SPJC', remitenteNombre: 'AIS', remitenteCorreo: 'a@b.c', archivoAdjunto: 'FICHA_ICAO_SPHI_SPJC_V2.pdf' });
    svc._buscar = async () => {};
    svc._haySinResultados = async () => true;                   /* re-búsqueda sin resultados */
    svc.page = paginabase();
    svc._extraerHora = async () => ({ hora: 'dom, 22 nov 2026, 6:37 p.m.', fuente: 'detalles' });
    const r = await svc._resultadoDeCorreoAbierto('FICHA_ICAO_SPHI_SPJC_V2 (2).pdf', false);
    chk('todo falla → camino viejo (cabecera) como último recurso',
      { hora: r.horaRecepcion, fuente: r.fuente },
      { hora: 'dom, 22 nov 2026, 6:37 p.m.', fuente: 'detalles' });
  }

  /* 5) forma completa del resultado (v3.2.38 _armarResultado) */
  {
    const svc = new GmailHoraService({ onProgress: () => {} });
    svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
    svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'x', esUltimo: true });
    svc._horaFilaAbierta = 'sáb, 21 nov 2026, 5:03 p.m.';
    svc._extraerMeta = async () => ({ asunto: 'ATC JAP 7161 211126', remitenteNombre: 'AIS CORPAC', remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'pv2066 1200.pdf' });
    svc.page = paginabase();
    let copiado = 0;
    svc.copiarAlPortapapeles = async () => { copiado++; return true; };
    const r = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', true);
    chk('forma del resultado (último mensaje → fila directa, con copia)',
      { archivo: r.archivo, hora: r.horaRecepcion, fuente: r.fuente, asunto: r.asunto, remitente: r.remitente, correo: r.remitenteCorreo, adjunto: r.archivoAdjunto, copiado: r.copiadoAlPortapapeles },
      { archivo: 'pv2066 1200 (2).pdf', hora: 'sáb, 21 nov 2026, 5:03 p.m.', fuente: 'fila-recepcion', asunto: 'ATC JAP 7161 211126', remitente: 'AIS CORPAC', correo: 'ais@corpac.gob.pe', adjunto: 'pv2066 1200.pdf', copiado: true });
    chk('copió al portapapeles una sola vez', copiado, 1);
  }

  console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ RESPALDOS OK (11/11)');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
