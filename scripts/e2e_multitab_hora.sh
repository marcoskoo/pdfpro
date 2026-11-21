#!/bin/bash
# ═══ E2E v3.2.29 — HORA DE RECEPCIÓN CON VARIAS PESTAÑAS (reproducción real) ═══
# Reproduce el reporte del usuario contra la app REAL (web/index.html = src/app/index.html):
#   A) cargar de UNO EN UNO sin cerrar el anterior → cada pestaña completa SU hora
#   C) carga MÚLTIPLE (varios archivos en una tanda) → cada pestaña su hora
#   D) alternar pestañas → cada una muestra/restaura su propia hora
#   B) correos que LLEGAN TARDE → la re-búsqueda POR PESTAÑA completa cada hora
# Puente de escritorio simulado: OAuth DESCONECTADO (los fallos de API caen a la
# vía asistida, como en el flujo real del usuario). Los reintentos de 60 s se
# acortan a 8 s SOLO en el entorno de prueba (wrapper de setTimeout).
set -u
APP="http://localhost:3000/pdfpro/index.html"
FAILS=0
step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 12); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -4; return 0; fi
    sleep 2
  done
  echo "$out" | head -4
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
CARGAR(){ # carga PDF(s) servido(s) por el dev server vía el input real (change)
  agent-browser eval "(async function(){ var names=('$1').split(','); var files=[]; for(var i=0;i<names.length;i++){ var r=await fetch('/'+names[i]+'.pdf'); var ab=await r.arrayBuffer(); files.push(new File([ab],names[i]+'.pdf',{type:'application/pdf'})); } var dt=new DataTransfer(); files.forEach(function(f){dt.items.add(f);}); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'cargando: '+names.join(', '); })()" >/dev/null 2>&1
}
HORA(){ # espera a que selloRxTime valga $1 (máx $2 s)
  local want=$1 max=${2:-25} i out
  for i in $(seq 1 $max); do
    out=$(agent-browser eval "document.getElementById('selloRxTime').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$want" ] && { echo "  ✓ hora del campo = $out (tras ${i} s)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: hora del campo = '$out' (esperaba '$want')"
  agent-browser eval "window.__dump()" | head -2
  return 1
}
HORA_TAB(){ # espera a que la pestaña de $1 tenga selloHora=$2 (máx $3 s)
  local name=$1 want=$2 max=${3:-25} i out
  for i in $(seq 1 $max); do
    out=$(agent-browser eval "(function(){var t=docTabs.filter(function(x){return x.fileName==='$name'})[0];return t?(t.selloHora||''):'NO_TAB'})()" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$want" ] && { echo "  ✓ pestaña $name → hora $out (tras ${i} s)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: pestaña $name → '$out' (esperaba '$want')"
  agent-browser eval "window.__dump()" | head -2
  return 1
}

# ── servidor de pruebas ──
if ! curl -s -o /dev/null http://localhost:3000/pdfpro/index.html; then
  (cd /tmp/www && nohup python3 -m http.server 3000 >/tmp/www/server.log 2>&1 &)
  sleep 1
  curl -s -o /dev/null http://localhost:3000/pdfpro/index.html || { echo "✗ no pude levantar :3000"; exit 1; }
fi
echo "servidor OK"

step "1. App + sesión de prueba"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1

step "2. Puente de escritorio simulado (sin OAuth · vía asistida · reintentos 60s→8s)"
EV "(async function(){ var r=await fetch('/mock_bridge_multitab.js'); (0,eval)(await r.text()); return 'puente simulado: '+(_gmailHoraOk?'servicio asistido OK':'SIN servicio asistido'); })()"

step "3. ESCENARIO A — de uno en uno, correos ya llegados"
CARGAR fpl_a1
HORA 1000 25 || FAILS=$((FAILS+1))
CARGAR fpl_a2
HORA 1100 25 || FAILS=$((FAILS+1))
CARGAR fpl_a3
HORA 1230 25 || FAILS=$((FAILS+1))
EV "window.__dump()"
echo "── cada pestaña con SU hora ──"
HORA_TAB fpl_a1 1000 5 || FAILS=$((FAILS+1))
HORA_TAB fpl_a2 1100 5 || FAILS=$((FAILS+1))
HORA_TAB fpl_a3 1230 5 || FAILS=$((FAILS+1))

step "4. ESCENARIO C — carga múltiple (a4+a5 en una tanda)"
CARGAR "fpl_a4,fpl_a5"
sleep 2
HORA_TAB fpl_a4 1315 30 || FAILS=$((FAILS+1))
HORA_TAB fpl_a5 1445 30 || FAILS=$((FAILS+1))

step "5. ESCENARIO D — alternar pestañas: cada una muestra SU hora"
EV "(function(){var t=docTabs.filter(function(x){return x.fileName==='fpl_a1'})[0];docTabSwitch(t.id);return 'activa: '+t.fileName+' → campo '+document.getElementById('selloRxTime').value;})()" | grep -q "campo 1000" && echo "  ✓ a1 muestra 1000" || { echo "  ✗ a1 no muestra su hora"; EV "window.__dump()"; FAILS=$((FAILS+1)); }
EV "(function(){var t=docTabs.filter(function(x){return x.fileName==='fpl_a4'})[0];docTabSwitch(t.id);return 'activa: '+t.fileName+' → campo '+document.getElementById('selloRxTime').value;})()" | grep -q "campo 1315" && echo "  ✓ a4 muestra 1315" || { echo "  ✗ a4 no muestra su hora"; EV "window.__dump()"; FAILS=$((FAILS+1)); }

step "6. ESCENARIO B — correos que llegan tarde (re-búsqueda POR pestaña)"
EV "window.__gmailFails=2; 'cada correo falla 2 veces y luego llega'"
CARGAR fpl_b1; sleep 2
CARGAR fpl_b2; sleep 2
CARGAR fpl_b3; sleep 3
echo "── tras las búsquedas iniciales fallidas: 3 cadenas vivas ──"
EV "Object.keys(_gmailReintentoTabs).length" | grep -q "3" && echo "  ✓ 3 cadenas de re-búsqueda coexisten" || { echo "  ✗ cadenas: $(EV "Object.keys(_gmailReintentoTabs).length")"; FAILS=$((FAILS+1)); }
echo "── las horas llegan solas (reintentos a 8 s) ──"
HORA_TAB fpl_b1 1500 60 || FAILS=$((FAILS+1))
HORA_TAB fpl_b2 1600 60 || FAILS=$((FAILS+1))
HORA_TAB fpl_b3 1730 60 || FAILS=$((FAILS+1))
EV "window.__dump()"

step "FIN PARTE 1 — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -viE "get_all_users|UNAUTHORIZED|invalid input syntax|CDP|Target|favicon" | head -5
echo "(vacío = sin errores)"

# ═════════ PARTE 2 — OAuth CONECTADO (la API responde) ═════════
step "7. Recarga + puente con OAuth conectado"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "window.__gmailOauth=true; 'oauth on'"
EV "(async function(){ var r=await fetch('/mock_bridge_multitab.js'); (0,eval)(await r.text()); return 'puente OAuth: '+(_gmailHoraOk?'servicio asistido OK':'SIN servicio asistido'); })()"
EV "window.__gmailEstado===undefined?'estado limpio':'estado previo'"

step "8. ESCENARIO A' — OAuth: de uno en uno, correos ya llegados (API lenta 2.5 s)"
CARGAR fpl_c1
HORA 1800 30 || FAILS=$((FAILS+1))
CARGAR fpl_c2
HORA 1900 30 || FAILS=$((FAILS+1))
CARGAR fpl_c3
HORA 2000 30 || FAILS=$((FAILS+1))
HORA_TAB fpl_c1 1800 5 || FAILS=$((FAILS+1))
HORA_TAB fpl_c2 1900 5 || FAILS=$((FAILS+1))
HORA_TAB fpl_c3 2000 5 || FAILS=$((FAILS+1))
EV "window.__dump()"

step "9. ESCENARIO C' — OAuth: carga múltiple (c4+c5)"
CARGAR "fpl_c4,fpl_c5"
sleep 2
HORA_TAB fpl_c4 2100 35 || FAILS=$((FAILS+1))
HORA_TAB fpl_c5 2200 35 || FAILS=$((FAILS+1))
EV "window.__dump()"

step "10. ESCENARIO B' — OAuth: ráfaga 429 (cuota) y recuperación por re-búsqueda"
EV "window.__gmail429Left=9; 'las primeras 9 llamadas API fallan con 429'"
CARGAR "fpl_b1,fpl_b2,fpl_b3"
sleep 3
echo "── inicial: sin horas (429), cadenas vivas ──"
EV "window.__dump()"
echo "── v3.2.30: un 429 NO dispara las consultas de respaldo (antes: 2 barrer extra por fallo) ──"
BARRER_TRAS_429=$(EV "(function(){var l=window.__gmailLog||[],c=0;for(var i=0;i<l.length;i++){if(l[i][0]==='barrer')c++;}return c;})()")
echo "  llamadas 'barrer' de respaldo durante la ráfaga 429: $BARRER_TRAS_429 (esperadas: 0)"
[ "$BARRER_TRAS_429" = "0" ] && echo "  ✓ la cuota no se amplifica" || { echo "  ✗ los respaldos siguen quemando cuota"; FAILS=$((FAILS+1)); }
HORA_TAB fpl_b1 1500 90 || FAILS=$((FAILS+1))
HORA_TAB fpl_b2 1600 90 || FAILS=$((FAILS+1))
HORA_TAB fpl_b3 1730 90 || FAILS=$((FAILS+1))
EV "window.__dump()"

step "FIN — errores de consola (parte 2)"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -viE "get_all_users|UNAUTHORIZED|invalid input syntax|CDP|Target|favicon" | head -5
echo "(vacío = sin errores)"
echo ""
echo "══════════ RESUMEN: $FAILS fallo(s) ══════════"
exit $FAILS
