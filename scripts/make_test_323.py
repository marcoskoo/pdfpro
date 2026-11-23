# Genera scripts/test_gmail_hora_323.js a partir del de v3.2.2:
# v3.2.3 — corrige «No se completó el inicio de sesión en Gmail»:
# (1) la ventana de login interna usa un User-Agent de Chrome REAL (sin
#     «Electron/…» ni «PDFPro/…») — Google bloquea el login de navegadores
#     embebidos y esa era la causa raíz de que nunca completara;
# (2) botón «🔗 Iniciar sesión en Gmail y buscar la hora» junto a Hora
#     Recepción (reintento inmediato, manual=true salta el cooldown 30 s);
# (3) login con promesa compartida (dedup), focus() al mostrarse.
# Regresión 175 de v3.2.2 íntegra.
import sys

src = open('scripts/test_gmail_hora_322.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.2 — REGLA +05: la hora que muestra Gmail (local de Lima,
   UTC−5) se convierte a UTC sumando 5 h al llenar «Hora Recepción (UTC)»:
   07:00 Lima → 12:00 UTC; 20:30 Lima → 01:30 UTC del día SIGUIENTE (la
   fecha del campo también avanza). El toast de confirmación ahora muestra
   la conversión completa (hora de Gmail + resultado UTC). Incluye la
   regresión completa v3.2.1 (166 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_322.js */""",
    """/* Pruebas v3.2.3 — corrige «No se completó el inicio de sesión en Gmail»:
   la ventana de login interna ahora usa un User-Agent de Chrome REAL
   (Google bloquea el login de navegadores embebidos con UA de Electron —
   «Este navegador o aplicación podría no ser seguro»), hay un botón
   «🔗 Iniciar sesión en Gmail» junto a Hora Recepción para reintentar al
   momento (manual=true salta el cooldown de 30 s), el login comparte
   promesa entre llamadas concurrentes y la ventana toma el foco. Incluye
   la regresión completa v3.2.2 (175 pruebas). Ejecuta el CÓDIGO REAL de
   web/index.html y src/gmail-hora/.
   Ejecutar: node scripts/test_gmail_hora_323.js */""")

# 2) banner → v3.2.3
rep("T('banner v3.2.2', /CORPAC AIS\\/ARO Platform v3\\.2\\.2/.test(html), true);",
    "T('banner v3.2.3', /CORPAC AIS\\/ARO Platform v3\\.2\\.3/.test(html), true);")

# 3) renderer: botón de reintento manual + toasts
rep("""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\\),r\\.horaRecepcion\\)/.test(html), true);""",
    r"""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion\)/.test(html), true);""")

# 3b) pruebas v3.2.1 cuya forma de código cambió en v3.2.3 (mismo
#     comportamiento, nueva estructura: manual, botón, bloques {})
rep("T('gmailHoraArchivo sin argumento (siempre automática)', /async function gmailHoraArchivo\\(\\)\\{/.test(html), true);",
    r"""T('gmailHoraArchivo acepta manual; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);""")
rep("T('silencio SOLO si no hay correo con ese archivo', /tipo==='ArchivoNoEncontradoError'\\)return;/.test(html), true);",
    r"""T('silencio SOLO si no hay correo con ese archivo (la sesión funcionó)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);""")
rep("T('silencio también si el correo no muestra hora', /tipo==='HoraNoExtraidaError'\\)return;/.test(html), true);",
    r"""T('silencio también si el correo no muestra hora (la sesión funcionó)', /tipo==='HoraNoExtraidaError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);""")
rep("T('login cancelado se AVISA', /tipo==='LoginCancelado'\\)toast/.test(html), true);",
    r"""T('login cancelado se AVISA y muestra el botón de reintento', /tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);""")
rep("T('sesión no transferida se AVISA', /tipo==='SesionNoTransferida'\\)toast/.test(html), true);",
    r"""T('sesión no transferida se AVISA y muestra el botón de reintento', /tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);""")

# 3c) pruebas nuevas v3.2.3 (el botón lleva estilo inline «display:none;…»)
rep("""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\\),r\\.horaRecepcion\\)/.test(html), true);""",
    r"""T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion\)/.test(html), true);
T('v3.2.3: botón «Iniciar sesión en Gmail» junto a Hora Recepción (oculto por defecto)', /id="gmailLoginBtn" class="btn btn-ghost btn-sm btn-full" style="display:none;/.test(html), true);
T('v3.2.3: el botón lanza gmailLoginManual()', /onclick="gmailLoginManual\(\)"/.test(html), true);
T('v3.2.3: gmailLoginManual reintenta al momento (manual=true)', /function gmailLoginManual\(\)\{[^}]*gmailHoraArchivo\(true\)/.test(html), true);
T('v3.2.3: LoginCancelado MUESTRA el botón y lo dice en el toast', /if\(r\.tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html) && /pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);
T('v3.2.3: SesionNoTransferida también muestra el botón', /if\(r\.tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('v3.2.3: éxito de la búsqueda oculta el botón', /gmailLoginBtnOcultar\(\);\s*\/\/ la sesión quedó funcionando/.test(html), true);
T('v3.2.3: gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual\)/.test(html) && /gmailHoraBuscar\(nombre,!!manual\)/.test(html), true);""")

# 4) main.js: UA de Chrome real, dedup del login, focus, manual salta cooldown
rep("""T('main.js: perfil persistente en userData', /gmail-playwright-profile/.test(mainjs), true);""",
    r"""T('main.js: perfil persistente en userData', /gmail-playwright-profile/.test(mainjs), true);
// —— v3.2.3: login de Gmail dentro de la app ——
const uaElectron = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PDFPro/3.2.3 Chrome/128.0.6613.114 Electron/32.2.0 Safari/537.36';
const uaChrome = uaElectron.split(' ').filter((t) => !/^(electron|pdfpro|pdfpro-suite)\/[\d.]+$/i.test(t)).join(' ');
T('v3.2.3: UA de la ventana de login SIN «Electron/…» ni «PDFPro/…» (lógica real)', /electron\/|pdfpro\//i.test(uaChrome), false);
T('v3.2.3: el UA limpio sigue pareciendo Chrome de escritorio', /Chrome\/[\d.]+/.test(uaChrome) && /Mozilla\/5\.0/.test(uaChrome), true);
T('v3.2.3: main.js fija el UA de Chrome en partición y webContents', /particion\.setUserAgent\(uaChrome\)/.test(mainjs) && /webContents\.setUserAgent\(uaChrome\)/.test(mainjs), true);
T('v3.2.3: main.js usa el mismo filtro de tokens que la prueba', mainjs.includes('/^(electron|pdfpro|pdfpro-suite)\\/[\\d.]+$/i'), true);
T('v3.2.3: login compartido — una llamada en curso reutiliza la misma promesa', /if \(_gmailHoraLoginPromesa\) return _gmailHoraLoginPromesa;/.test(mainjs), true);
T('v3.2.3: la ventana de login toma el foco al mostrarse', /_gmailHoraLoginWin\.show\(\); _gmailHoraLoginWin\.focus\(\);/.test(mainjs), true);
T('v3.2.3: manual=true salta el cooldown de 30 s tras login cancelado', /if \(!manual && Date\.now\(\) - _gmailHoraUltimoFalloLogin < 30000\)/.test(mainjs), true);
T('v3.2.3: el IPC reenvía el flag manual', /_gmailHoraBuscar\(String\(archivo \|\| ''\)\.trim\(\), !!manual\)/.test(mainjs), true);
T('v3.2.3: preload reenvía manual al IPC', preloadjs.includes("gmailHoraBuscar: (archivo, manual) => ipcRenderer.invoke('gmail-hora:buscar', archivo, manual)"), true);""")

open('scripts/test_gmail_hora_323.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_323.js generado')
