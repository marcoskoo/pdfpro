/* Verificación v3.2.1 del pipeline de hora: texto de Gmail (zona Lima) →
 * parseHoraGmail (hora.js REAL) → lógica de gmailAplicarHora (web/index.html)
 * → ¿qué queda en «Hora Recepción (UTC)»? Regla pedida: UTC = Lima + 5 h
 * (07:00 Lima → 12:00 UTC, con cambio de fecha si cruza medianoche). */
'use strict';
const { parseHoraGmail, ahoraZona } = require('/home/z/my-project/src/gmail-hora/hora.js');

/* réplica exacta de gmailAplicarHora (web/index.html) */
function campoUTC(ms) {
  const d = new Date(ms);
  return {
    fecha: d.toISOString().slice(0, 10),
    hora: String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0')
  };
}

/* «hoy» en la zona Lima (para los casos de solo hora: correo de hoy) */
const hoyLima = ahoraZona(-300);
const hoyISO = `${hoyLima.anio}-${String(hoyLima.mes).padStart(2, '0')}-${String(hoyLima.dia).padStart(2, '0')}`;

const casos = [
  ['7:00 a. m.', { h: '1200', f: hoyISO, nota: 'CASO DEL USUARIO: 07:00 Lima → 12:00 UTC' }],
  ['07:00', { h: '1200', f: hoyISO, nota: '24 h sin a. m./p. m. (correo de hoy)' }],
  ['17 de noviembre de 2026, 7:00 a. m.', { h: '1200', f: '2026-11-17', nota: 'detalles: fecha completa' }],
  ['19 nov 2026, 8:00 p. m.', { h: '0100', f: '2026-11-20', nota: 'cruza medianoche: 20:00 Lima → 01:00 UTC del DÍA SIGUIENTE' }],
  ['19 nov 2026, 8:30 p. m.', { h: '0130', f: '2026-11-20', nota: '20:30 Lima → 01:30 UTC +1d' }],
  ['19 nov 2026, 12:05 a. m.', { h: '0505', f: '2026-11-19', nota: 'medianoche: 00:05 Lima → 05:05 UTC mismo día' }],
  ['19 nov 2026, 12:30 p. m.', { h: '1730', f: '2026-11-19', nota: 'mediodía: 12:30 Lima → 17:30 UTC' }],
  ['19 nov 2026, 11:55 p. m.', { h: '0455', f: '2026-11-20', nota: '23:55 Lima → 04:55 UTC +1d' }],
  ['sáb, 19 nov, 7:00 a. m.', { h: '1200', f: hoyISO, nota: 'con día de semana (correo de hoy en zona)' }],
  ['Nov 19, 2026, 7:00 AM', { h: null, f: null, nota: 'formato inglés: NO interpretado (se avisa con el texto crudo — v3.2.1)' }]
];

let fallos = 0;
for (const [textoGmail, esp] of casos) {
  const ms = parseHoraGmail(textoGmail);
  const c = ms ? campoUTC(ms) : null;
  if (esp.h === null) {
    const ok = ms === null;
    if (!ok) fallos++;
    console.log(`${ok ? '✓' : '✗ FALLO'} Gmail «${textoGmail}» → ${c ? c.fecha + ' ' + c.hora : '(no interpretada)'} · esperado: no interpretada — ${esp.nota}`);
    continue;
  }
  const ok = c && c.hora === esp.h && c.fecha === esp.f;
  if (!ok) fallos++;
  console.log(`${ok ? '✓' : '✗ FALLO'} Gmail «${textoGmail}» → campo ${c ? c.fecha + ' ' + c.hora : '(no interpretada)'} · esperado ${esp.f} ${esp.h} — ${esp.nota}`);
}
console.log(fallos === 0 ? '\n✓ CONVERSIÓN +05 CORRECTA EN TODO EL PIPELINE' : `\n✗ ${fallos} CASO(S) FALLAN`);
process.exit(fallos === 0 ? 0 : 1);
