# Genera scripts/test_gmail_hora_3226.js a partir del de v3.2.25:
# v3.2.26 — TODAS LAS PESTAÑAS BUSCAN SU HORA. «Solo actualizó la hora
# en dos pestañas de las 04 que cargué»: gmailHoraAuto tenía UN
# temporizador global con clearTimeout — cargar otro archivo cancelaba
# la búsqueda pendiente del anterior. (1) temporizadores POR PESTAÑA;
# (2) gmailHoraArchivo acepta la pestaña explícita (búsqueda en 2.º
# plano; el guard del campo solo vale para la pestaña visible);
# (3) reintento captura SU pestaña; (4) gmailAplicarHitApi consciente
# de la pestaña; (5) bandera _gmailHoraManual blindando la hora
# escrita a mano.
# Transforma ~16 anclas heredadas (firma con tabForzado, llamadas con
# (_tab), guards con _esActiva, ventanas ampliadas) + 8 nuevas.
# 409 + 8 = 417.
import sys

src = open('scripts/test_gmail_hora_3225.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces, esperaba {n}): {old[:80]!r}')
    out = out.replace(old, new)

# 1) cabecera
i = out.index('/* Pruebas v3.2.25')
j = out.index('*/', i) + 2
out = out[:i] + """/* Pruebas v3.2.26 — TODAS LAS PESTAÑAS BUSCAN SU HORA. Reporte del
   usuario: «solo actualizó la hora de recepción en dos pestañas/archivos
   de las 04 que cargué». Causa en el código real: gmailHoraAuto tenía UN
   solo temporizador global con clearTimeout — cargar otro archivo
   CANCELABA la búsqueda pendiente del anterior (solo el último archivo
   era buscado; y otro, si se visitaba, porque cambiar de pestaña
   re-dispara); además gmailAplicarHitApi miraba el campo del formulario,
   que en una búsqueda de pestaña en segundo plano muestra la hora de
   OTRA pestaña. (1) gmailHoraAuto agenda POR PESTAÑA; (2) gmailHoraArchivo
   acepta tabForzado y busca aunque no esté activa (guard del campo solo
   para la VISIBLE); (3) el reintento captura y rebusca SU pestaña;
   (4) gmailAplicarHitApi consciente de la pestaña; (5) bandera
   _gmailHoraManual: la hora escrita a mano jamás se borra. Incluye la
   regresión completa v3.2.25 (409 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3226.js */""" + out[j:]

# 2) banner
rep(r"""T('banner v3.2.25', /CORPAC AIS\/ARO Platform v3\.2\.25/.test(html), true);""",
    r"""T('banner v3.2.26', /CORPAC AIS\/ARO Platform v3\.2\.26/.test(html), true);""")

# 3) anclas heredadas rotas por v3.2.26
rep(r"""T('gmailHoraArchivo acepta manual y reintento; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual,reintento\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);""",
    r"""T('gmailHoraArchivo acepta manual/reintento/tabForzado; el enganche automático llama con SU pestaña', /async function gmailHoraArchivo\(manual,reintento,tabForzado\)\{/.test(html) && /setTimeout\(function\(\)\{[\s\S]{0,260}gmailHoraArchivo\(false,false,tb\);/.test(html), true);""")

rep(r"""gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📭""",
    r"""gmailHoraReintentoAgendar\(_tab\);if\(!reintento\)toast\('📭""")

rep(r"""gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📧""",
    r"""gmailHoraReintentoAgendar\(_tab\);if\(!reintento\)toast\('📧""")

rep(r"""gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual,reintento\)/.test(html)""",
    r"""gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual,reintento,tabForzado\)/.test(html)""")

rep(r"""T('gmailHoraAuto ya NO exige escritorio (la web también busca al cargar)', /function gmailHoraAuto\(\)\{\s*\n\s*if\(_gmailHoraT\)clearTimeout/.test(html), true);""",
    r"""T('gmailHoraAuto ya NO exige escritorio (la web también busca al cargar)', /function gmailHoraAuto\(tab\)\{\s*\n\s*\/\* v3\.2\.26[\s\S]{0,700}if\(_gmailHoraTTabs\[tid\]\)clearTimeout\(_gmailHoraTTabs\[tid\]\);/.test(html), true);""")

rep(r"""}gmailHoraReintentoAgendar\(\);[\s\S]{0,500}gmailLoginBtnMostrar\(\);""",
    r"""}gmailHoraReintentoAgendar\(_tab\);[\s\S]{0,500}gmailLoginBtnMostrar\(\);""")

rep(r"""gmailHoraReintentoAgendar\(\);\s*\n\s*var _tok=null""",
    r"""gmailHoraReintentoAgendar\(_tab\);\s*\n\s*var _tok=null""")

rep(r"""cada búsqueda NUEVA renueva el presupuesto; las rondas de re-búsqueda no', /async function gmailHoraArchivo\(manual,reintento\)\{""",
    r"""cada búsqueda NUEVA renueva el presupuesto; las rondas de re-búsqueda no', /async function gmailHoraArchivo\(manual,reintento,tabForzado\)\{""")

