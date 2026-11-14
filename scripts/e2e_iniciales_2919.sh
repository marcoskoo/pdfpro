#!/bin/bash
# E2E v2.9.19 — iniciales del operador con los 5 EJEMPLOS EXACTOS del usuario
# Convención: 4 palabras = nombre1 + nombre2 + APELLIDO PATERNO + materno
# Requiere: dev server en localhost:3000 y agent-browser instalado
APP="http://localhost:3000/pdfpro/index.html"
declare -a CASOS=(
  "Marcos Roberto Koo Paz|MK"
  "Frank Dave Asian Castro|FA"
  "Ruswel Melciades Cacho Paredes|RC"
  "Jacqueline Cristina Vílchez Aguirre|JV"
  "Francessca Michelle Chumpitaz Court|FC"
)
echo "════ E2E v2.9.19 — iniciales con los 5 ejemplos del usuario ════"
FALLA=0; N=0
for caso in "${CASOS[@]}"; do
  nombre="${caso%|*}"; espe="${caso#*|}"; N=$((N+1))
  agent-browser open "$APP" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  agent-browser eval "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2ei$N',login:'e2ei$N',email:'e2ei$N@corpac.gob.pe',name:'$nombre',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion'" >/dev/null 2>&1
  agent-browser open "$APP" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 3
  campo=$(agent-browser eval "document.getElementById('selloTxInitials').value" 2>/dev/null | tr -d '"')
  movil=$(agent-browser eval "(document.getElementById('mobSelloTxInitials')||{value:''}).value" 2>/dev/null | tr -d '"')
  if [ "$campo" = "$espe" ] && [ "$movil" = "$espe" ]; then
    echo "  ✓ $nombre → $campo (campo + móvil)"
  else
    echo "  ✗ $nombre → campo='$campo' móvil='$movil' (esperado $espe)"; FALLA=$((FALLA+1))
  fi
done
if [ "$FALLA" = "0" ]; then echo "E2E INICIALES v2.9.19: TODO OK ✓"; else echo "FALLOS: $FALLA"; exit 1; fi
