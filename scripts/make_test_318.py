# Genera scripts/test_fpl_reglas_318.js a partir del de v3.1.7:
# + regresión 83 íntegra · + fixture StarPerú (formulario electrónico, una
#   casilla por carácter, guion suelto, estela M en la banda del tipo) →
#   «SRU2226 OB-2176P MK» · + guard «REG/ GNSS» · + EOBT con rótulo intermedio
import sys

src = open('scripts/test_fpl_reglas_317.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("/* Pruebas v3.1.7 — botón «✈ Detectar» retirado: la detección de la\n   «Matrícula (Aeronave / Espacio)» es 100% automática al cargar cualquier\n   documento (PDF texto/escaneado, imagen, Word/Excel) y SOBRESCRIBE al\n   cambiar de documento. Incluye la regresión completa v3.1.6 (72 pruebas).\n   Ejecuta el CÓDIGO REAL extraído de web/index.html.\n   Ejecutar: node scripts/test_fpl_reglas_317.js */",
    "/* Pruebas v3.1.8 — REG/ de los formularios electrónicos (StarPerú y\n   similares): una casilla por carácter deja el guion suelto («OB - 2176P»)\n   y la letra del TIPO DE VUELO va en su casilla bajo el rótulo (con la\n   estela «M» en la misma banda). Incluye la regresión completa v3.1.7\n   (83 pruebas). Ejecuta el CÓDIGO REAL extraído de web/index.html.\n   Ejecutar: node scripts/test_fpl_reglas_318.js */")

# 2) extracción: añadir _fplRegDeFormulario
rep("extraerFn('_fplTipoDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('nvAutoMatricula'), extraerFn('autoOcrMatricula', true), extraerFn('fplExtraerCampos'),",
    "extraerFn('_fplTipoDeFormulario'), extraerFn('_fplRegDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('nvAutoMatricula'), extraerFn('autoOcrMatricula', true), extraerFn('fplExtraerCampos'),")

# 3) banner → v3.1.8
rep("T('banner v3.1.7', /CORPAC AIS\\/ARO Platform v3\\.1\\.7/.test(html), true);",
    "T('banner v3.1.8', /CORPAC AIS\\/ARO Platform v3\\.1\\.8/.test(html), true);")

