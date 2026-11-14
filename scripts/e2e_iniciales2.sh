#!/bin/bash
# ═══ E2E v2.9.16 — INICIALES DEL OPERADOR DE 2 LETRAS ═══
# Verifica en el navegador:
#   A) FPLScan.inicialesDe: primer nombre + apellido paterno (MK/AT/JR/EV/C)
#   B) fplInicialesOperador: campo ≤2 letras y fallback con la nueva regla
#   C) Campos limitados a 2 letras (escritorio + móvil) y saneo sin puntos
#   D) fplAutoIniciales llena el campo solo; nombre final MATRÍCULA INICIALES
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

step "1. Abrir app + sesión (E2E Verificador)"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1

step "A. FPLScan.inicialesDe — 2 letras (primer nombre + apellido paterno)"
EV "JSON.stringify({mk:FPLScan.inicialesDe('Marcos Koo'),at:FPLScan.inicialesDe('Ana María Torres Vega'),jr:FPLScan.inicialesDe('José Ramírez Díaz'),at2:FPLScan.inicialesDe('Ana Torres'),ev:FPLScan.inicialesDe('E2E Verificador'),una:FPLScan.inicialesDe('Cher'),vacio:FPLScan.inicialesDe(''),min:FPLScan.inicialesDe('marcos koo')})"

step "B. fplInicialesOperador — campo vacío → 2 letras del usuario"
EV "(function(){ var el=document.getElementById('selloTxInitials'); var fuera; el.value=''; fuera=fplInicialesOperador(); return JSON.stringify({campoVacio:fuera,autoEnCampo:el.value,conCampo:(el.value='ABCD',fplInicialesOperador())}); })()"

step "C. Campos limitados a 2 letras + saneo sin puntos ni espacios"
EV "(function(){ var d=document.getElementById('selloTxInitials'),m=document.getElementById('mobSelloTxInitials'); d.value='A.B'; d.dispatchEvent(new Event('input')); var saneado=d.value; d.value='MK'; d.dispatchEvent(new Event('input')); return JSON.stringify({maxEscritorio:d.maxLength,maxMovil:m.maxLength,saneoA_B:saneado}); })()"

step "D. Nombre compuesto → auto-iniciales + nombre final de archivo"
EV "(function(){ window.currentUser={id:'e2e',name:'Ana María Torres Vega'}; var el=document.getElementById('selloTxInitials'); el.value=''; fplAutoIniciales(); var ini=el.value; var m=document.getElementById('selloMatricula'); m.value='OB2147'; m.dispatchEvent(new Event('input')); var nombre=fplNombreRegistro('documento.pdf'); window.currentUser={id:'e2e',name:'E2E Verificador'}; el.value=''; fplAutoIniciales(); return JSON.stringify({inicialesCompuestas:ini,nombreFinal:nombre,restaurado:el.value}); })()"
