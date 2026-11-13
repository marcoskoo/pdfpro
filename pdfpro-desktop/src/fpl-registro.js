/* PDFPro — fpl-registro.js (v2.9.13)
 * Módulo puro del proceso principal: carpeta de registro FPL por fecha.
 *   Registro: <Escritorio>\REGISTROS FPL NOTAM\FPL\<año>\<MM Mes>\<DD>
 *   La fecha es la de Lima (Perú, UTC-5): «trabajamos con hora UTC+5» —
 *   un archivo guardado a las 20:30 Lima del 13 sigue yendo a la carpeta 13
 *   aunque la hora UTC ya sea 14.
 * No requiere Electron: se puede probar con Node directamente. */
'use strict';

const path = require('path');
const fs = require('fs');

const MESES_FPL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Partes de fecha {anio, mes, dia, mesNombre} en hora de Lima (UTC-5). */
function fechaLima(cuando) {
  const d = cuando instanceof Date ? cuando : new Date();
  try {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const g = (t) => { const p = partes.find((q) => q.type === t); return p ? p.value : ''; };
    const mes = g('month');
    return { anio: g('year'), mes: mes, dia: g('day'), mesNombre: MESES_FPL[parseInt(mes, 10) - 1] || mes };
  } catch (e) {
    // sin Intl completo: hora local como respaldo
    return {
      anio: String(d.getFullYear()),
      mes: String(d.getMonth() + 1).padStart(2, '0'),
      dia: String(d.getDate()).padStart(2, '0'),
      mesNombre: MESES_FPL[d.getMonth()]
    };
  }
}

/** Ruta de la carpeta del día dentro del registro FPL. */
function carpetaDia(base, cuando) {
  const f = fechaLima(cuando);
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

module.exports = { MESES_FPL, fechaLima, carpetaDia, rutaUnica, saneaNombre };
