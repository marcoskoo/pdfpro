#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.30: nuevas
secciones de novedades al frente (REGLA MATRÍCULA SIEMPRE + ENVÍO POR
GMAIL) y la 2.9.29 pasa al historial inmediato."""
import re, io

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    BANNER = txt.split("\n")[0]
    SEP = "─" * len(BANNER)

    NUEVO = f"""{BANNER}
  PDFPro 2.9.30 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.30 (1) MATRÍCULA «SIEMPRE» DEL REG/ DEL 18 · (2) ENVÍO POR GMAIL
{SEP}
  1) MATRÍCULA — SIEMPRE QUE EL CASILLERO 7 NO TRAIGA LA MATRÍCULA
  (petición de la oficina, ejemplo: casillero 7 «JAP7261», casillero 18
  «REG/CCDII»): la casilla «Matrícula (Aeronave / Espacio)» lleva
  ID DE VUELO + MATRÍCULA (+ iniciales del operador del sello activo):
  «JAP7261 CCDII EV» — y así se nombra el archivo del registro
  (JAP7261 CCDII EV.pdf).
  · El marcador Doc 4444 de que el 7 NO trae la matrícula es el ítem
    REG/ del casillero 18 con un valor DISTINTO: ahora el escáner lo
    consulta ANTES de aceptar el 7. Antes, un callsign que SOLO SE
    PARECÍA a una matrícula (prefijo de 2 letras: HC…, PT…, XA…, LV…)
    pasaba por matrícula y el REG/ quedaba ignorado.
  · Se mantiene TODO lo anterior: matrícula del 7 cuando NO hay REG/
    (OB1630) · designador de empresa (LPE2273 CCBJE · CMP468 HP1520) ·
    REG/ redundante que repite el 7 (OB1630 + REG/OB1630 → OB1630) ·
    Jefe de Estado (FAP001 - FAP329) · vuelo en formación (todas las
    matrículas) · «REG FAP 329» sin barra.

  2) ENVÍO POR GMAIL — OAuth CON EL CLIENTE NUEVO DE LA OFICINA
  · BOTÓN ✉️ GMAIL en la barra superior, en la barra lateral, en la
    pestaña de sellos y en el móvil: diálogo con Para / Asunto / Mensaje
    ya pre-llenados (asunto «FPL JAP7261 CCDII EV») que envía el PDF
    SELLADO como adjunto, nombrado como el registro (JAP7261 CCDII EV.pdf).
  · OAUTH SIN SECRETO EN EL CLIENTE: la autorización se pide en el
    navegador con Google Identity Services (GIS) — ventana segura de
    Google, permiso https://mail.google.com/. El SECRETO del cliente NO
    se usa ni se publica: queda guardado SOLO en el .env local de la
    máquina de desarrollo (el repositorio es público; verificado: cero
    apariciones del secreto en el código).
  · ENVÍO POR LA API DE GMAIL: mensaje MIME RFC 2822 (texto UTF-8 en
    base64 + PDF adjunto en base64) enviado a
    gmail.googleapis.com/users/me/messages/send con el token de acceso.
  · TARJETA «CORREO GMAIL» en el panel administrativo (junto a Drive):
    estado de la conexión, conectar/desconectar y el recordatorio de
    usuarios de prueba.
  · ESCRITORIO: Google bloquea su ventana de OAuth dentro de la app de
    escritorio; el botón muestra el aviso y abre la versión web
    (firma-aissphi.vercel.app) en el navegador del sistema.
  · REFACTOR: el generador del PDF anotado quedó en
    buildAnnotatedPdfBlob(), compartido por Drive (subir) y Gmail
    (adjuntar) — mismo PDF sellado, un solo código.

  HAY QUE COMPLETAR EN GOOGLE CLOUD CONSOLE (no se puede desde aquí):
  · Cliente OAuth → «Orígenes de JavaScript autorizados»: agregar
    https://firma-aissphi.vercel.app (producción). Opcional para pruebas
    locales: http://localhost:3000
  · Pantalla de consentimiento → «Usuarios de prueba»: agregar las
    cuentas @gmail.com que podrán conectar (p. ej. sphiaisaro@gmail.com).
    Mientras la app esté en modo «Prueba», SOLO esas cuentas funcionan.

VERIFICADO PUNTO A PUNTO (2.9.30):
  · Escáner (Node, 9 casos): JAP7261+REG/CCDII → CCDII · hueco corregido
    PTZULU+REG/CCDII (parecía matrícula) → CCDII · LPE2273 → CCBJE ·
    OB1630 sin REG/ → OB1630 · OB1630 con REG/ redundante → OB1630 ·
    CMP468 → HP1520 · FAP001 «REG FAP 329» → FAP001 - FAP329 ·
    formación → FAP123 FAP124 · ARG1234 sin REG/ → ARG1234 ✓
  · E2E EN LA APP REAL (16 pasos): formulario PDF con JAP7261 en las
    casillas del 7 y REG/CCDII en el 18 → campo «JAP7261 CCDII EV» ·
    registro «JAP7261 CCDII EV.pdf» · Google Identity Services cargado ·
    4 botones Gmail · diálogo pre-llenado «FPL JAP7261 CCDII EV» · sin
    destinatario NO llama a la API · MIME decodificado y validado ·
    envío simulado con token de prueba (API de Gmail, Bearer, {{raw}} de
    499 138 chars, modal cerrado) · buildAnnotatedPdfBlob genera el PDF
    sellado (273 110 bytes) · regresiones: LPE2273 CCBJE EV · OB1630
    (iniciales al nombre del archivo: OB1630 EV.pdf) · CMP468 HP1520 EV
    · formación FAP123 FAP124 · FAP001 - FAP329 · las 3 ayudas de la
    ficha siguen ocultas ✓
  · El consentimiento real de Google (login humano) no es automatizable:
    probarlo desde la web con una cuenta de prueba tras completar los
    dos puntos de Google Cloud Console de arriba.

"""

    marca = "  HISTORIAL — versión 2.9.28"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo29 = "\n".join(lineas[4:]).lstrip("\n")
    hist29 = ("  HISTORIAL — versión 2.9.29 (AYUDAS DE LA FICHA DEL SELLO OCULTAS: RECEPCIÓN + INICIALES)\n"
              + SEP + "\n"
              + cuerpo29)
    out = NUEVO + hist29 + resto
    out = out.replace("pdfpro-fuentes-v2.9.29.zip", "pdfpro-fuentes-v2.9.30.zip")
    out = re.sub(r"PDFPro 2\.9\.29 · © 2026", "PDFPro 2.9.30 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.30 OK,", len(out.split(chr(10))), "líneas")
