/* Pruebas unitarias del módulo fpl-registro (Node puro, sin Electron)
 * Ejecutar: node /home/z/my-project/scripts/test_fpl_registro.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { fechaLima, carpetaDia, rutaUnica, saneaNombre } = require('/home/z/my-project/pdfpro-desktop/src/fpl-registro.js');

let fallos = 0;
function t(nombre, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + nombre + ' → ' + JSON.stringify(obtenido) + (ok ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'));
}

console.log('══ 1. Fecha Lima (UTC-5) ══');
// 13 nov 2026, 15:00 Lima (= 20:00 UTC del mismo día)
const f1 = fechaLima(new Date('2026-11-13T20:00:00Z'));
t('13 nov 2026 20:00Z → Lima 13', f1.dia, '13');
t('mes 11', f1.mes, '11');
t('mesNombre Noviembre', f1.mesNombre, 'Noviembre');
t('año 2026', f1.anio, '2026');

// 14 nov 01:00 UTC = 13 nov 20:00 Lima → sigue siendo día 13 (clave del requisito UTC-5)
const f2 = fechaLima(new Date('2026-11-14T01:00:00Z'));
t('14 nov 01:00Z → Lima aún 13', f2.dia, '13');

// fin de año UTC vs Lima: 1 ene 2027 02:00Z = 31 dic 2026 21:00 Lima
const f3 = fechaLima(new Date('2027-01-01T02:00:00Z'));
t('1 ene 2027 02:00Z → Lima 31/12/2026 (día)', f3.dia, '31');
t('…mes Diciembre', f3.mesNombre, 'Diciembre');
t('…año 2026', f3.anio, '2026');

// cambio de mes: 1 dic 2026 03:30Z = 30 nov 22:30 Lima
const f4 = fechaLima(new Date('2026-12-01T03:30:00Z'));
t('1 dic 03:30Z → Lima 30/11 (día)', f4.dia, '30');
t('…mes 11 Noviembre', f4.mes, '11');

console.log('══ 2. Carpeta del día ══');
const base = path.join('C:', 'Users', 'aissphi', 'Desktop', 'REGISTROS FPL NOTAM', 'FPL');
const c1 = carpetaDia(base, new Date('2026-11-13T20:00:00Z'));
const esperada = path.join(base, '2026', '11 Noviembre', '13');
t('ruta del ejemplo del usuario (13 nov 2026)', c1, esperada);
const c2 = carpetaDia(base, new Date('2027-01-01T02:00:00Z'));
t('fin de año Lima → 2026\\12 Diciembre\\31', c2, path.join(base, '2026', '12 Diciembre', '31'));

console.log('══ 3. Colisiones de nombre ══');
const tmp = fs.mkdtempSync('/tmp/fpl-test-');
t('primera vez → nombre limpio', rutaUnica(tmp, 'OB2147 MK.pdf'), path.join(tmp, 'OB2147 MK.pdf'));
fs.writeFileSync(path.join(tmp, 'OB2147 MK.pdf'), 'x');
t('ya existe → (2)', rutaUnica(tmp, 'OB2147 MK.pdf'), path.join(tmp, 'OB2147 MK (2).pdf'));
fs.writeFileSync(path.join(tmp, 'OB2147 MK (2).pdf'), 'x');
t('dos existentes → (3)', rutaUnica(tmp, 'OB2147 MK.pdf'), path.join(tmp, 'OB2147 MK (3).pdf'));
t('sin extensión → sin doble punto', rutaUnica(tmp, 'OB2147 MK'), path.join(tmp, 'OB2147 MK'));
fs.writeFileSync(path.join(tmp, 'doc.xlsx'), 'x');
t('xlsx colisiona → doc (2).xlsx', rutaUnica(tmp, 'doc.xlsx'), path.join(tmp, 'doc (2).xlsx'));

console.log('══ 4. Saneo de caracteres prohibidos en Windows ══');
t('barra → _', saneaNombre('a/b.pdf'), 'a_b.pdf');
t('dos puntos → _', saneaNombre('OB:2147*.pdf'), 'OB_2147_.pdf');
t('vacío → documento', saneaNombre(''), 'documento');
t('nombre válido intacto', saneaNombre('OB2147 MK.pdf'), 'OB2147 MK.pdf');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS PASARON ✓' : '\nFALLOS: ' + fallos);
process.exit(fallos === 0 ? 0 : 1);
