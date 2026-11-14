#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.23:
nueva sección de novedades al frente, la 2.9.22 pasa al historial."""
import re, io

BANNER = "════════════════════════════════════════════════════════════════════"

NUEVO = f"""{BANNER}
  PDFPro 2.9.23 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.23 (vuelo del JEFE DE ESTADO: «EP001 - EP246»)
────────────────────────────────────────────────────────────────────
  Lo que pediste: «cuando se trate del FAP001/EP001/PNP001/INP001 quiere
  decir que en ese vuelo transporta al JEFE DE ESTADO, por lo cual deberás
  tomar la matrícula + FAP001... por ejemplo, presentan plan de vuelo
  EP001, cuya matrícula es EP246; en el casillero de la app PDFPro
  colocar EP001 - EP246».

  LA REGLA: la sigla del operador estatal + «001» en el casillero 7
  (FAP001, EP001, PNP001, INP001) identifica el vuelo que transporta
  al Jefe de Estado → el casillero «Matrícula (Aeronave / Espacio)»
  lleva VUELO - MATRÍCULA:
  · Plan EP001 cuya aeronave es EP246   →   «EP001 - EP246»
  · El «FAP 001 13-11.pdf» (REG FAP 329 sin barra)   →   «FAP001 - FAP329»
  · El aviso lo marca: «casillero 18 (REG/) · vuelo EP001 · JEFE DE
    ESTADO», y el archivo de registro sale «EP001 - EP246 EV.pdf».
  · SOLO el «001»: FAP002 o cualquier otro número es un vuelo
    ordinario → el campo lleva solo la matrícula (FAP329). Los vuelos
    comerciales (LPE001, CMP001) tampoco combinan.
  · EP001 sin REG conocido → el campo queda con el vuelo (EP001) y el
    aviso igual marca JEFE DE ESTADO para que la oficina complete la
    matrícula a mano.

VERIFICADO PUNTO A PUNTO (2.9.23):
  · 171 pruebas unitarias del escáner (antes 155): el ejemplo EP001 +
    EP246 → «EP001 - EP246», los 4 operadores (FAP/INP/PNP/EP), vuelo
    presidencial con aeronave civil (EP001 - OB1630) y los negativos:
    FAP002, EP01, LPE001 y CMP001 NO combinan ✓
  · 8/8 PDFs de verificación con el mismo pdf.js de la app, incluida
    una réplica fiel del plan EP001 (casillas del 7 + REG/EP246) y el
    FAP real: «EP001 - EP246» y «FAP001 - FAP329», ambos con el aviso
    «· JEFE DE ESTADO» ✓
  · E2E en la app real (10/10): campo «EP001 - EP246», iniciales EV,
    aviso «casillero 18 (REG/) · vuelo EP001 · JEFE DE ESTADO», nombre
    de registro «EP001 - EP246 EV.pdf»; y el FAP001 con «REG FAP 329»
    sin barra → «FAP001 - FAP329» ✓
  · Regresiones intactas: CM468 → HP1520 (sin marca presidencial) ·
    SPHI-SPST → OB1630 del casillero 7 · télex FAP211 + REG/OB1630 →
    OB1630 (vuelo ordinario) · formulario OB-2147 → OB2147 · oficio →
    campo limpio ✓
  · Smoke de la app de escritorio (Electron real en pantalla virtual):
    appVersion 2.9.23, escáner OACI con los casos FAP/EP, archivado
    real en REGISTROS FPL NOTAM con la fecha UTC ✓

"""

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    marca = "  HISTORIAL — versión 2.9.21"
    i = txt.index(marca)
    viejo = txt[:i]                     # banner 2.9.22 + novedades + verificado 2.9.22
    resto = txt[i:]                     # historial 2.9.21 en adelante
    # cuerpo 2.9.22 sin el banner inicial (4 primeras líneas)
    lineas = viejo.split("\n")
    cuerpo22 = "\n".join(lineas[4:]).lstrip("\n")
    hist22 = ("  HISTORIAL — versión 2.9.22 (REG sin barra: FPL de operadores estatales)\n"
              "────────────────────────────────────────────────────────────────────\n"
              + cuerpo22)
    out = NUEVO + hist22 + resto
    # download: referencias al ZIP de fuentes al día
    out = out.replace("pdfpro-fuentes-v2.9.22.zip", "pdfpro-fuentes-v2.9.23.zip")
    out = re.sub(r"PDFPro 2\.9\.22 · © 2026", "PDFPro 2.9.23 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.23 OK,", len(out.split(chr(10))), "líneas")
