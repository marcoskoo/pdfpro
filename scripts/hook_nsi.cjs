/* Hook de captura: intercepta el script NSIS final que electron-builder
 * pasa a makensis por stdin y lo guarda en /tmp/captured-installer.nsi.
 * Uso: NODE_OPTIONS="--require /home/z/my-project/scripts/hook_nsi.cjs" npx electron-builder ... */
try {
  const bu = require('/home/z/my-project/pdfpro-desktop/node_modules/builder-util');
  const orig = bu.spawnAndWriteWithOutput;
  if (typeof orig !== 'function') throw new Error('spawnAndWriteWithOutput no encontrado');
  let n = 0;
  bu.spawnAndWriteWithOutput = function () {
    try {
      const cmd = String(arguments[0] || '');
      if (cmd.toLowerCase().includes('makensis')) {
        n++;
        const script = String(arguments[2] || '');
        require('fs').writeFileSync('/tmp/captured-installer-' + n + '.nsi', script);
        console.error('[hook] script NSIS #' + n + ' capturado: ' + script.length + ' caracteres');
      }
    } catch (e) { console.error('[hook] error: ' + e.message); }
    return orig.apply(this, arguments);
  };
} catch (e) {
  console.error('[hook] no aplicado: ' + e.message);
}
