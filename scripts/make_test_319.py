# Genera scripts/test_gmail_hora_319.js a partir del de v3.1.8:
# + regresión 92 íntegra (banner actualizado a v3.1.9) · + parser de la hora
# de visualización de Gmail (zona Lima UTC-5) · + baseDe/filaCoincide ·
# + integración main/preload/servicio · + UI (botón, toggle, enganches, UTC)
import sys

src = open('scripts/test_fpl_reglas_318.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.1.8 — REG/ de los formularios electrónicos (StarPerú y
   similares): una casilla por carácter deja el guion suelto («OB - 2176P»)
   y la letra del TIPO DE VUELO va en su casilla bajo el rótulo (con la
   estela «M» en la misma banda). Incluye la regresión completa v3.1.7
   (83 pruebas). Ejecuta el CÓDIGO REAL extraído de web/index.html.
   Ejecutar: node scripts/test_fpl_reglas_318.js */""",
    """/* Pruebas v3.1.9 — HORA DE RECEPCIÓN POR ARCHIVO CARGADO (Gmail asistido
   con Playwright, sin OAuth): parser de la hora tal como la muestra Gmail
   («17 nov 2026, 8:00 p. m.» → epoch, zona Lima UTC-5), coincidencia
   estricta de fila, integración Electron (main/preload/servicio) y UI
   (botón, toggle automático, campos en UTC). Incluye la regresión completa
   v3.1.8 (92 pruebas). Ejecuta el CÓDIGO REAL de web/index.html y
   src/gmail-hora/. Ejecutar: node scripts/test_gmail_hora_319.js */""")

# 2) banner → v3.1.9
rep("T('banner v3.1.8', /CORPAC AIS\\/ARO Platform v3\\.1\\.8/.test(html), true);",
    "T('banner v3.1.9', /CORPAC AIS\\/ARO Platform v3\\.1\\.9/.test(html), true);")

# 3) sección v3.1.9 antes de la sección v3.1.7
rep("console.log('── v3.1.7: botón retirado, detección 100% automática ──');",
    r"""// ── v3.1.9: hora de recepción por archivo cargado (Gmail asistido) ──
const HORA = require('../src/gmail-hora/hora');
const GH = require('../src/gmail-hora/GmailHoraService');
const mainjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const preloadjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
const svcjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-hora', 'GmailHoraService.js'), 'utf8');
function iso(ms) { return ms ? new Date(ms).toISOString() : null; }

console.log('── v3.1.9: parser de la hora de Gmail (zona Lima UTC-5) ──');
T('«17 nov 2026, 8:00 p. m.» → 2026-11-18T01:00Z', iso(HORA.parseHoraGmail('17 nov 2026, 8:00 p. m.')), '2026-11-18T01:00:00.000Z');
T('«17 nov 2026, 8:00 p.m.» (sin espacios)', iso(HORA.parseHoraGmail('17 nov 2026, 8:00 p.m.')), '2026-11-18T01:00:00.000Z');
T('«17 de noviembre de 2026, 20:00» (mes completo)', iso(HORA.parseHoraGmail('17 de noviembre de 2026, 20:00')), '2026-11-18T01:00:00.000Z');
T('«sáb, 17 nov 2026, 11:15 p. m.» (día de semana delante)', iso(HORA.parseHoraGmail('sáb, 17 nov 2026, 11:15 p. m.')), '2026-11-18T04:15:00.000Z');
T('«17 set 2026, 8:00 a. m.» (setiembre es-419)', iso(HORA.parseHoraGmail('17 set 2026, 8:00 a. m.')), '2026-09-17T13:00:00.000Z');
T('«17 sept 2026, 8:00 a. m.» (sept es-ES)', iso(HORA.parseHoraGmail('17 sept 2026, 8:00 a. m.')), '2026-09-17T13:00:00.000Z');
T('«31 ene 2027, 11:15 p. m.» (cruce de medianoche y de mes UTC)', iso(HORA.parseHoraGmail('31 ene 2027, 11:15 p. m.')), '2027-02-01T04:15:00.000Z');
T('«12:05 a. m.» → 00:05 Lima = 05:05 UTC', new Date(HORA.parseHoraGmail('12:05 a. m.')).getUTCHours() === 5, true);
T('«12:30 p. m.» → 12:30 Lima = 17:30 UTC (no 0:30)', new Date(HORA.parseHoraGmail('12:30 p. m.')).getUTCHours() === 17 && new Date(HORA.parseHoraGmail('12:30 p. m.')).getUTCMinutes() === 30, true);
var sinAnio = HORA.parseHoraGmail('17 nov, 8:00 p. m.');
T('«17 nov, 8:00 p. m.» sin año → año en curso, 01:00Z del 18', sinAnio !== null && new Date(sinAnio).getUTCMonth() === 10 && new Date(sinAnio).getUTCDate() === 18 && new Date(sinAnio).getUTCHours() === 1, true);
var soloHora = HORA.parseHoraGmail('20:15');
T('«20:15» solo hora → hoy Lima, 01:15 UTC del día siguiente', soloHora !== null && new Date(soloHora).getUTCHours() === 1 && new Date(soloHora).getUTCMinutes() === 15 && Math.abs(soloHora - Date.now()) < 48 * 3600e3, true);
T('texto sin hora → null', HORA.parseHoraGmail('Plan de vuelo sin hora'), null);
T('mes inválido → null', HORA.parseHoraGmail('17 xyz 2026, 8:00'), null);
T('minutos imposibles → null', HORA.parseHoraGmail('17 nov 2026, 8:99'), null);

