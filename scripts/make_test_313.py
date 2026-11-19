# Genera scripts/test_gmail_hora_3213.js a partir del de v3.2.12:
# v3.2.13 — captura de la hora: NAVEGADOR GARANTIZADO. Los navegadores de
# ms-playwright no van dentro del instalador; si faltan o no coinciden con
# la revisión del paquete, chromium.launch() fallaba con «Executable
# doesn't exist», el main lo tragaba como «aviso» y la captura moría sin
# explicación. Ahora: iniciar() encadena 4 intentos (ruta manual → Chrome
# del sistema → Edge del sistema → Chromium empaquetado), el fallo se
# devuelve como NavegadorFalta y el renderer avisa con la causa real y la
# alternativa por Google (OAuth, sin navegador). 298 de regresión + 4 = 302.
import sys

src = open('scripts/test_gmail_hora_3212.js', encoding='utf-8').read()
out = src

def rep(old, new, n=1):
    global out
    if out.count(old) != n:
        sys.exit(f'✗ parche no aplica ({out.count(old)} veces): {old[:70]!r}')
    out = out.replace(old, new)

# 1) cabecera
rep("""/* Pruebas v3.2.12 — panel «📧 Monitoreo Gmail» RESTAURADO (pedido del
   usuario: «se ha perdido funciones»). En v3.2.9 se retiró el HTML del
   panel (título, estado, Conectar Gmail/Desconectar, Barrer ahora,
   lista de correos) y sus funciones quedaron inalcanzables — sin ese
   panel no había forma de ver el estado ni conectar Gmail a mano.
   Se restauran los elementos SIN duplicar la caja del código OAuth ni
   el botón «🔗 Iniciar sesión» (v3.2.9/v3.2.10), y se conservan todas
   las correcciones de captura v3.2.10/v3.2.11.
   Incluye la regresión completa v3.2.11 (293 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3212.js */""",
    """/* Pruebas v3.2.13 — captura de la hora: NAVEGADOR GARANTIZADO. Los
   navegadores de ms-playwright NO van dentro del instalador; si en la
   máquina faltan o su revisión no coincide con la del paquete,
   chromium.launch() fallaba («Executable doesn't exist»), el main SE
   TRAGABA ese fallo como «aviso» y la captura moría sin explicación —
   la causa real de «no se da la captura». Ahora iniciar() encadena 4
   intentos (PDFPRO_GMAIL_CHROMIUM → Chrome del sistema → Edge del
   sistema → Chromium empaquetado), el fallo se devuelve como
   NavegadorFalta con la causa real y el renderer avisa ofreciendo
   «Conectar Gmail» (Google/OAuth busca sin navegador). La cadena se
   verificó de verdad contra gmail.com (scripts/test_servicio_real_3213.js).
   Incluye la regresión completa v3.2.12 (298 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3213.js */""")

# 2) banner
rep(r"""T('banner v3.2.12', /CORPAC AIS\/ARO Platform v3\.2\.12/.test(html), true);""",
    r"""T('banner v3.2.13', /CORPAC AIS\/ARO Platform v3\.2\.13/.test(html), true);""")

# 3) sección nueva antes del resumen final
rep("""  console.log('\\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""",
    r"""  /* ════ v3.2.13 — navegador garantizado para la búsqueda ════ */
  console.log('── v3.2.13: el navegador siempre disponible ──');
  T('iniciar(): cadena de 4 intentos — ruta manual, Chrome del sistema, Edge del sistema y Chromium empaquetado', (function () { var i = svcjs.indexOf('async iniciar()'); var s = svcjs.slice(i, i + 2600); return s.includes("process.env.PDFPRO_GMAIL_CHROMIUM") && s.includes("channel: 'chrome'") && s.includes("channel: 'msedge'") && /Chromium empaquetado de Playwright/.test(s); })(), true);
  T('iniciar(): cada intento fallido se informa (onProgress «Navegador no disponible: …») y se prueba el siguiente', svcjs.includes("Navegador no disponible: ' + intento.etiqueta"), true);
  T('iniciar(): si TODOS fallan, error descriptivo «Ningún navegador disponible» (nada se traga)', svcjs.includes('Ningún navegador disponible para buscar en Gmail'), true);
  T('main: iniciar() fallido → {tipo:\'NavegadorFalta\'} con la causa real (antes se tragaba como «aviso»)', mainjs.includes("tipo: 'NavegadorFalta'") && !mainjs.includes('aviso al iniciar navegador'), true);
  T('renderer: rama NavegadorFalta — aviso con la causa y alternativa «Conectar Gmail» sin navegador', (function () { var i = html.indexOf("r.tipo==='NavegadorFalta'"); var s = html.slice(i, i + 400); return i >= 0 && s.includes('Conectar Gmail') && s.includes('sin navegador'); })(), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));""")

open('scripts/test_gmail_hora_3213.js', 'w', encoding='utf-8').write(out)
print('✓ scripts/test_gmail_hora_3213.js generado')