rep(r"""s.includes('gmailHoraArchivo(false,true)')""",
    r"""s.includes('gmailHoraArchivo(false,true,_tab)')""")

rep(r"""gmailHoraReintentoAgendar();if(!reintento)toast('📧""",
    r"""gmailHoraReintentoAgendar(_tab);if(!reintento)toast('📧""")

rep(r"""gmailHoraReintentoAgendar\(\);[\s\S]{0,300}return;""",
    r"""gmailHoraReintentoAgendar\(_tab\);[\s\S]{0,300}return;""")

rep(r"""gmailHoraReintentoAgendar\(\);[\s\S]{0,200}Todavía no llega el correo""",
    r"""gmailHoraReintentoAgendar\(_tab\);[\s\S]{0,200}Todavía no llega el correo""")

rep(r"""html.includes("if(t&&t.value&&!(_tab.selloHoraArchivo&&_tab.selloHoraArchivo!==nombre))return;")""",
    r"""html.includes("if(_esAct&&t&&t.value&&!(_tab.selloHoraArchivo&&_tab.selloHoraArchivo!==nombre))return;")""")

rep(r"""if\(_horaDeEste\)\{gmailLoginBtnOcultar\(\);return;\}""",
    r"""if\(_horaDeEste\|\|_gmailHoraManual\)\{gmailLoginBtnOcultar\(\);return;\}""")

# 3b) la declaración de globales se extiende en v3.2.26 (timers por pestaña,
#     pestaña del reintento, bandera manual): anclar la nueva completa
rep("html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false,_gmailLoginCancelToast=false;')",
    "html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false,_gmailLoginCancelToast=false,_gmailHoraTTabs=null,_gmailReintentoTab=null,_gmailHoraManual=false;')")

# 4) ventanas: el bloque nuevo (firma+tabForzado+_esActiva+guard) desplaza
#    a los manejadores ~+900 chars
rep("html.slice(i, i + 7300)", "html.slice(i, i + 8200)")
rep("html.slice(i, i + 3500)", "html.slice(i, i + 4200)", 2)

# 5) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.26 — todas las pestañas buscan su hora ════ */
  console.log('── v3.2.26: cada pestaña agenda SU búsqueda; N archivos → N horas ──');
  T('html: gmailHoraAuto agenda POR PESTAÑA (cargar otro archivo NO cancela la búsqueda del anterior)',
    /function gmailHoraAuto\(tab\)\{[\s\S]{0,900}if\(_gmailHoraTTabs\[tid\]\)clearTimeout\(_gmailHoraTTabs\[tid\]\);[\s\S]{0,400}_gmailHoraTTabs\[tid\]=setTimeout\(function\(\)\{[\s\S]{0,200}gmailHoraArchivo\(false,false,tb\);/.test(html), true);
  T('html: el temporizador global único (el que cancelaba a los demás) YA NO existe',
    !/_gmailHoraT=setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);
  T('html: gmailHoraArchivo busca la pestaña FORZADA aunque ya no sea la activa (su hora es suya)',
    html.includes('if(tabForzado)_tab=tabForzado;') && html.includes('else{try{_tab=docTabGet(activeTabId);}catch(e){}}'), true);
  T('html: el guard del campo solo se aplica a la pestaña VISIBLE; la de 2.º plano se salta solo si ya tiene su hora',
    html.includes('if(t&&t.value&&!manual&&_esActiva){') && html.includes('else if(!manual&&!_esActiva&&_tab&&_tab.selloHora){'), true);
  T('html: el reintento captura y rebusca LA pestaña que falló (no la que esté abierta al disparar)',
    html.includes('_gmailReintentoTab=(tab&&tab.id)?tab:null;') && html.includes('gmailHoraArchivo(false,true,_tab)'), true);
  T('html: los 5 puntos de reintento (4 en la búsqueda + 1 en la ronda) pasan SU pestaña',
    (html.match(/gmailHoraReintentoAgendar\(_tab\)/g) || []).length, 5);
  T('html: gmailAplicarHitApi consciente de la pestaña (2.º plano mira SU estado, no el campo de otra)',
    html.includes("if(_act){var rxT=document.getElementById('selloRxTime');if(rxT&&rxT.value)return true;}") && html.includes('else if(tab&&tab.selloHora)return true;'), true);
  T('html: hora escrita a MANO blindada — bandera en los 2 inputs, ficha móvil y reinicios programáticos (decl.+4)',
    html.includes('function selloHoraEditada(){_gmailHoraManual=true;}') && (html.match(/oninput="selloHoraEditada\(\);/g) || []).length === 2 && html.includes('if(fromMob)_gmailHoraManual=true;') && (html.match(/_gmailHoraManual=false;/g) || []).length === 5 && html.includes('if(_horaDeEste||_gmailHoraManual){gmailLoginBtnOcultar();return;}'), true);
  T('main: la cola de búsquedas serializadas sigue intacta (N pestañas → N búsquedas, de a una)',
    mainjs.includes("_gmailHoraCadena.then(() => _gmailHoraBuscar("), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3226.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3226.js generado')
