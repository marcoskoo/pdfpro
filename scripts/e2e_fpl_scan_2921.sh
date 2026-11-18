#!/bin/bash
# ═══ E2E v2.9.21 — ORDEN OACI: CASILLERO 7 PRIMERO ═══
# Verifica en el navegador (mismo flujo que el usuario) la corrección del
# caso «FlightPlan SPHI-SPST.pdf»:
#   1) Formulario GA réplica del real (OB1630 en las casillas del casillero 7,
#      SIN REG/ en el 18, etiqueta «Flight Rules» presente) → «Matrícula» =
#      OB1630 — ANTES salía «FLIGHT»/«FLIGT» (la etiqueta se colaba).
#   2) Aerolínea estilo CM468 (casillero 7 = CMP468 en casillas revueltas +
#      REG/HP1520) → HP1520 (REG/ de respaldo, vuelo CMP468).
#   3) Regresiones: télex FAP211+REG/OB1630 → OB1630; formulario etiqueta
#      OB-2147 → OB2147; oficio → campo limpio.
#   4) Pie de página con v2.9.21.
set -u
APP="http://localhost:3000/pdfpro/index.html"

step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 12); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -3; return 0; fi
    sleep 2
  done
  echo "$out" | head -3
}
READY(){
  local out i
  for i in $(seq 1 30); do
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined'&&typeof FPLScan!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "ready" ] && { sleep 2; echo "[listo tras $i sondeos]"; return 0; }
    sleep 2
  done
  echo "[TIMEOUT: $out]"; return 1
}
CAMPO(){ # espera a que selloMatricula valga $1 (máx 25 s)
  local out i
  for i in $(seq 1 25); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$1" ] && { echo "  ✓ campo=$out (tras ${i} sondeos)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: campo='$out' (esperaba '$1')"; return 1
}
CARGAR(){ # carga un PDF servido por el dev server en el input de archivos
  agent-browser eval "(async function(){ var r=await fetch('/$1'); var ab=await r.arrayBuffer(); var f=new File([ab],'$1',{type:'application/pdf'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'cargando $1'; })()" >/dev/null 2>&1
}
LIMPIAR(){ # cierra las pestañas abiertas para que cada caso parta de cero
  agent-browser eval "(function(){ try{ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); }catch(e){} return 'limpio'; })()" >/dev/null 2>&1
}

step "1. Abrir app + sesión de prueba (E2E Verificador → iniciales EV)"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "typeof FPLScan.extraerFPL==='function' ? 'FPLScan v2.9.21 con extraerFPL' : 'FALLO: sin extraerFPL'"

step "2. Versión v2.9.21 (pie de la pantalla de acceso)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.21')>=0)?'v2.9.21 ✓':'FALLO: sin v2.9.21'"

step "3. ★ CASO DEL USUARIO: FlightPlan SPHI-SPST (OB1630 en casillero 7, sin REG/)"
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO OB1630 || exit 1
EV "(function(){var t=document.body.innerText;return JSON.stringify({matricula:document.getElementById('selloMatricula').value,iniciales:document.getElementById('selloTxInitials').value,toast7:t.indexOf('casillero 7')>=0,voladoFLIGHT:t.indexOf('FLIGHT')>=0||t.indexOf('FLIGT')>=0});})()"

step "4. Aerolínea estilo CM468 (casillero 7 = CMP468 + REG/HP1520) → HP1520"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_form_casillas.pdf
CAMPO HP1520 || exit 1
EV "(function(){return JSON.stringify({matricula:document.getElementById('selloMatricula').value,toastREG:document.body.innerText.indexOf('casillero 18 (REG/) · vuelo CMP468')>=0});})()"

step "5. Regresión: télex FAP211 + REG/OB1630 → OB1630 (casillero 18 de respaldo)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_telex.pdf
CAMPO OB1630 || exit 1

step "6. Regresión: formulario con etiqueta (OB-2147) → OB2147"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_form.pdf
CAMPO OB2147 || exit 1

step "7. Regresión: oficio SIN matrícula → campo limpio (v2.9.17)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_oficio.pdf
sleep 6
EV "document.getElementById('selloMatricula').value==='' ? '✓ no-FPL → campo limpio' : '✗ quedó: '+document.getElementById('selloMatricula').value"

step "8. Nombre de archivo compuesto (MATRÍCULA INICIALES)"
EV "(function(){var m=document.getElementById('selloMatricula');m.value='OB1630';m.dispatchEvent(new Event('input'));return fplNombreRegistro('documento_exportado.pdf');})()"
