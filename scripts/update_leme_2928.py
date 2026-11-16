#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.28: nueva
sección de novedades al frente (AYUDA DEL CAMPO MATRÍCULA OCULTA — botones
del sello a la vista) y la 2.9.27 (vuelo con designador) pasa al
historial inmediato."""
import re, io

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    BANNER = txt.split("\n")[0]
    SEP = "─" * len(BANNER)

    NUEVO = f"""{BANNER}
  PDFPro 2.9.28 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.28 (AYUDA DEL CAMPO MATRÍCULA OCULTA — BOTONES A LA VISTA)
{SEP}
  LO PEDIDO POR LA OFICINA: «ocultar el texto "Al cargar el archivo, la
  matrícula se detecta sola (casillero 7 o ítem REG/ del 18)… en la web
  se descarga con ese nombre" — DE ESTA MANERA TENEMOS LOS BOTONES A LA
  VISTA». El bloque de ayuda bajo el campo «Matrícula (Aeronave /
  Espacio)» era tan largo que empujaba los botones del sello (Colocar
  Sello de Recepción, sellos personales) muy abajo en la pestaña.

  LO IMPLEMENTADO:
  · AYUDA CONTRAÍDA TRAS UN ENLACE: el texto largo ya NO se ve; en su
    lugar queda una línea discreta «ⓘ Cómo se rellena este campo y cómo
    se nombra el archivo (designador, formación, archivo automático)».
    Oculta por defecto (ocupa 0px: el botón «Colocar Sello de Recepción»
    queda a la vista, justo bajo la vista previa del sello); un clic la
    despliega y otro clic la vuelve a ocultar.
  · NO SE ELIMINÓ NADA: toda la doctrina sigue disponible con ese clic —
    detección de matrícula (casillero 7 o REG/ del 18), vuelo con
    designador «LPE2273 CCBJE MK», vuelo en formación «FAP123 FAP124»,
    campo de 100 caracteres, archivo automático al sellar y nombre
    MATRÍCULA INICIALES.

VERIFICADO PUNTO A PUNTO (2.9.28):
  · E2E en la app real (9 pasos), con la pestaña de sellos ABIERTA
    (layout real): ayuda oculta por defecto (display:none · 0px de
    alto); botón «Colocar Sello de Recepción» renderizado a 171px bajo
    el campo (antes la ayuda lo empujaba ~200px más abajo); el enlace ⓘ
    despliega la ayuda (264px) y un segundo clic la oculta de nuevo ✓
  · Regresiones del escaneo intactas: designador LPE2273 + REG/CCBJE →
    «LPE2273 CCBJE EV» · nombre «LPE2273 CCBJE EV.pdf» sin duplicar
    iniciales · SPHI-SPST (casillero 7 = matrícula) → «OB1630» ✓

"""

    marca = "  HISTORIAL — versión 2.9.26"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo27 = "\n".join(lineas[4:]).lstrip("\n")
    hist27 = ("  HISTORIAL — versión 2.9.27 (VUELO CON DESIGNADOR: ID DE VUELO + MATRÍCULA + INICIALES)\n"
              + SEP + "\n"
              + cuerpo27)
    out = NUEVO + hist27 + resto
    out = out.replace("pdfpro-fuentes-v2.9.27.zip", "pdfpro-fuentes-v2.9.28.zip")
    out = re.sub(r"PDFPro 2\.9\.27 · © 2026", "PDFPro 2.9.28 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.28 OK,", len(out.split(chr(10))), "líneas")