# 4) fixture StarPerú + pruebas v3.1.8 antes de la sección v3.1.7
rep("console.log('── v3.1.7: botón retirado, detección 100% automática ──');",
    """// ── v3.1.8: fixture StarPerú (captura del usuario) — formulario
// electrónico: una casilla por carácter, rótulos ARRIBA de sus casillas,
// estela «M» en la misma banda que la letra del tipo, REG/ en el c-18 ──
var FIX_STARP_ITEMS = [];
(function () {
  function C(str, x, y) { FIX_STARP_ITEMS.push({ str: str, x: x, y: y }); }
  C('PLAN DE VUELO / FLIGHT PLAN', 300, 700);
  C('FPL', 720, 700);
  // c-7: rótulo a la izquierda, valor en casillas por carácter
  C('7. IDENTIFICACION DE AERONAVE', 100, 672);
  C('S', 140, 648); C('R', 152, 648); C('U', 164, 648);
  C('2', 176, 648); C('2', 188, 648); C('2', 200, 648); C('6', 212, 648);
  // c-8: rótulos ARRIBA, letra en la casilla DEBAJO
  C('8. REGLAS DE VUELO', 100, 630);
  C('TIPO DE VUELO', 260, 630);
  C('CATEGORIA DE ESTELA', 430, 630);
  C('I', 130, 612); C('S', 290, 612); C('M', 470, 612); // M del c-9, misma banda
  // c-9: tipo de aeronave
  C('TIPO DE AERONAVE', 100, 590);
  C('B', 130, 568); C('7', 142, 568); C('3', 154, 568); C('3', 166, 568);
  // c-13: aeródromo en casillas + EOBT con rótulo intermedio
  C('13. AERODROMO DE SALIDA', 100, 540);
  C('S', 140, 516); C('P', 152, 516); C('H', 164, 516); C('I', 176, 516);
  C('EOBT / TIME', 430, 540);
  C('0', 450, 516); C('1', 462, 516); C('4', 474, 516); C('5', 486, 516);
  // c-16
  C('16. AERODROMO DE DESTINO', 100, 480);
  C('S', 140, 456); C('P', 152, 456); C('J', 164, 456); C('C', 176, 456);
  C('EET TOTAL', 430, 480);
  C('0', 450, 456); C('1', 462, 456); C('0', 474, 456); C('0', 486, 456);
  // c-18: cada entrada en su fila; el valor en casillas por carácter
  C('18. OTROS DATOS', 100, 420);
  C('REG/', 130, 396);
  C('O', 170, 396); C('B', 182, 396); C('-', 194, 396);
  C('2', 206, 396); C('1', 218, 396); C('7', 230, 396); C('6', 242, 396); C('P', 254, 396);
  C('PBN/', 130, 376);
  C('B', 170, 376); C('1', 182, 376); C('D', 194, 376); C('1', 206, 376); C('O', 218, 376); C('1', 230, 376);
  C('DOF/', 130, 356);
  C('2', 170, 356); C('6', 182, 356); C('1', 194, 356); C('1', 206, 356); C('1', 218, 356); C('7', 230, 356);
  C('NAV/', 130, 336);
  C('G', 170, 336); C('N', 182, 336); C('S', 194, 336); C('S', 206, 336);
})();
// el texto del PDF = ítems unidos por espacio (como hace loadPDF con pdf.js)
var FIX_STARP_TXT = FIX_STARP_ITEMS.map(function (o) { return o.str; }).join(' ');

console.log('── v3.1.8: REG/ en formularios electrónicos (StarPerú) ──');
var ST = fplExtraerCampos(FIX_STARP_TXT, FIX_STARP_ITEMS, 'PLAN DE VUELO CX LIM 2226 16 NOV.pdf');
T('StarPerú: c-7 = SRU2226', ST.c7, 'SRU2226');
T('StarPerú: tipo S (letra bajo el rótulo; estela M separada por hueco)', ST.tipoS, true);
T('StarPerú: REG/ = OB-2176P (casilla por carácter, guion suelto)', ST.reg, 'OB-2176P');
T('StarPerú: EOBT = 0145 (rótulo «EOBT / TIME» intermedio)', ST.eoibt, '0145');
T('StarPerú: valor compuesto → «SRU2226 OB-2176P MK»', fplComponerRegistro(ST), 'SRU2226 OB-2176P MK');
var ST2 = fplExtraerCampos('TIPO DE VUELO S REG/ OB - 2176P AERODROMO DE SALIDA SPHI EOBT / TIME 0145', null, '');
T('texto plano (sin geometría): REG/ con guion espaciado', ST2.reg, 'OB-2176P');
var ST3 = fplExtraerCampos('REG/ GNSS PBN/ B1 DOF/ 261117', null, '');
T('«REG/ GNSS» NO es matrícula (respaldo exige dígitos)', ST3.reg, '');
var ST4 = fplExtraerCampos('REG/OB-2147', null, '');
T('regresión: «REG/OB-2147» pegado sigue funcionando', ST4.reg, 'OB-2147');
var ST5 = fplExtraerCampos('(FPL-SRU2226-IS' + '\\n' + '-OB2176P' + '\\n' + 'DOF/261117)', null, '');
T('regresión: télex (FPL-SRU2226-IS sigue siendo tipo S)', ST5.tipoS, true);

console.log('── v3.1.7: botón retirado, detección 100% automática ──');""")

open('scripts/test_fpl_reglas_318.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_fpl_reglas_318.js generado (' + str(out.count(chr(10))) + ' líneas)')
