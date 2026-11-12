// Test empírico: ¿dónde coloca drawSvgPath un path con coords PDF absolutas?
const path = require('path');
const { PDFLib } = { PDFLib: require('/home/z/my-project/pdfpro-desktop/src/app/vendor/pdf-lib.min.js') };
// pdf-lib.min.js expone window.PDFLib o module.exports — ajustar:
const lib = (typeof PDFLib !== 'undefined' && PDFLib.PDFDocument) ? PDFLib : (global.window ? global.window.PDFLib : null);
(async () => {
  const PDFDocument = lib ? lib.PDFDocument : require('/home/z/my-project/pdfpro-desktop/src/app/vendor/pdf-lib.min.js').PDFDocument;
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const RED = (lib || require('/home/z/my-project/pdfpro-desktop/src/app/vendor/pdf-lib.min.js')).rgb
    ? (lib || require('/home/z/my-project/pdfpro-desktop/src/app/vendor/pdf-lib.min.js')).rgb(.7529, 0, 0)
    : null;
  // 1) svg path con coords absolutas estilo PDF (y hacia arriba): caja en y=700..760
  const d = 'M 105 700 H 195 Q 200 700 200 705 V 755 Q 200 760 195 760 H 105 Q 100 760 100 755 V 705 Q 100 700 105 700 Z';
  try {
    page.drawSvgPath(d, { borderColor: RED, borderWidth: 1.5 });
    console.log('drawSvgPath OK (sin x/y)');
  } catch (e) { console.log('drawSvgPath threw:', e.message); }
  // 2) rectángulo de control en y=100..160
  page.drawRectangle({ x: 300, y: 100, width: 100, height: 60, borderColor: RED, borderWidth: 1.5 });
  const bytes = await doc.save();
  require('fs').writeFileSync('/tmp/svgtest.pdf', bytes);
  console.log('saved /tmp/svgtest.pdf', bytes.length, 'bytes');
})();
