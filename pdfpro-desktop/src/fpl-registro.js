/* PDFPro — fpl-registro.js (v2.9.13 · corregido a UTC en v2.9.14)
 * Módulo puro del proceso principal: carpeta de registro FPL por fecha.
 *   Registro: <Escritorio>\REGISTROS FPL NOTAM\FPL\<año>\<MM Mes>\<DD>
 *   La fecha es UTC (hora zulú): en aviación se trabaja con hora UTC,
 *   igual que el sello de recepción de la ficha. Un FPL recibido a las
 *   23:30Z del 13 va a la carpeta 13 aunque en Lima ya sea tarde;
 *   a las 01:30Z del 14 va a la carpeta 14.
 * No requiere Electron: se puede probar con Node directamente. */
'use strict';

const path = require('path');
const fs = require('fs');

const MESES_FPL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Partes de fecha {anio, mes, dia, mesNombre} en hora UTC (zulú). */
function fechaUTC(cuando) {
  const d = cuando instanceof Date ? cuando : new Date();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return {
    anio: String(d.getUTCFullYear()),
    mes: mes,
    dia: String(d.getUTCDate()).padStart(2, '0'),
    mesNombre: MESES_FPL[d.getUTCMonth()]
  };
}

/** Ruta de la carpeta del día dentro del registro FPL. */
function carpetaDia(base, cuando) {
  const f = fechaUTC(cuando);
  return path.join(base, f.anio, f.mes + ' ' + f.mesNombre, f.dia);
}

/** Ruta libre ante colisiones: «OB2147 MK.pdf», «OB2147 MK (2).pdf», … */
function rutaUnica(dir, nombre) {
  let ruta = path.join(dir, nombre);
  if (!fs.existsSync(ruta)) return ruta;
  const ext = path.extname(nombre);
  const base = path.basename(nombre, ext);
  for (let i = 2; i < 1000; i++) {
    ruta = path.join(dir, base + ' (' + i + ')' + ext);
    if (!fs.existsSync(ruta)) return ruta;
  }
  return path.join(dir, Date.now() + '-' + nombre);
}

/** Caracteres válidos para nombres de archivo de Windows. */
function saneaNombre(nombre) {
  return String(nombre || 'documento').replace(/[\\/:*?"<>|]/g, '_').trim() || 'documento';
}

module.exports = { MESES_FPL, fechaUTC, carpetaDia, rutaUnica, saneaNombre };
