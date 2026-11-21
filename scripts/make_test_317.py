# Genera scripts/test_fpl_reglas_317.js a partir del de v3.1.6:
# + regresión 72 íntegra · + botón retirado · + autoOcrMatricula (llena y
# SOBRESCRIBE) · + nvAutoMatricula (Word/Excel) · banner v3.1.7
import re, sys

src = open('scripts/test_fpl_reglas_316.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("/* Pruebas v3.1.6 — reglas del campo «Matrícula (Aeronave / Espacio)» con\n   FORMULARIOS IMPRESOS CORPAC/ICAO (una casilla por carácter, texto interno\n   revuelto) + regresión completa v3.1.5. Ejecuta el CÓDIGO REAL extraído de\n   web/index.html. Ejecutar: node scripts/test_fpl_reglas_316.js */",
    "/* Pruebas v3.1.7 — botón «✈ Detectar» retirado: la detección de la\n   «Matrícula (Aeronave / Espacio)» es 100% automática al cargar cualquier\n   documento (PDF texto/escaneado, imagen, Word/Excel) y SOBRESCRIBE al\n   cambiar de documento. Incluye la regresión completa v3.1.6 (72 pruebas).\n   Ejecuta el CÓDIGO REAL extraído de web/index.html.\n   Ejecutar: node scripts/test_fpl_reglas_317.js */")

# 2) extracción: añadir nvAutoMatricula y autoOcrMatricula (async)
rep("function extraerFn(nombre) {\n  const marca = 'function ' + nombre + '(';",
    "function extraerFn(nombre, asinc) {\n  const marca = (asinc ? 'async ' : '') + 'function ' + nombre + '(';")
rep("extraerFn('_fplTipoDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('fplExtraerCampos'),",
    "extraerFn('_fplTipoDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('nvAutoMatricula'), extraerFn('autoOcrMatricula', true), extraerFn('fplExtraerCampos'),")

# 3) banner de la sección UI → v3.1.7
rep("console.log('── UI: ayuda contraída + banner v3.1.6 ──');",
    "console.log('── UI: ayuda contraída + banner ──');")
rep("T('banner v3.1.6', /CORPAC AIS\\/ARO Platform v3\\.1\\.6/.test(html), true);",
    "T('banner v3.1.7', /CORPAC AIS\\/ARO Platform v3\\.1\\.7/.test(html), true);")

# 4) cierre: nuevas pruebas v3.1.7 + bloque asíncrono con el resumen
rep("""console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
process.exit(mal ? 1 : 0);
""",
    """console.log('── v3.1.7: botón retirado, detección 100% automática ──');
T('botón «✈ Detectar» eliminado (sin referencias de código)', /matriculaDetectarManual/.test(html) || />✈ Detectar</.test(html), false);
T('ayuda dice «La detección es automática»', html.includes('La detección es automática'), true);
T('hook Word/Excel nativos (nvAutoMatricula tras el toast)', /modo Word[^\\n]*\\n    nvAutoMatricula\\(tab\\);/.test(html) && /modo Excel[^\\n]*\\n    nvAutoMatricula\\(tab\\);/.test(html), true);
T('autoOcrMatricula sobrescribe con _fplSetMatricula', /autoOcrMatricula[\\s\\S]*?_fplSetMatricula\\(m\\)/.test((function(){var i=html.indexOf('async function autoOcrMatricula');return html.slice(i,i+2600);})()), true);

(async function () {
  // —— autoOcrMatricula: llena y SOBRESCRIBE ——
  global.pageCount = 1; global.pageTexts = [FIX_CAPTURA]; global.pageItems = [[]];
  global.pdfDoc = null; global.fileName = 'FPL OB2066 SPHI SPRU 17-11.pdf';
  campos.selloMatricula.value = ''; campos.mobSelloMatricula.value = '';
  await autoOcrMatricula();
  T('PDF al cargar → campo «OB2066 2020 MK» (automático, sin botón)', campos.selloMatricula.value, 'OB2066 2020 MK');
  T('…y el campo móvil queda sincronizado', campos.mobSelloMatricula.value, 'OB2066 2020 MK');
  campos.selloMatricula.value = 'OB2032 1100 MK';   // valor del documento anterior
  await autoOcrMatricula();
  T('cargar otro FPL SOBRESCRIBE («OB2032 1100 MK» → «OB2066 2020 MK»)', campos.selloMatricula.value, 'OB2066 2020 MK');
  global.pageTexts = ['LICENCIA FUNCIONAL ALA LIVIANA DNI 12345678 VIGENCIA 2027'];
  global.fileName = 'licencia.pdf';
  campos.selloMatricula.value = 'OB2147 MK';        // escrito a mano
  await autoOcrMatricula();
  T('documento sin matrícula → conserva lo escrito a mano', campos.selloMatricula.value, 'OB2147 MK');

  // —— nvAutoMatricula: Word/Excel (texto visible de la pestaña) ——
  global.pageTexts = ['']; global.fileName = '';
  campos.selloMatricula.value = '';
  nvAutoMatricula({ nvEl: { innerText: FIX_CAPTURA } });
  T('Word/Excel (texto visible) → campo «OB2066 2020 MK»', campos.selloMatricula.value, 'OB2066 2020 MK');
  campos.selloMatricula.value = 'OB2147 MK';
  nvAutoMatricula({ nvEl: { innerText: 'hola' } });
  T('texto corto/irrelevante → no toca el campo', campos.selloMatricula.value, 'OB2147 MK');
  nvAutoMatricula(null);
  T('pestaña sin contenido → no lanza error', true, true);

  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
  process.exit(mal ? 1 : 0);
})().catch(function (e) { console.log('✗ ERROR ASÍNCRONO: ' + e.message); process.exit(1); });
""")

open('scripts/test_fpl_reglas_317.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_fpl_reglas_317.js generado (' + str(out.count(chr(10))) + ' líneas)')
