#!/bin/bash
# Extrae los b64 del navegador a archivos binarios
set -e
OUT=/home/z/my-project/scripts/e2e
extract() {  # $1=var $2=destino
  local VAR="$1" DST="$2" TOTAL
  TOTAL=$(agent-browser eval "window.$VAR.length" | tr -d '"')
  > "$DST.b64"
  local i START CHUNK
  for i in $(seq 0 100); do
    START=$((i*20000))
    if [ "$START" -ge "$TOTAL" ]; then break; fi
    CHUNK=$(agent-browser eval "window.$VAR.slice($START,$((START+20000)))" 2>/dev/null | tr -d '"')
    printf '%s' "$CHUNK" >> "$DST.b64"
  done
  base64 -d "$DST.b64" > "$DST"
  echo "$DST: $(stat -c%s "$DST") bytes"
}
extract _pdfB64 "$OUT/prueba_pdf.bin"
extract _xlsB64 "$OUT/prueba_xls.bin"
