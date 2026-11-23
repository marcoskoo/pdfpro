#!/bin/bash
# Post-build v3.2.29: verifica el paquete (asar), genera SHA256 y fija
# copias de los artefactos en download/ (dist/ se sobreescribe en cada build).
set -e
cd /home/z/my-project

echo "== 1) artefactos =="
ls -la dist/PDFPro-Setup-3.2.29.exe dist/PDFPro-Setup-3.2.29.exe.blockmap \
      dist/PDFPro-Portable-3.2.29.exe dist/latest.yml

echo "== 2) verificación del paquete (asar) =="
node -e "
const asar=require('@electron/asar');
const idx=asar.extractFile('dist/win-unpacked/resources/app.asar','src/app/index.html').toString('utf8');
const pkg=JSON.parse(asar.extractFile('dist/win-unpacked/resources/app.asar','package.json').toString('utf8'));
let ok=true;
function chk(nombre,cond){console.log((cond?'  OK  ':' FALLA')+' · '+nombre);if(!cond)ok=false;}
chk('versión del paquete = 3.2.29 ('+pkg.version+')', pkg.version==='3.2.29');
chk('fix multi-pestaña dentro del asar (_gmailReintentoTabs)', idx.includes('_gmailReintentoTabs'));
chk('cola de barridos dentro del asar (_gmailWebEnCola)', idx.includes('_gmailWebEnCola'));
chk('sin código del temporizador global viejo', !idx.includes('_gmailReintentoT=null')&&!idx.includes('_gmailReintentoN')&&!idx.includes('_gmailReintentoTab='));
chk('pie de página v3.2.29', idx.includes('CORPAC AIS/ARO Platform v3.2.29'));
chk('cola main.js dentro del asar (_gmailApiCadena)', asar.extractFile('dist/win-unpacked/resources/app.asar','src/main.js').toString('utf8').includes('_gmailApiCadena'));
process.exit(ok?0:1);
"

echo "== 3) SHA256 =="
{
  echo "PDFPro Suite 3.2.29 — SHA256 (generado $(date -u +%Y-%m-%dT%H:%M:%SZ))"
  echo
  (cd dist && sha256sum PDFPro-Setup-3.2.29.exe PDFPro-Portable-3.2.29.exe)
} > download/PDFPro-3.2.29-SHA256.txt
cat download/PDFPro-3.2.29-SHA256.txt

echo "== 4) copias fijas en download/ =="
cp dist/PDFPro-Setup-3.2.29.exe dist/PDFPro-Setup-3.2.29.exe.blockmap \
   dist/PDFPro-Portable-3.2.29.exe download/
cp dist/latest.yml download/latest-v3.2.29.yml
echo "latest.yml del build:"; cat dist/latest.yml
echo "== POST-BUILD v3.2.29 COMPLETO =="
