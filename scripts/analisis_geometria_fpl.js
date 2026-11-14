/* Análisis geométrico del FPL real (ATC CM468) con pdfjs-dist —
 * replica exactamente lo que ve la app: getTextContent().items con transform.
 * Objetivo: entender cómo reconstruir el casillero 7 (identificación de aeronave)
 * a partir de las coordenadas, porque el orden del content stream viene revuelto. */
'use strict';
const fs = require('fs');
const path = require('path');

async function main() {
  // pdfjs empaquetado con la propia app (el mismo que usa index.html)
  const pdfjs = require('/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.min.js');
  pdfjs.GlobalWorkerOptions.workerSrc = '/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.worker.min.js';

  const file = process.argv[2] || '/home/z/my-project/upload/ATC CM468  11NOV.pdf';
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pg = await doc.getPage(1);
  const tc = await pg.getTextContent();

  // normalizar items: str + x,y (esquina inferior izquierda) + w,h
  const items = tc.items.filter(i => i.str && i.str.trim()).map(i => {
    const t = i.transform; // [a,b,c,d,e,f]
    return { str: i.str, x: t[4], y: t[5], w: i.width, h: i.height || (t[3]) };
  });

  console.log('TOTAL items:', items.length);
  // ¿cómo queda el texto plano unido (lo que ve fplEscaneaTexto)?
  console.log('── pageTexts (unido con espacios) ──');
  console.log(tc.items.map(s => s.str).join(' '));

  // localizar las etiquetas del casillero 7
  const targets = ['IDENTIFICACION', 'IDENTIFICACIÓN', 'Aircraft', 'Identification', 'REGLAS', 'Flight', 'Rules'];
  console.log('\n── posiciones de etiquetas clave ──');
  items.forEach((it, idx) => {
    for (const tg of targets) {
      if (it.str.includes(tg)) {
        console.log(`#${idx} "${it.str}" x=${it.x.toFixed(1)} y=${it.y.toFixed(1)} h=${it.h.toFixed(1)} w=${(it.w || 0).toFixed(1)}`);
      }
    }
  });

  // volcar TODOS los items con su posición, ordenados por Y desc, para ver la fila del casillero 7
  console.log('\n── todos los items (orden por Y desc, luego X asc) ──');
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));
  sorted.forEach(it => {
    console.log(`y=${it.y.toFixed(1).padStart(6)} x=${it.x.toFixed(1).padStart(7)} h=${it.h.toFixed(1).padStart(5)} "${it.str}"`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
