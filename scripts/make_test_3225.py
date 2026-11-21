# Genera scripts/test_gmail_hora_3225.js a partir del de v3.2.24:
# v3.2.25 — LA HORA NO VIAJA A LA PESTAÑA NUEVA. openFilesList (v2.7.0)
# crea una pestaña nueva por archivo cuando ya hay documento abierto
# pero NO limpiaba el formulario — la hora del archivo anterior quedaba
# pegada, el guard la daba por suya (la pestaña nueva nace sin rastro de
# hora) y la búsqueda se cancelaba; al alternar pestañas la hora ajena
# quedaba guardada como suya. (1) openFilesList limpia fecha/hora/
# matrícula al crear la pestaña nueva (ficha móvil y vista previa
# incluidas); (2) el guard solo respeta horas firmadas con este archivo
# o guardadas sin firma (manuales) — un valor sin rastro en la pestaña
# es de otro archivo: se limpia y se busca la nueva.
# 404 + 5 = 409.
import sys

src = open('scripts/test_gmail_hora_3224.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
i = out.index('/* Pruebas v3.2.24')
j = out.index('*/', i) + 2
out = out[:i] + """/* Pruebas v3.2.25 — LA HORA NO VIAJA A LA PESTAÑA NUEVA. Reporte del
   usuario: «Hora Recepción (UTC) no actualiza cuando se cambia de
   pestaña/archivo dentro de la app, sigue mostrando la hora de
   recepción del primer pestaña/archivo». Causa en el código real:
   openFilesList (v2.7.0) crea una pestaña NUEVA por archivo cuando ya
   hay un documento abierto — guarda los campos del saliente
   (_selloCamposGuardar) pero NO limpia el formulario, que sigue
   mostrando la hora del archivo anterior; la pestaña nueva nace sin
   selloHora/selloHoraArchivo, el guard de gmailHoraArchivo (v3.2.24)
   clasificaba esa hora ajena como «propia o manual» y cancelaba la
   búsqueda; y al alternar pestañas (_selloCamposGuardar al salir) la
   hora ajena quedaba guardada como suya. (1) openFilesList limpia
   fecha/hora/matrícula (campo, ficha móvil y vista previa) al crear la
   pestaña nueva; (2) el guard solo respeta horas firmadas con este
   archivo (selloHoraArchivo===nombre) o guardadas en la pestaña sin
   firma de archivo (manuales) — un valor sin rastro en la pestaña es de
   otro archivo: se limpia y se busca la nueva. Incluye la regresión
   completa v3.2.24 (404 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3225.js */""" + out[j:]

# 2) banner
rep(r"""T('banner v3.2.24', /CORPAC AIS\/ARO Platform v3\.2\.24/.test(html), true);""",
    r"""T('banner v3.2.25', /CORPAC AIS\/ARO Platform v3\.2\.25/.test(html), true);""")

# 3) el test v3.2.24 del guard ancla la forma VIEJA (_horaDeOtro): pasa a la
#    forma endurecida de v3.2.25 (_horaDeEste), misma intención
rep(r"""T('html: el guard de gmailHoraArchivo distingue de qué archivo es la hora (hora de OTRO archivo → se limpia y se busca; de este archivo o manual → se respeta)',
    /var _horaDeOtro=!!\(_tab&&_tab\.selloHoraArchivo&&_tab\.selloHoraArchivo!==nombre\);[\s\S]{0,200}if\(!_horaDeOtro\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]{0,400}_tab\.selloHora='';_tab\.selloFecha='';_tab\.selloHoraArchivo='';/.test(html), true);""",
    r"""T('html: el guard de gmailHoraArchivo solo respeta la hora de ESTE archivo o la escrita a mano (cualquier valor sin rastro en la pestaña se limpia y se busca)',
    /var _horaDeEste=!!\(_tab&&\(\(_tab\.selloHoraArchivo&&_tab\.selloHoraArchivo===nombre\)\|\|\(_tab\.selloHora&&!_tab\.selloHoraArchivo\)\)\);[\s\S]{0,200}if\(_horaDeEste\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]{0,400}_tab\.selloHora='';_tab\.selloFecha='';_tab\.selloHoraArchivo='';/.test(html), true);""")

# 3b) el test v3.2.10 de _gmailAsistidaSesionOk corta gmailHoraArchivo en
#     6400 chars; el comentario v3.2.25 del guard empuja los manejadores
#     manejadores más lejos → ventana 7300 (mismo contenido, más margen)
rep("html.slice(i, i + 6400)", "html.slice(i, i + 7300)")

# 4) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.25 — la hora no viaja a la pestaña nueva ════ */
  console.log('── v3.2.25: la pestaña nueva nace limpia, cada archivo busca su hora ──');
  T('html: openFilesList LIMPIA fecha/hora/matrícula al crear la pestaña nueva (con otro documento ya abierto)',
    /_selloCamposGuardar\(docTabGet\(activeTabId\)\);[\s\S]{0,700}renderDocTabs\(\);[\s\S]{0,900}_fdN\.value='';if\(_htN\)_htN\.value='';if\(_mtN\)_mtN\.value='';/.test(html), true);
  T('html: la limpieza de la pestaña nueva también refresca la ficha móvil y la vista previa del sello',
    /_mtN\.value='';[\s\S]{0,250}mobSelloSync\(false\)[\s\S]{0,150}updateSelloPreview\(\)/.test(html), true);
  T('html: la limpieza ocurre DESPUÉS de guardar los campos de la pestaña saliente (su hora viaja con ella, no se pierde)',
    /_selloCamposGuardar\(docTabGet\(activeTabId\)\);[\s\S]{0,1300}var _fdN=document\.getElementById\('selloRxDate'\)/.test(html), true);
  T('html: el guard v3.2.24 endurecido — un valor en el campo sin rastro en la pestaña (recién creada) ya NO bloquea la búsqueda',
    html.includes('(_tab.selloHoraArchivo&&_tab.selloHoraArchivo===nombre)||(_tab.selloHora&&!_tab.selloHoraArchivo)'), true);
  T('html: v3.2.24 intacto — loadPDF sigue limpiando al cambiar de archivo en la MISMA pestaña y la hora sigue firmada con su archivo',
    /_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';if\(_htL\)_htL\.value='';[\s\S]{0,300}_tabV\.selloFecha='';_tabV\.selloHora='';_tabV\.selloHoraArchivo='';/.test(html) && html.includes("t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24"), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3225.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3225.js generado')
