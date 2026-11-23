/* Test v3.2.35 — LA HORA DE RECEPCIÓN ES LA DE LA FILA DE LA LISTA.
   Reporte real (pv2066): el correo fue RECIBIDO el 21/11 a las 10:34 UTC
   (05:34 Lima — lo que Gmail muestra en la bandeja), pero el sistema AIS
   lo envió con un Date header descuadrado (20/11 10:22 UTC): la vía
   asistida leía la CABECERA del mensaje (hora de envío) y capturaba
   10:22. Ahora, cuando el adjunto está en el ÚLTIMO/único mensaje, manda
   la hora de la FILA (la recepción que muestra la lista). Ejercicio de
   los métodos REALES de GmailHoraService (sin navegador). */
'use strict';
const GmailHoraService = require('/home/z/my-project/src/gmail-hora/GmailHoraService.js');
const { parseHoraGmail, ahoraZona } = require('/home/z/my-project/src/gmail-hora/hora.js');
const svc = new GmailHoraService({ onProgress: () => {} });
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}
const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

/* 1) EL REPORTE: adjunto en el ÚLTIMO mensaje, fila con la RECEPCIÓN de
      hoy → manda la FILA aunque la cabecera diga otra (incluso otro día) */
const r1 = svc._decidirHoraCorreo('20 de noviembre de 2026, 5:22 a. m.', true, '5:34 a. m.');
chk('pv2066: gana la hora de la FILA (recepción)', r1, { hora: '5:34 a. m.', fuente: 'fila-recepcion' });

/* y esa hora se interpreta como HOY Lima → 10:34 UTC de HOY (dinámico: no caduca) */
const hoy = ahoraZona(-300);
chk('fila «5:34 a. m.» → 10:34 UTC (HOY Lima)',
  iso(parseHoraGmail('5:34 a. m.')),
  new Date(Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia, 10, 34)).toISOString());
chk('cabecera descuadrada habría dado 10:22 UTC (20/11) — lo que YA NO se usa',
  iso(parseHoraGmail('20 de noviembre de 2026, 5:22 a. m.')), '2026-11-20T10:22:00.000Z');

/* 2) correo suelto con fila de fecha completa → manda la fila */
const r2 = svc._decidirHoraCorreo('21 de noviembre de 2026, 5:22 a. m.', true, 'sáb, 21 nov, 5:34 a. m.');
chk('fila con fecha completa manda', r2, { hora: 'sáb, 21 nov, 5:34 a. m.', fuente: 'fila-recepcion' });

/* 3) adjunto en un mensaje ANTERIOR del hilo (regla 3.2.31): la fila es
      la recepción de OTRO mensaje más nuevo → se mantiene la cabecera */
const r3 = svc._decidirHoraCorreo('20 de noviembre de 2026, 5:22 a. m.', false, '5:34 a. m.');
chk('adjunto en mensaje viejo: manda su cabecera (3.2.31)', r3,
  { hora: '20 de noviembre de 2026, 5:22 a. m.', fuente: 'mensaje-del-adjunto' });

/* 4) fila SIN hora legible («20 nov») → no sirve como hora: cabecera */
const r4 = svc._decidirHoraCorreo('21 de noviembre de 2026, 5:22 a. m.', true, '20 nov');
chk('fila sin hora → cabecera del mensaje', r4,
  { hora: '21 de noviembre de 2026, 5:22 a. m.', fuente: 'mensaje-del-adjunto' });

/* 5) fila no capturada (null) → cabecera */
const r5 = svc._decidirHoraCorreo('21 de noviembre de 2026, 5:22 a. m.', true, null);
chk('fila null → cabecera del mensaje', r5,
  { hora: '21 de noviembre de 2026, 5:22 a. m.', fuente: 'mensaje-del-adjunto' });

/* 6) cadena completa del resultado: el renderer recibe la hora elegida
      (main.js la convierte con el MISMO parseHoraGmail ya probado) */
/* la cadena del ejemplo se construye sobre HOY (el «solo hora» siempre es hoy) */
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES3 = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const hoyTxt = `${DIAS[new Date(Date.now() - 300 * 60000).getUTCDay()]}, ${hoy.dia} ${MESES3[hoy.mes]}, 5:34 a. m.`;
chk('fecha + hora elegidas cuadran (HOY 10:34 UTC)',
  iso(parseHoraGmail('5:34 a. m.')), iso(parseHoraGmail(hoyTxt)));

console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ FILA-RECEPCIÓN OK (7/7)');
process.exit(fallos ? 1 : 0);
