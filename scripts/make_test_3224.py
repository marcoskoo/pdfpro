# Genera scripts/test_gmail_hora_3224.js a partir del de v3.2.23:
# v3.2.24 — LA HORA DE RECEPCIÓN PERTENECE AL ARCHIVO, NO A LA PESTAÑA.
# «Al cargar otro archivo la hora de recepción no se actualiza de
# acuerdo al archivo seleccionado»: loadPDF reutiliza la pestaña activa y
# no limpiaba la fecha/hora del archivo anterior; el guard de
# gmailHoraArchivo la respetaba («ya hay hora: no se toca») y la búsqueda
# del nuevo archivo jamás ocurría. (1) loadPDF limpia campos+ficha
# móvil+pestaña al cambiar de archivo; (2) gmailAplicarHora firma la hora
# con su archivo (selloHoraArchivo); (3) guards de gmailHoraArchivo y
# del reintento solo respetan horas de ESTE archivo o manuales — una hora
# de OTRO archivo se limpia y se rebusca.
# 398 + 6 = 404.
import sys

src = open('scripts/test_gmail_hora_3223.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
i = out.index('/* Pruebas v3.2.23')
j = out.index('*/', i) + 2
out = out[:i] + """/* Pruebas v3.2.24 — LA HORA DE RECEPCIÓN PERTENECE AL ARCHIVO, NO A LA
   PESTAÑA. Reporte del usuario tras el acceso exitoso: «ahora ya carga
   la hora, pero al cargar otro archivo la hora de recepción no se
   actualiza de acuerdo al archivo seleccionado». Causa en el código
   real: loadPDF reutiliza la pestaña activa — cambia fileName pero NO
   limpia selloRxDate/selloRxTime ni tab.selloHora; con la hora del
   archivo ANTERIOR en el campo, el guard de gmailHoraArchivo
   («if(t&&t.value&&!manual) return» // ya hay hora: no se toca)
   cancelaba la búsqueda (y docTabSaveCurrent persistía la hora vieja en
   la pestaña del archivo nuevo). (1) loadPDF limpia fecha/hora (campo,
   ficha móvil y pestaña) al cargar un archivo DISTINTO en la misma
   pestaña; (2) gmailAplicarHora firma la hora con su archivo
   (tab.selloHoraArchivo); (3) los guards de gmailHoraArchivo y del
   reintento solo respetan horas de ESTE archivo o escritas a mano — una
   hora de OTRO archivo se limpia y se busca la nueva. Incluye la
   regresión completa v3.2.23 (398 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3224.js */""" + out[j:]

# 2) banner
rep(r"""T('banner v3.2.23', /CORPAC AIS\/ARO Platform v3\.2\.23/.test(html), true);""",
    r"""T('banner v3.2.24', /CORPAC AIS\/ARO Platform v3\.2\.24/.test(html), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.24 — la hora pertenece al archivo, no a la pestaña ════ */
  console.log('── v3.2.24: al cargar otro archivo, su hora se busca ──');
  T('html: loadPDF LIMPIA la fecha/hora del archivo anterior al cargar un archivo DISTINTO (campo, ficha móvil y pestaña)',
    /function loadPDF\(file\)\{[\s\S]{0,1300}_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';if\(_htL\)_htL\.value='';[\s\S]{0,300}_tabV\.selloFecha='';_tabV\.selloHora='';_tabV\.selloHoraArchivo='';/.test(html), true);
  T('html: loadPDF limpia también la ficha móvil y actualiza la vista previa del sello',
    /_tabV\.selloHoraArchivo='';[\s\S]{0,200}updateSelloPreview\(\)[\s\S]{0,200}mobSelloSync\(false\)/.test(html), true);
  T('html: gmailAplicarHora FIRMA la hora con el archivo al que pertenece (selloHoraArchivo)',
    html.includes("t2.selloFecha=fecha;t2.selloHora=hora;t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24: la hora queda firmada con el archivo al que pertenece */"), true);
  T('html: el guard de gmailHoraArchivo distingue de qué archivo es la hora (hora de OTRO archivo → se limpia y se busca; de este archivo o manual → se respeta)',
    /var _horaDeOtro=!!\(_tab&&_tab\.selloHoraArchivo&&_tab\.selloHoraArchivo!==nombre\);[\s\S]{0,200}if\(!_horaDeOtro\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]{0,400}_tab\.selloHora='';_tab\.selloFecha='';_tab\.selloHoraArchivo='';/.test(html), true);
  T('html: el guard del REINTENTO también es consciente del archivo (solo rebusca si la hora del campo es de OTRO archivo)',
    html.includes("if(t&&t.value&&!(_tab.selloHoraArchivo&&_tab.selloHoraArchivo!==nombre))return;"), true);
  T('html: el guard antiguo «ya hay hora» SIN distinguir el archivo ya NO existe (era el que congelaba la hora del archivo anterior)',
    !html.includes("if(t&&t.value&&!manual){gmailLoginBtnOcultar();return;}  // ya hay hora: no se toca"), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3224.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3224.js generado')
