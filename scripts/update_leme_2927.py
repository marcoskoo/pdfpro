#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.27: nueva
sección de novedades al frente (VUELO CON DESIGNADOR — ID de vuelo +
matrícula + iniciales del operador) y la 2.9.26 (archivo automático al
sellar) pasa al historial inmediato."""
import re, io

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    BANNER = txt.split("\n")[0]
    SEP = "─" * len(BANNER)

    NUEVO = f"""{BANNER}
  PDFPro 2.9.27 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.27 (VUELO CON DESIGNADOR: ID DE VUELO + MATRÍCULA + INICIALES)
{SEP}
  LO PEDIDO POR LA OFICINA: «que cuando la identificación del vuelo no
  sea la matrícula, entonces tomar identificación del vuelo y matrícula,
  por ejemplo CASILLERO 7 (LPE2273), CASILLERO 18 (REG/CCBJE); entonces
  en "Matrícula (Aeronave / Espacio)" de la app debe ser LPE2273 CCBJE
  MK (identificación del vuelo / espacio en blanco / matrícula de la
  aeronave / espacio en blanco / iniciales del operador)».

  LO IMPLEMENTADO:
  · VUELO CON DESIGNADOR: cuando la IDENTIFICACIÓN DEL VUELO del
    casillero 7 NO es la matrícula — designador OACI de la empresa
    (Doc 8585) + nº de vuelo: «LPE2273» (LATAM Perú 2273) — y el
    casillero 18 trae el ítem REG/ con la matrícula real («CCBJE»), el
    campo «Matrícula (Aeronave / Espacio)» sale armado solo:
    «LPE2273 CCBJE MK» — ID DE VUELO + MATRÍCULA + INICIALES DEL
    OPERADOR (las 2 letras del dueño del sello activo, las mismas de
    siempre). Vale para cualquier designador: CMP468 + REG/HP1520 →
    «CMP468 HP1520 MK» · FAP211 + REG/OB1630 → «FAP211 OB1630 MK».
  · EL ARCHIVO DEL REGISTRO SE NOMBRA IGUAL: «LPE2273 CCBJE MK.pdf».
    El nombre ya agregaba las iniciales al final; ahora, si el campo ya
    las trae, NO las duplica — y si quedaron iniciales de OTRO sello
    (porque se cambió de sello después del escaneo), pone las vigentes
    del sello activo.
  · DOCTRINA INTACTA: si el casillero 7 YA trae la matrícula (OB1630),
    el campo sigue saliendo solo «OB1630»; el vuelo del JEFE DE ESTADO
    conserva su formato «EP001 - EP246»; y el VUELO EN FORMACIÓN sigue
    llevando SOLO las matrículas («FAP123 FAP124»).

VERIFICADO PUNTO A PUNTO (2.9.27):
  · E2E en la app real (13 pasos): FPL de línea aérea con casillas por
    carácter (LPE2273 + REG/CCBJE) → «LPE2273 CCBJE EV»; mensaje télex
    (FPL-LPE2273 … -18/REG/CCBJE) → «LPE2273 CCBJE EV»; nombre del
    registro «LPE2273 CCBJE EV.pdf» SIN duplicar las iniciales;
    iniciales viejas dejadas en el campo autocorregidas a las del
    sello activo ✓
  · Regresiones intactas: OB1630 del casillero 7 → «OB1630» · JEFE DE
    ESTADO → «EP001 - EP246» · formación «AVISPA + 1» → «FAP123
    FAP124» · télex FAP211 → «FAP211 OB1630 EV» (misma regla nueva) ·
    CM468 + REG/HP1520 → «CMP468 HP1520 EV» (misma regla nueva) · FOTO
    FAP001 con OCR Tesseract real → «FAP001 - FAP329» · oficio → campo
    limpio ✓

"""

    marca = "  HISTORIAL — versión 2.9.25"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo26 = "\n".join(lineas[4:]).lstrip("\n")
    hist26 = ("  HISTORIAL — versión 2.9.26 (ARCHIVO AUTOMÁTICO AL SELLAR + VUELO EN FORMACIÓN)\n"
              + SEP + "\n"
              + cuerpo26)
    out = NUEVO + hist26 + resto
    out = out.replace("pdfpro-fuentes-v2.9.26.zip", "pdfpro-fuentes-v2.9.27.zip")
    out = re.sub(r"PDFPro 2\.9\.26 · © 2026", "PDFPro 2.9.27 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.27 OK,", len(out.split(chr(10))), "líneas")
