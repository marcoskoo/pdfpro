# Genera scripts/test_gmail_hora_325.js a partir del de v3.2.4:
# v3.2.5 — el plan REAL «PV CIX LIM 2226» (StarPerú, SRU 2226) debe componer
# «SRU2226 OB2176P MK» (regla del usuario, Doc 4444 Ap. 2: en vuelos tipo S
# el casillero 7 lleva designador ICAO + nº de vuelo y la matrícula viaja en
# REG/ del casillero 18, escrita SIN guion). Con el PDF real subido:
#   · «SRU 2226» venía como UN item con espacio 19 pt bajo el rótulo →
#     geometría del c-7 ampliada (banda 24 pt + valores con espacio interno)
#   · «REG./OB-2176P» traía punto antes de la barra → patrón REG/ tolerante
#   · el respaldo robaba la matrícula del REG/ como c-7 → guardia nueva
# JAP 7361 y el plan ORIGINAL (casillero 7 = matrícula → «OB2203 1300 MK»)
# siguen igual (pruebas con los fixtures REALES de ambos PDFs).
# Regresión 200 de v3.2.4 (4 expectativas actualizadas al sin-guión).
import sys

src = open('scripts/test_gmail_hora_324.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.4 — corrige «la ventana de Gmail cargó un segundo y se
   cerró» (el sondeo tomaba la pantalla de carga de mail.google.com SIN
   sesión por «sesión lista»: ahora exige cookies SID/SAPISID/… con la
   página terminada de cargar, 2 sondeos seguidos) y la matrícula de
   planes de aerolínea (SRU 2226, JAP 7163…): el casillero 7 con
   designador ICAO + nº de vuelo se reconoce también suelto en el texto,
   y si nada se detecta el campo se LIMPIA (antes quedaba la matrícula
   del documento anterior, que viajaba al nombre del archivo exportado).
   Incluye la regresión completa v3.2.3 (191 pruebas). Ejecuta el CÓDIGO
   REAL de web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_324.js */""",
    """/* Pruebas v3.2.5 — el plan REAL «PV CIX LIM 2226» (SRU 2226, StarPerú)
   debe componer «SRU2226 OB2176P MK»: en vuelos tipo S el casillero 7
   lleva designador ICAO + nº de vuelo y la matrícula viaja en REG/ del
   casillero 18, SIN guion (Doc 4444 Ap. 2 / regla del usuario). Con el
   PDF real: «SRU 2226» es UN item con espacio 19 pt bajo el rótulo
   (geometría del c-7 ampliada: banda 24 pt + espacios internos), el
   rótulo «REG./» trae punto antes de la barra (patrón tolerante) y el
   respaldo ya no roba la matrícula del REG/ como c-7. Los planes
   «ATC JAP 7361» y el ORIGINAL (c-7 = matrícula → «OB2203 1300 MK»)
   se prueban con sus fixtures REALES sin cambios. Incluye la regresión
   completa v3.2.4 (200 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_325.js */""")

# 2) banner → v3.2.5
rep("T('banner v3.2.4', /CORPAC AIS\\/ARO Platform v3\\.2\\.4/.test(html), true);",
    "T('banner v3.2.5', /CORPAC AIS\\/ARO Platform v3\\.2\\.5/.test(html), true);")

# 3) cargar los fixtures REALES (items pdf.js de los PDFs subidos)
rep("""const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');""",
    """const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
/* v3.2.5 — fixtures REALES: items pdf.js (los mismos {str,x,y} que consume
   _fplItemsPagina) de los dos planes de vuelo subidos por el usuario */
const FIX_SRU = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_sru2226.json'), 'utf8'));
const FIX_JAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_jap7361.json'), 'utf8'));""")

# 4) expectativas del REG/ sin guion (regla del usuario + Doc 4444)
rep("""T('StarPerú: REG/ = OB-2176P (casilla por carácter, guion suelto)', ST.reg, 'OB-2176P');""",
    """T('StarPerú: REG/ = OB2176P (v3.2.5: sin guion, como escribe el Doc 4444)', ST.reg, 'OB2176P');""")
rep("""T('StarPerú: valor compuesto → «SRU2226 OB-2176P MK»', fplComponerRegistro(ST), 'SRU2226 OB-2176P MK');""",
    """T('StarPerú: valor compuesto → «SRU2226 OB2176P MK» (tipo S: c-7 + REG/ + iniciales)', fplComponerRegistro(ST), 'SRU2226 OB2176P MK');""")
rep("""T('texto plano (sin geometría): REG/ con guion espaciado', ST2.reg, 'OB-2176P');""",
    """T('texto plano (sin geometría): REG/ con guion espaciado → OB2176P', ST2.reg, 'OB2176P');""")
rep("""T('regresión: «REG/OB-2147» pegado sigue funcionando', ST4.reg, 'OB-2147');""",
    r"""T('regresión: «REG/OB-2147» pegado sigue funcionando (v3.2.5: sin guion)', ST4.reg, 'OB2147');
console.log('── v3.2.5: planes REALES subidos por el usuario (items pdf.js) ──');
var RS = fplExtraerCampos(FIX_SRU.texto, FIX_SRU.items, 'PV CIX LIM 2226.pdf');
T('SRU 2226 real: c-7 = SRU2226 (item «SRU 2226» con espacio, 19 pt bajo el rótulo)', RS.c7, 'SRU2226');
T('SRU 2226 real: tipo S (casillero 8 con I/S)', RS.tipoS, true);
T('SRU 2226 real: REG/ = OB2176P (rótulo «REG./» con punto; sin guion)', RS.reg, 'OB2176P');
T('SRU 2226 real: valor compuesto → «SRU2226 OB2176P MK» (lo que pidió el usuario)', fplComponerRegistro(RS), 'SRU2226 OB2176P MK');
var RJ = fplExtraerCampos(FIX_JAP.texto, FIX_JAP.items, 'ATC JAP 7361.pdf');
T('JAP 7361 real (regresión): c-7 = JAP7361', RJ.c7, 'JAP7361');
T('JAP 7361 real (regresión): REG/ = CCDIU', RJ.reg, 'CCDIU');
T('JAP 7361 real (regresión): valor compuesto → «JAP7361 CCDIU MK»', fplComponerRegistro(RJ), 'JAP7361 CCDIU MK');
T('v3.2.5: «SRU 2226» con espacio en texto plano también se captura', fplExtraerCampos('PLAN DE VUELO SRU 2226 B733 AERODROMO DE SALIDA SPJC 0145', null, '').c7, 'SRU2226');
T('v3.2.5: «REG./OB-2176P» con punto en texto plano → OB2176P', fplExtraerCampos('18. OTROS DATOS REG./OB-2176P', null, '').reg, 'OB2176P');
var RG = fplExtraerCampos('REG/OB-2176P AERODROMO DE SALIDA SPHI 0145', null, '');
T('v3.2.5: sin c-7 detectable, el respaldo NO roba la matrícula del REG/ como c-7', RG.c7, '');
T('v3.2.5: …el campo compone matrícula + EOBT → «OB2176P 0145 MK»', fplComponerRegistro(RG), 'OB2176P 0145 MK');
T('v3.2.5: geometría c-7 con banda de 24 pt y valores con espacio interno', html.includes('var h=24;') && html.includes('/^[A-Z0-9]{1,3}(?:\\s+[A-Z0-9]{1,4})?$/i'), true);""")

open('scripts/test_gmail_hora_325.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_325.js generado')
