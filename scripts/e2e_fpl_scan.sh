#!/bin/bash
# ═══ E2E v2.9.15 — ESCANEO FPL AUTOMÁTICO AL CARGAR ═══
# Verifica en el navegador (mismo flujo que el usuario):
#   1) FPL télex (callsign FAP211 en campo 7 + REG/OB1630 en el 18)
#        → «Matrícula» = OB1630 (prioridad REG/) + «Iniciales» = EV (auto)
#   2) FPL formulario (casillero 7 con OB-2147) → OB2147
#   3) Oficio sin matrícula → el campo se LIMPIA (v2.9.17: no arrastra el FPL anterior)
#   4) Sincronía con el panel móvil + persistencia sessionStorage
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
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
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

step "1. Abrir app + sesión de prueba (E2E Verificador → iniciales EV)"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "typeof FPLScan!=='undefined' ? 'FPLScan cargado: '+typeof FPLScan.extraerMatricula : 'FALLO: sin FPLScan'"

step "2. Iniciales del operador auto-rellenas al entrar (EV)"
EV "document.getElementById('selloTxInitials').value || '(vacío)'"

step "3. Cargar FPL télex (FAP211 + REG/OB1630) → espera OB1630"
CARGAR tmp_e2e_fpl_telex.pdf
CAMPO OB1630 || exit 1

step "4. Campos tras el escaneo"
EV "(function(){return JSON.stringify({matricula:document.getElementById('selloMatricula').value,iniciales:document.getElementById('selloTxInitials').value,movil:(document.getElementById('mobSelloMatricula')||{}).value,persistido:sessionStorage.getItem('fpl_matricula'),toast:document.body.innerText.indexOf('Matrícula detectada')>=0});})()"

step "5. Cargar FPL formulario (casillero 7: OB-2147) → espera OB2147"
CARGAR tmp_e2e_fpl_form.pdf
CAMPO OB2147 || exit 1

step "6. Cargar oficio SIN matrícula → el campo se limpia (v2.9.17)"
sleep 3
CARGAR tmp_e2e_oficio.pdf
sleep 6
EV "document.getElementById('selloMatricula').value==='' ? '✓ no-FPL → campo limpio (v2.9.17)' : '✗ quedó: '+document.getElementById('selloMatricula').value"

step "7. Nombre de archivo compuesto (MATRÍCULA INICIALES)"
EV "(function(){var m=document.getElementById('selloMatricula');m.value='OB2147';m.dispatchEvent(new Event('input'));return fplNombreRegistro('documento_exportado.pdf');})()"
