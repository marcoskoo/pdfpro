#!/bin/bash
# Post-build v3.2.35: verifica el paquete (asar), genera SHA256 y fija
# copias de los artefactos en download/ (dist/ se sobreescribe en cada build).
set -e
cd /home/z/my-project

echo "== 1) artefactos =="
ls -la dist/PDFPro-Setup-3.2.35.exe dist/PDFPro-Setup-3.2.35.exe.blockmap \
      dist/PDFPro-Portable-3.2.35.exe dist/latest.yml

echo "== 2) verificación del paquete (asar) =="
node -e "
const asar=require('@electron/asar');
const idx=asar.extractFile('dist/win-unpacked/resources/app.asar','src/app/index.html').toString('utf8');
const main=asar.extractFile('dist/win-unpacked/resources/app.asar','src/main.js').toString('utf8');
const mon=asar.extractFile('dist/win-unpacked/resources/app.asar','src/gmail-monitor.js').toString('utf8');
const pkg=JSON.parse(asar.extractFile('dist/win-unpacked/resources/app.asar','package.json').toString('utf8'));
let ok=true;
function chk(nombre,cond){console.log((cond?'  OK  ':' FALLA')+' · '+nombre);if(!cond)ok=false;}
chk('versión del paquete = 3.2.35 ('+pkg.version+')', pkg.version==='3.2.35');
chk('fix por pestaña dentro del asar (_gmailReintentoTabs)', idx.includes('_gmailReintentoTabs'));
chk('cola de barridos dentro del asar (_gmailWebEnCola)', idx.includes('_gmailWebEnCola'));
chk('429 no amplifica: guard de cuota (_cuota)', idx.includes('var _cuota=false'));
chk('backoff de la cadena (300000)', idx.includes('e.n<=4?60000:300000'));
chk('versión en los avisos (_HORA_VER v3.2.35, declarada y usada en los 4 avisos)', idx.includes(\"_HORA_VER='v3.2.35'\")&&(idx.match(/_HORA_VER/g)||[]).length>=5);
chk('registro forense (_gmailHoraLog/_ghlog)', idx.includes('_gmailHoraLog')&&idx.includes('function _ghlog'));
chk('pie de página v3.2.35', idx.includes('CORPAC AIS/ARO Platform v3.2.35'));
chk('main.js: pausa de la cola (350)', main.includes('_gmailApiPausa(350)'));
chk('gmail-monitor.js: reintento 429', mon.includes('r.status === 429'));
const svc=asar.extractFile('dist/win-unpacked/resources/app.asar','src/gmail-hora/GmailHoraService.js').toString('utf8');
chk('servicio: hora del MENSAJE del adjunto (_extraerHoraMensajeAdjunto)', svc.includes('_extraerHoraMensajeAdjunto'));
chk('servicio: expandir hilo + fuente mensaje-del-adjunto', svc.includes('Expandir todos')&&svc.includes('mensaje-del-adjunto'));
chk('servicio: orden por FECHA del recorrido (_ordenFilasPorFecha)', svc.includes('_ordenFilasPorFecha')&&svc.includes('_ordenarInfoPorFecha'));
const horajs=asar.extractFile('dist/win-unpacked/resources/app.asar','src/gmail-hora/hora.js').toString('utf8');
chk('hora.js: signo de ahoraZona corregido (+ offsetMin)', horajs.includes('Date.now() + offsetMin * 60000'));
chk('monitor: orden API por internalDate (primerMatchOrdenado)', mon.includes('primerMatchOrdenado'));
chk('monitor: pollOrdenado ordena DESC antes del match', mon.includes('detalles.sort((a, b) => (b.recibidoMs || 0) - (a.recibidoMs || 0))'));
chk('web: _gmailWebBarridoOrdenadoInt ordena DESC antes del match', idx.includes('detalles.sort(function(a,b){return (b.recibidoMs||0)-(a.recibidoMs||0);});'));
chk('web: botón de re-captura forzada (gmailHoraForzar)', idx.includes('function gmailHoraForzar()')&&idx.includes('🔄 Re-buscar hora del correo'));
chk('web: forzar pisa solo horas programáticas', idx.includes('if(rxT&&rxT.value&&(!forzar||_gmailHoraManual))return true;'));
chk('servicio: hora de RECEPCIÓN de la fila (fila-recepcion)', svc.includes('fila-recepcion')&&svc.includes('_decidirHoraCorreo'));
chk('servicio: fila recordada al abrir (_horaFilaAbierta)', svc.includes('_horaFilaAbierta')&&svc.includes('esUltimo'));
process.exit(ok?0:1);
"

echo "== 3) SHA256 =="
{
  echo "PDFPro Suite 3.2.35 — SHA256 (generado $(date -u +%Y-%m-%dT%H:%M:%SZ))"
  echo
  (cd dist && sha256sum PDFPro-Setup-3.2.35.exe PDFPro-Portable-3.2.35.exe)
} > download/PDFPro-3.2.35-SHA256.txt
cat download/PDFPro-3.2.35-SHA256.txt

echo "== 4) copias fijas en download/ =="
cp dist/PDFPro-Setup-3.2.35.exe dist/PDFPro-Setup-3.2.35.exe.blockmap \
   dist/PDFPro-Portable-3.2.35.exe download/
cp dist/latest.yml download/latest-v3.2.35.yml
echo "latest.yml del build:"; cat dist/latest.yml
echo "== POST-BUILD v3.2.35 COMPLETO =="
