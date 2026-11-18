#!/bin/bash
# E2E v2.9.8 — flujo completo: Word (sellos → guardar .docx + PDF) y Excel (sellos → guardar .xlsx)
set -u
cd /home/z/my-project/scripts/e2e298
AB="agent-browser --cdp 9222"
LOG=/home/z/my-project/scripts/e2e298/electron.log

# ── 0) Xvfb + Electron con CDP ──
pkill -f "remote-debugging-port=9222" 2>/dev/null
pkill -f "pdfpro-desktop/node_modules/electron" 2>/dev/null
for i in $(seq 1 15); do
  pgrep -f "remote-debugging-port=9222" >/dev/null || break
  sleep 1
done
sleep 2
if ! pgrep -x Xvfb >/dev/null; then
  nohup Xvfb :99 -screen 0 1600x1000x24 >/dev/null 2>&1 &
  sleep 2
fi
cd /home/z/my-project/pdfpro-desktop
DISPLAY=:99 nohup npx electron . --remote-debugging-port=9222 >"$LOG" 2>&1 &
cd /home/z/my-project/scripts/e2e298

echo "== esperando CDP =="
for i in $(seq 1 40); do
  R=$($AB eval "document.title" 2>/dev/null) && [ -n "$R" ] && break
  sleep 1
done
echo "title=$R"
[ -z "${R:-}" ] && { echo "FALLO: app no arrancó"; exit 1; }

# ── 1) sesión + abrir docx ──
echo "== seed sesión =="
$AB eval "$(cat p1_seed.js)"
$AB eval "location.reload()"
sleep 6
$AB eval "JSON.stringify({user:(window.currentUser||{}).login||null, editor:(document.getElementById('editorLayer')||{}).style.display})"

echo "== inyecta docx b64 (3 chunks) =="
TOTAL=$(wc -c < FPL-prueba.docx.b64)
for i in 0 1 2; do
  START=$((i*20000)); [ $START -ge $TOTAL ] && break
  CHUNK=$(dd if=FPL-prueba.docx.b64 bs=1 skip=$START count=20000 2>/dev/null)
  $AB eval "window.__d64=(window.__d64||'')+'$CHUNK'" >/dev/null
done
$AB eval "window.__d64.length"

echo "== abre docx =="
$AB eval "$(cat p2_open.js)"

# ── 2) colocar sellos ──
echo "== sello b64 =="
SEAL=$(cat seal.b64)
$AB eval "window._sealB64='$SEAL'" >/dev/null
echo "== coloca sellos =="
$AB eval "$(cat p3_place.js)"

# ── 3) guardar docx + pdf ──
echo "== guarda docx + exporta pdf =="
$AB eval "$(cat p4_save.js)"

# ── 4) flujo Excel ──
echo "== inyecta xlsx b64 (3 chunks) =="
TOTAL2=$(wc -c < orig.xlsx.b64)
for i in 0 1 2; do
  START=$((i*20000)); [ $START -ge $TOTAL2 ] && break
  CHUNK=$(dd if=orig.xlsx.b64 bs=1 skip=$START count=20000 2>/dev/null)
  $AB eval "window.__x64=(window.__x64||'')+'$CHUNK'" >/dev/null
done
$AB eval "window.__x64.length"
echo "== flujo excel =="
$AB eval "$(cat p5_excel.js)"

# ── 5) extraer binarios ──
echo "== extrae binarios =="
extract() {
  local VAR="$1" DST="$2" T I S C
  T=$($AB eval "window.$VAR.length" | tr -d '"')
  > "$DST.b64"
  for I in $(seq 0 60); do
    S=$((I*20000)); [ $S -ge "$T" ] && break
    C=$($AB eval "window.$VAR.slice($S,$((S+20000)))" 2>/dev/null | tr -d '"')
    printf '%s' "$C" >> "$DST.b64"
  done
  base64 -d "$DST.b64" > "$DST" && echo "$DST: $(stat -c%s "$DST") bytes (b64 $T)"
}
extract _docxB64 out-word.docx
extract _pdfB64  out-word.pdf
extract _xlsB64  out-excel.xlsx

echo "== listo =="

pkill -f "remote-debugging-port=9222" 2>/dev/null
echo "== electron cerrado =="
