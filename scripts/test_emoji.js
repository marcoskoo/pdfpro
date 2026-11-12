// ¿drawText con emoji en fuente estándar lanza error y pierde TODO el texto?
const v = require('/home/z/my-project/pdfpro-desktop/src/app/vendor/pdf-lib.min.js');
const PDFLib = v.PDFDocument ? v : (global.window = global.window || {}, Object.assign(global.window, v), v);
(async () => {
  const doc = await PDFLib.PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const hb = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  // 1) texto con emoji
  try {
    page.drawText('\u2705 APROBADO', { x: 50, y: 700, size: 14, font: hb });
    console.log('drawText emoji: OK (no lanzó)');
  } catch (e) { console.log('drawText emoji THREW:', e.message.slice(0, 120)); }
  // 2) solo emoji
  try {
    page.drawText('\u2705', { x: 50, y: 650, size: 14, font: hb });
    console.log('drawText solo emoji: OK');
  } catch (e) { console.log('drawText solo emoji THREW:', e.message.slice(0, 120)); }
  // 3) texto ascii control
  try {
    page.drawText('APROBADO', { x: 50, y: 600, size: 14, font: hb });
    console.log('drawText ascii: OK');
  } catch (e) { console.log('drawText ascii THREW:', e.message.slice(0, 120)); }
  // 4) path corregido (y negada) — debe caer en y(bottom) 500..560
  try {
    const d = 'M 105 -500 H 195 Q 200 -500 200 -505 V -555 Q 200 -560 195 -560 H 105 Q 100 -560 100 -555 V -505 Q 100 -500 105 -500 Z';
    page.drawSvgPath(d, { borderColor: PDFLib.rgb(.75, 0, 0), borderWidth: 1.5 });
    console.log('drawSvgPath negado: OK');
  } catch (e) { console.log('drawSvgPath negado THREW:', e.message.slice(0, 120)); }
  const bytes = await doc.save();
  require('fs').writeFileSync('/tmp/emotest.pdf', bytes);
  console.log('saved');
})();
