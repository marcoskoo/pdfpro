#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.24:
nueva sección de novedades al frente, la 2.9.23 pasa al historial."""
import re, io

BANNER = "════════════════════════════════════════════════════════════════════"

NUEVO = f"""{BANNER}
  PDFPro 2.9.24 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.24 (FPL FOTOGRAFIADO/ESCANEADO — el caso FAP001 real)
────────────────────────────────────────────────────────────────────
  LO REPORTADO: «cargué el FPL FAP001, matrícula FAP329, en el casillero
  de la app solo se observa FAP329; al guardar se guarda como
  FAP329 MK.pdf». El «FAP 001 13-11.pdf» es una FOTO/escaneo del
  formulario (sin capa de texto): la app lo lee con el OCR (Tesseract),
  que entiende la línea «REG FAP 329» pero NO las casillas encajonadas
  del casillero 7 («F A P 0 0 1») — los recuadros lo confunden y el nº
  de vuelo se pierde. Sin vuelo no hay combinación «FAP001 - FAP329».

  LO CORREGIDO (tres vías, en orden):
  · TEXTO OCR LEGIBLE: si el OCR sí lee las casillas — con espacios
    («F A P 0 0 1 I S») o con el ruido de los recuadros («F|A|P|0|0|1»,
    «F]A]P-0.0.1») — el vuelo presidencial (sigla estatal + «001») se
    rescata del texto aunque la etiqueta del casillero 7 no sirva de
    ancla (entre ella y las casillas están «FLIGHT RULES»/«REGLAS DE
    VUELO» de la misma fila).
  · CASILLAS 8/9 PEGADAS: si al nº de vuelo se le pegan las casillas de
    reglas/tipo («EP001IG» = EP001 + I + G), se recorta al vuelo.
  · NOMBRE DEL ARCHIVO (el respaldo del caso real): la oficina nombra
    los FPL con el vuelo — «FAP 001 13-11.pdf». Si el OCR no pudo leer
    el vuelo y el REG entregó la matrícula estatal (FAP329), el vuelo
    se toma del nombre del archivo cuando trae la sigla + «001»: el
    campo sale «FAP001 - FAP329», el aviso «casillero 18 (REG sin «/») ·
    vuelo FAP001 (nombre del archivo) · JEFE DE ESTADO» y el archivo se
    guarda «FAP001 - FAP329 MK.pdf». SOLO el «001» y solo si la sigla
    del archivo coincide con la de la matrícula.

  ADEMÁS — protocolo app:// SIN caché: tras una auto-actualización
  Chromium podía servir un JavaScript viejo cacheado mezclado con el
  HTML nuevo; ahora cada recurso se revalida (archivos locales, carga
  instantánea).

VERIFICADO PUNTO A PUNTO (2.9.24):
  · 195 pruebas unitarias del escáner (antes 171): foto/OCR con
    casillas espaciadas y encajonadas, las 4 siglas, «EP001IG»
    recortado, negativos (FAP002, EP01, LPE001/CMP001, «REGFAP329» no
    dispara, GA fotografiada sin REG sigue vacía) ✓
  · 8/8 PDFs con el mismo pdf.js de la app ✓
  · E2E en la app real (10/10) CON OCR TESSERACT DE VERDAD: se generó
    una FOTO del formulario FAP001 (PDF de solo imagen), la app la
    cargó, corrió el OCR y el campo salió «FAP001 - FAP329» con el
    aviso «· JEFE DE ESTADO»; el nombre de registro «FAP001 - FAP329
    EV.pdf» ✓
  · Regresiones intactas: FAP001/EP001 nativos (geometría) →
    «FAP001 - FAP329» / «EP001 - EP246» · CM468 → HP1520 sin marca ·
    SPHI-SPST → OB1630 · télex FAP211 → OB1630 · oficio → campo limpio ✓
  · Smoke de la app de escritorio (Electron real en pantalla virtual):
    appVersion 2.9.24, escáner OACI con los casos FAP/EP y foto/OCR,
    archivado real con la fecha UTC ✓
  · El OCR de la FOTO REAL de un FPL de la oficina (formulario N383AA
    fotografiado por WhatsApp) se usó como referencia del ruido que
    produce Tesseract en las casillas encajonadas ✓

"""

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    marca = "  HISTORIAL — versión 2.9.21"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo23 = "\n".join(lineas[4:]).lstrip("\n")
    hist23 = ("  HISTORIAL — versión 2.9.23 (vuelo del JEFE DE ESTADO: «EP001 - EP246»)\n"
              "────────────────────────────────────────────────────────────────────\n"
              + cuerpo23)
    out = NUEVO + hist23 + resto
    out = out.replace("pdfpro-fuentes-v2.9.23.zip", "pdfpro-fuentes-v2.9.24.zip")
    out = re.sub(r"PDFPro 2\.9\.23 · © 2026", "PDFPro 2.9.24 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.24 OK,", len(out.split(chr(10))), "líneas")
