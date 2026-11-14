#!/bin/bash
# ═══ E2E v2.9.17 — CORRECCIONES: matrícula en Excel + reset por archivo + cambio de usuario ═══
# Reproduce el caso real del usuario con SUS archivos (ATC CM468 11NOV):
#   1. Iniciales auto al entrar (E2E Verificador → EV)
#   2. XLSX real de la aerolínea  → matrícula HP1520 (REG/ del casillero 18)
#   3. PDF real de la aerolínea   → matrícula HP1520
#   4. Oficio (no es FPL)         → el campo se LIMPIA (antes arrastraba HP1520)
#   5. FPL sin matrícula          → campo limpio + aviso «FPL sin matrícula»
#   6. Cambio de usuario          → iniciales cambian YA (AT) + matrícula limpia
#   7. Recarga con el MISMO usuario → la matrícula restaurada se conserva
set -u
APP="http://localhost:3000/pdfpro/index.html"

step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 15); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -3; return 0; fi
    sleep 2
  done
  echo "$out" | head -3
}
# espera a que la matrícula del campo sea el valor esperado (escaneo asíncrono)
ESPERA(){
  local esperado="$1" label="$2" out i
  for i in $(seq 1 15); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$esperado" ] && { echo "  ✓ $label = $out (sondeo $i)"; return 0; }
    sleep 2
  done
  echo "  ✗ $label: esperaba '$esperado', tengo '$out'"; return 1
}
READY(){
  local out i
  for i in $(seq 1 30); do
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "ready" ] && { sleep 2; return 0; }
    sleep 2
  done
  echo "[TIMEOUT]"; return 1
}
# envía un archivo servido por el dev server a través del input real de la app
CARGAR(){
  local url="$1" nombre="$2" tipo="$3"
  agent-browser eval "(async function(){
    var r=await fetch('$url');var b=await r.arrayBuffer();
    var f=new File([b],'$nombre',{type:'$tipo'});
    var dt=new DataTransfer();dt.items.add(f);
    var inp=document.getElementById('fInput');inp.files=dt.files;
    inp.dispatchEvent(new Event('change',{bubbles:true}));
    return 'enviado $nombre ('+f.size+' B)';
  })()" 2>&1 | head -1
}

step "1. Sesión E2E Verificador → iniciales EV"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "JSON.stringify({iniciales:document.getElementById('selloTxInitials').value,matricula:document.getElementById('selloMatricula').value})"

step "2. XLSX real de la aerolínea (ATC CM468) → HP1520"
CARGAR "/tmp_e2e_atc.xlsx" "ATC CM468 11NOV.xlsx" "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
sleep 6
ESPERA "HP1520" "matrícula del Excel real"
EV "JSON.stringify({iniciales:document.getElementById('selloTxInitials').value,movil:document.getElementById('mobSelloMatricula').value,persistido:sessionStorage.getItem('fpl_matricula')})"

step "3. PDF real de la aerolínea (ATC CM468) → HP1520"
CARGAR "/tmp_e2e_atc.pdf" "ATC CM468 11NOV.pdf" "application/pdf"
sleep 5
ESPERA "HP1520" "matrícula del PDF real"

step "4. Oficio (no es FPL) → la matrícula anterior NO se arrastra"
CARGAR "/tmp_e2e_oficio.pdf" "oficio.pdf" "application/pdf"
sleep 4
ESPERA "" "campo limpio tras el oficio"

step "5. FPL sin matrícula reconocible → aviso y campo vacío"
CARGAR "/tmp_e2e_fpl_sin_matricula.pdf" "fpl_sin_matricula.pdf" "application/pdf"
sleep 4
EV "JSON.stringify({matricula:document.getElementById('selloMatricula').value,aviso:(document.body.innerText.match(/FPL sin matrícula reconocida/)||['NO'])[0]})"

step "6. Cambio de usuario → iniciales nuevas INMEDIATAS + matrícula limpia"
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e2',login:'e2e2',email:'e2e2@corpac.gob.pe',name:'Ana María Torres Vega',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'nueva sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "JSON.stringify({iniciales:document.getElementById('selloTxInitials').value,movil:document.getElementById('mobSelloTxInitials').value,matricula:document.getElementById('selloMatricula').value,nombre:fplNombreRegistro('documento.pdf')})"

step "7. Recarga con el MISMO usuario → la matrícula escrita se conserva"
EV "(function(){var m=document.getElementById('selloMatricula');m.value='OB2147';m.dispatchEvent(new Event('input'));return 'matricula manual: '+m.value;})()"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "JSON.stringify({iniciales:document.getElementById('selloTxInitials').value,matricula:document.getElementById('selloMatricula').value})"
