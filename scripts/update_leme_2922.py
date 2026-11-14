#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.22:
nueva sección de novedades al frente, la 2.9.21 pasa al historial."""
import re, io

BANNER = "════════════════════════════════════════════════════════════════════"

NUEVO = f"""{BANNER}
  PDFPro 2.9.22 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.22 (REG sin barra — FPL de operadores estatales)
────────────────────────────────────────────────────────────────────
  Lo que reportaste: «se cargó FAP 001 13-11.pdf; en el casillero 18
  se encuentra la matrícula pero los dígitos están separados y no
  lleva "/", dice REG FAP 329» — es una falla del piloto en la
  presentación de su plan de vuelo.

  EL CONTEXTO DECIDE QUÉ ES LA SIGLA (operadores del Estado peruano;
  en otros países cambia la sigla):
  · Casillero 7, sigla + número  →  NÚMERO DE VUELO (FAP001, INP255…),
    igual que el CMP468 de Copa o el LPE1234 de LATAM Perú.
  · Casillero 18, tras REG  →  MATRÍCULA DE LA AERONAVE (FAP329,
    INP255, PNP042, EP828).
    FAP = Fuerza Aérea del Perú · INP = Instituto Naval del Perú ·
    PNP = Policía Nacional del Perú · EP = Ejército del Perú.

  CORREGIDO — el escáner del casillero 18 ahora tolera la falla del
  piloto:
  1) «REG FAP 329» — SIN barra y con los dígitos separados  →  FAP329.
  2) «REG/ FAP 329» — formato correcto con espacios  →  FAP329.
  3) «REGFAP329» — todo pegado (casillas del formulario)  →  FAP329.
  4) También con guion («REG FAP-329») y los demás operadores:
     «REG INP 255» → INP255 · «REG PNP 042» → PNP042 ·
     «REG EP 828» → EP828 · «REG OB 1630» → OB1630.
  · El aviso lo hace visible para la oficina: «casillero 18 (REG sin
    «/») · vuelo FAP001» — se ve que el piloto omitió la barra.
  · SIN falsos positivos: sin la barra solo se acepta lo que parece
    matrícula (Anexo 7 o sigla de operador + número); «REG ANTERIOR»,
    «REGISTRO», «REG 2026» o «REG HABILITADO» en un remark NO se
    cuelan como matrícula.

VERIFICADO PUNTO A PUNTO (2.9.22):
  · 155 pruebas unitarias del escáner (antes 129): el caso real del
    «FAP 001 13-11.pdf» (FAP001 + «REG FAP 329» → FAP329 con vuelo
    FAP001), los 4 operadores estatales, con guion, pegado, dígitos
    en casillas sueltas y los negativos (REGISTRO, ANTERIOR, 2026,
    HABILITADO no cuelan) ✓
  · Réplica fiel del formulario FAP en PDF (FAP001 en las casillas
    del casillero 7 y «REG FAP 329» en el 18, verificada con el mismo
    pdf.js de la app): matrícula FAP329, vuelo FAP001, aviso con
    «REG sin «/»» — 7/7 PDFs de verificación ✓
  · E2E en la app real (9/9): carga del formulario FAP → campo
    FAP329, iniciales EV, aviso «casillero 18 (REG sin «/») · vuelo
    FAP001», y el FAP001 NO se cuela en el campo; nombre de archivo
    de registro «FAP329 EV.pdf» ✓
  · Regresiones intactas: CM468 real → HP1520 · vuelo CMP468 ·
    SPHI-SPST → OB1630 del casillero 7 · télex FAP211 + REG/OB1630
    → OB1630 · formulario OB-2147 → OB2147 · oficio → campo limpio ✓
  · Smoke de la app de escritorio empaquetada: appVersion 2.9.22,
    escáner OACI con el caso FAP, archivado real en REGISTROS FPL
    NOTAM con la fecha UTC ✓

"""

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    marca = "  HISTORIAL — versión 2.9.20"
    i = txt.index(marca)
    viejo = txt[:i]                     # banner 2.9.21 + novedades + verificado 2.9.21
    resto = txt[i:]                     # historial 2.9.20 en adelante
    # cuerpo 2.9.21 sin el banner inicial (4 primeras líneas)
    lineas = viejo.split("\n")
    cuerpo21 = "\n".join(lineas[4:]).lstrip("\n")
    hist21 = ("  HISTORIAL — versión 2.9.21 (matrícula del casillero 7 primero)\n"
              "────────────────────────────────────────────────────────────────────\n"
              + cuerpo21)
    out = NUEVO + hist21 + resto
    # download: referencias al ZIP de fuentes al día
    out = out.replace("pdfpro-fuentes-v2.9.8.zip", "pdfpro-fuentes-v2.9.22.zip")
    out = re.sub(r"PDFPro 2\.9\.8 · © 2026", "PDFPro 2.9.22 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.22 OK,", len(out.split(chr(10))), "líneas")