console.log('── v3.1.9: baseDe / coincidencia de fila ──');
T('baseDe quita la extensión', GH.baseDe('ATC JAP 7163.pdf'), 'ATC JAP 7163');
T('baseDe sin extensión no cambia', GH.baseDe('GENDEC OB2209'), 'GENDEC OB2209');
T('fila que menciona el archivo coincide', GH.filaCoincide('ATC JAP 7163 CIXLIM — 5 ago', 'ATC JAP 7163'), true);
T('fila de otro correo no coincide', GH.filaCoincide('DISTRIBUCION 18NOV otro', 'ATC JAP 7163'), false);
T('coincidencia tolera mayúsculas y guiones', GH.filaCoincide('OB 2176 P adjunto', 'ob-2176-p'), true);
T('cadena vacía no coincide', GH.filaCoincide('lo que sea', ''), false);
T('disponible() informa si Playwright está', typeof GH.disponible().playwright, 'boolean');

console.log('── v3.1.9: integración escritorio (main / preload / servicio) ──');
T('main.js: IPC gmail-hora:buscar', /ipcMain\.handle\('gmail-hora:buscar'/.test(mainjs), true);
T('main.js: IPC gmail-hora:estado', /ipcMain\.handle\('gmail-hora:estado'/.test(mainjs), true);
T('main.js: evento de progreso gmail-hora:evento', /gmail-hora:evento/.test(mainjs), true);
T('main.js: parsea la hora y devuelve epoch + UTC', /parseHoraGmail\(r\.horaRecepcion\)/.test(mainjs) && /recibidoUTC/.test(mainjs), true);
T('main.js: cierra el navegador asistido al salir', /before-quit/.test(mainjs), true);
T('main.js: perfil persistente en userData', /gmail-playwright-profile/.test(mainjs), true);
T('preload: bridge gmailHoraBuscar/gmailHoraEstado/onGmailHoraEvento', /gmailHoraBuscar/.test(preloadjs) && /gmailHoraEstado/.test(preloadjs) && /onGmailHoraEvento/.test(preloadjs), true);
T('servicio: usa el Chrome del sistema (channel: chrome)', /channel:\s*'chrome'/.test(svcjs), true);
T('servicio: búsqueda libre estricta (no abre correo al azar)', /estricto/.test(svcjs) && /modo === 'texto'/.test(svcjs), true);
T('servicio: portapapeles desactivado por defecto', /copiar = false/.test(svcjs), true);
T('servicio: reintento con ventana visible si pide login', /_visible = true/.test(svcjs), true);

console.log('── v3.1.9: UI — panel Gmail + enganches tras carga ──');
T('botón «🕐 Hora del correo del archivo cargado» presente', /gmailHoraArchivo\(false\)/.test(html) && /id="gmailHoraBox"/.test(html), true);
T('toggle «Automático al cargar» persistente', /id="gmailHoraAuto"/.test(html) && /pdfpro_gmail_hora_auto/.test(html), true);
T('gmailAplicarHora llena los campos en UTC', /function gmailAplicarHora[\s\S]{0,420}getUTCHours/.test(html), true);
T('gmailUsarHora (ruta OAuth) delega en gmailAplicarHora (fix UTC)', /function gmailUsarHora[\s\S]{0,220}gmailAplicarHora/.test(html), true);
T('3 enganches gmailHoraAuto tras cargar documento', (html.match(/gmailHoraAuto\(\);?\}catch/g) || []).length, 3);
T('UI avisa si la hora no es interpretable', /no interpretable/.test(html), true);

console.log('── v3.1.7: botón retirado, detección 100% automática ──');""")

open('scripts/test_gmail_hora_319.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_319.js generado (' + str(out.count(chr(10))) + ' líneas)')
