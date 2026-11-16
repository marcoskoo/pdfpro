#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.26: nueva
sección de novedades al frente, la 2.9.25 (vuelo en formación) entra como
historial inmediato y la 2.9.24 baja en la pila. La v2.9.25 no llegó a
publicarse nunca (el sandbox se recicló antes del push), así que sus
novedades van también en la sección 2.9.26 como «ADEMÁS»."""
import re, io

BANNER = "════════════════════════════════════════════════════════════════════"

NUEVO = f"""{BANNER}
  PDFPro 2.9.26 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.26 (ARCHIVO AUTOMÁTICO AL SELLAR)
────────────────────────────────────────────────────────────────────
  LO PEDIDO POR LA OFICINA: «guardar los archivos ya sellados de manera
  automática en C:\\Users\\aissphi\\Desktop\\REGISTROS FPL NOTAM\\FPL» —
  en la carpeta FPL están las carpetas por meses y dentro de cada mes los
  días; el archivo YA CON EL SELLO (recepción + personal) debe guardarse
  en el día/mes/año que le corresponda y, al iniciar un nuevo día, el
  sistema debe crear la nueva carpeta.

  LO IMPLEMENTADO:
  · ARCHIVO AUTOMÁTICO AL SELLAR: colocado el sello de la ficha
    (recepción + personal) con un clic sobre el documento, este YA
    SELLADO se guarda SOLO en el registro del día — sin tocar «Guardar»:
    el PDF se exporta con el sello vectorial, el Word/Excel con el sello
    incrustado en su formato original, la imagen como hoja A4. Si se
    corrige la hora del sello (doble clic), se re-archiva con la hora
    corregida. El guardado manual sigue existiendo y crea su copia
    «(2)», «(3)»…
  · RUTA EXACTA DEL ESCRITORIO LOCAL: C:\\Users\\<usuario>\\Desktop\\
    REGISTROS FPL NOTAM\\FPL\\<año>\\<MM Mes>\\<DD>. Antes se usaba el
    «escritorio» de Windows, que en muchos equipos viene REDIRIGIDO a
    OneDrive y el registro quedaba en otra carpeta; ahora se usa el
    escritorio REAL del perfil, con respaldo en el del sistema si el
    local falla.
  · CARPETA DEL NUEVO DÍA: se crea al arrancar la app, al archivar cada
    archivo y — NUEVO — al cambiar la fecha UTC (hora zulú) con la app
    abierta: un temporizador mira cada minuto la fecha zulú y crea la
    carpeta año\\mes\\día que corresponda al nuevo día, aunque no se
    guarde nada en ese momento.
  · ADEMÁS — TODO LO DE LA 2.9.25 (vuelo en formación), que esta versión
    lleva incorporado: la formación «GUÍA + 1» del casillero 7, el nº de
    aeronaves del casillero 9 y las MATRÍCULAS DE TODAS del casillero 18
    («REG/FAP123 FAP124» → el campo sale «FAP123 FAP124»), también sin
    barra, pegadas del OCR de la foto («REGIFAP123», la barra leída como
    «I») o directo sin ítem REG/; el campo ampliado a 100 caracteres para
    el ingreso manual; y el aviso «⚠ leídas 1 de 2 matrículas —
    complétalas a mano» cuando el OCR de la foto no completa la formación.

VERIFICADO PUNTO A PUNTO (2.9.26):
  · 240 pruebas unitarias del escáner (antes 205): toda la doctrina OACI
    anterior + formación con «GUIA + 1», «BAZUCA+2», «NORTON+3», REG/
    multi (con barra, sin barra, con guion, pegado del OCR, casillas
    extremas, barra→«I» del OCR), casillero 18 directo sin REG/,
    duplicados, palabra tras la matrícula no cuela, la ETIQUETA «NÚMERO
    18.» rechazada como nº de aeronaves, geometría del «+» (con y sin
    etiquetas «8.REGLAS…» fusionadas por pdf.js), formación sin
    matrículas → null + aviso ✓
  · 9/9 PDFs con el mismo pdf.js de la app (impreso de formación «AVISPA
    + 1» → «FAP123 FAP124») ✓
  · E2E en la app real CON OCR TESSERACT DE VERDAD: FOTO del formulario
    de formación → campo «FAP123 FAP124» con aviso «VUELO EN FORMACIÓN
    «AVISPA + 1» · 02 aeronaves»; el sello de la ficha se coloca con un
    clic y el enganche del auto-archivo es inofensivo en la web; ingreso
    manual de 90 caracteres (13 matrículas) verificado ✓
  · Smoke de la app de escritorio (Electron real en pantalla virtual):
    appVersion 2.9.26, escáner de formación (fplScanFormacion) y cadena
    del auto-archivo (fplAutoArchivo: función + guardado nativo +
    exportación + campo de 100), archivado real con la fecha UTC ✓
  · Regresiones intactas: FAP001 foto (OCR) → «FAP001 - FAP329» ·
    EP001/FAP001 nativos · CM468 → HP1520 sin marca · SPHI-SPST →
    OB1630 · télex FAP211 → OB1630 · oficio → campo limpio ✓

"""

HIST25 = """  HISTORIAL — versión 2.9.25 (VUELO EN FORMACIÓN — «GUÍA + 1», incorporada en 2.9.26)
────────────────────────────────────────────────────────────────────
  La presentación de los vuelos en formación es «GUÍA + 1»: el casillero
  7 trae el CALLSIGN con el número de aeronaves que la siguen (el
  callsign varía en nombre y número: AVISPA+1, AVISPA, BAZUCA+2,
  NORTON+3…), el casillero 9 «NÚMERO» el total de aeronaves (02) y el
  casillero 18 las MATRÍCULAS DE TODAS («FAP123 FAP124»). El campo
  «Matrícula (Aeronave / Espacio)» las recibe TODAS separadas por
  espacio; el OCR de las fotos tiene límites (la barra del «REG/» se lee
  como «I», el 0 como «O», las casillas quedan PEGADAS) y todos esos
  casos se toleran; el campo admite 100 caracteres para completar a mano
  las que falten, con su aviso «⚠ leídas 1 de 2».

"""

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    marca = "  HISTORIAL — versión 2.9.23"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo24 = "\n".join(lineas[4:]).lstrip("\n")
    hist24 = ("  HISTORIAL — versión 2.9.24 (FPL FOTOGRAFIADO/ESCANEADO: el caso FAP001 real)\n"
              "────────────────────────────────────────────────────────────────────\n"
              + cuerpo24)
    out = NUEVO + HIST25 + hist24 + resto
    out = out.replace("pdfpro-fuentes-v2.9.24.zip", "pdfpro-fuentes-v2.9.26.zip")
    out = re.sub(r"PDFPro 2\.9\.24 · © 2026", "PDFPro 2.9.26 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.26 OK,", len(out.split(chr(10))), "líneas")
