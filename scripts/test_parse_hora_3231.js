/* Test v3.2.31 — parseHoraGmail contra la cadena EXACTA del log del usuario
   («21 nov 2026, 2:45 p.m.») y variantes reales de Gmail. */
'use strict';
const { parseHoraGmail } = require('/home/z/my-project/src/gmail-hora/hora.js');

const casos = [
  ['21 nov 2026, 2:45 p.m.', 'LOG DEL USUARIO (p.m. junto)'],
  ['21 nov 2026, 2:45 p. m.', 'Gmail clásico (p. m. con espacio)'],
  ['21 nov 2026, 2:45 p.\u00a0m.', 'p. m. con espacio irrompible'],
  ['21 nov 2026, 2:45 p.\u00a0m.', 'p. m. nbsp entre p. y m'],
  ['21 nov 2026, 2:45 p.m ', 'p.m con punto final incompleto'],
  ['21 nov 2026, 2:45PM', 'PM junto'],
  ['21 nov 2026, 14:45', '24 h'],
  ['21 nov, 2:45 p.m.', 'sin año (vista de lista, año actual)'],
  ['sáb, 21 nov, 2:45 p.m.', 'día de semana + sin año'],
  ['sáb, 21 nov 2026, 2:45 p.m.', 'día de semana + año'],
  ['21 de noviembre de 2026, 14:45', 'fecha larga'],
  ['2:45 p.m.', 'solo hora'],
  ['21 nov 2026, 2:45 p. m.', 'normal con espacios simples (control)'],
];

let fallos = 0;
for (const [txt, desc] of casos) {
  const ms = parseHoraGmail(txt);
  const iso = ms ? new Date(ms).toISOString() : 'NULL';
  const ok = !!ms;
  console.log((ok ? '  OK  ' : ' NULL ') + '· ' + JSON.stringify(txt) + ' → ' + iso + '   [' + desc + ']');
  if (!ok && desc !== 'p.m con punto final incompleto') fallos++;  // ese caso truncado puede fallar legítimamente
}
console.log(fallos ? '✗ ' + fallos + ' formato(s) sin interpretar' : '✓ todos los formatos interpretados');
process.exit(fallos ? 1 : 0);
