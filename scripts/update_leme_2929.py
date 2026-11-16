#!/usr/bin/env python3
"""Actualiza los LEEME (pdfpro-desktop y download) a la v2.9.29: nueva
sección de novedades al frente (AYUDAS DE LA FICHA DEL SELLO OCULTAS —
recepción e iniciales, además de la matrícula de 2.9.28) y la 2.9.28
pasa al historial inmediato."""
import re, io

for ruta in ["/home/z/my-project/pdfpro-desktop/LEEME.txt",
             "/home/z/my-project/download/LEEME.txt"]:
    with io.open(ruta, encoding="utf-8") as f:
        txt = f.read()
    BANNER = txt.split("\n")[0]
    SEP = "─" * len(BANNER)

    NUEVO = f"""{BANNER}
  PDFPro 2.9.29 — Versión de escritorio para Windows
  PDF Editor Pro · CORPAC AIS/ARO SPHI
{BANNER}

NOVEDADES DE LA VERSIÓN 2.9.29 (AYUDAS DE LA FICHA DEL SELLO OCULTAS: RECEPCIÓN + INICIALES)
{SEP}
  LO PEDIDO POR LA OFICINA: ocultar también dos textos de ayuda más de
  la ficha del sello — «Recepción: vacío = fecha/hora actuales. El
  sello colocado es este mismo: recepción + tu sello personal activo.
  Doble clic sobre un sello colocado edita su hora.» y «2 letras:
  inicial del primer nombre + inicial del apellido paterno (ej. Marcos
  Koo → MK). Se rellena sola con el dueño del sello activo. Acepta
  «Nombres y Apellidos» y también «Apellidos, Nombres».» — para dejar
  la ficha compacta y los botones del sello a la vista.

  LO IMPLEMENTADO:
  · Las TRES ayudas de la ficha quedan CONTRAÍDAS tras enlaces «ⓘ»:
    recepción («ⓘ Recepción: vacío = ahora · doble clic edita la hora
    del sello»), iniciales («ⓘ Iniciales: 2 letras (primer nombre +
    apellido paterno)») y, desde 2.9.28, matrícula («ⓘ Cómo se rellena
    este campo y cómo se nombra el archivo…»).
  · Ocultas por defecto (ocupan 0px: los botones del sello quedan a la
    vista); un clic despliega cada una y otro clic la vuelve a ocultar.
    La esencia queda a la vista en el propio enlace, sin abrir nada.
  · NO SE ELIMINÓ NADA: toda la doctrina sigue disponible con ese clic.

VERIFICADO PUNTO A PUNTO (2.9.29):
  · E2E en la app real (9 pasos), con la pestaña de sellos ABIERTA
    (layout real): las 3 ayudas ocultas por defecto (recepción 0px ·
    iniciales 0px · matrícula 0px); botón «Colocar Sello de Recepción»
    renderizado a 171px bajo el campo (antes las 3 ayudas empujaban
    ~300px más abajo); cada «ⓘ» despliega SU ayuda (recepción 44px ·
    iniciales 99px · matrícula 264px) y un segundo clic la oculta ✓
  · Regresiones del escaneo intactas: designador LPE2273 + REG/CCBJE →
    «LPE2273 CCBJE EV» · nombre «LPE2273 CCBJE EV.pdf» sin duplicar
    iniciales · SPHI-SPST (casillero 7 = matrícula) → «OB1630» ✓

"""

    marca = "  HISTORIAL — versión 2.9.27"
    i = txt.index(marca)
    viejo = txt[:i]
    resto = txt[i:]
    lineas = viejo.split("\n")
    cuerpo28 = "\n".join(lineas[4:]).lstrip("\n")
    hist28 = ("  HISTORIAL — versión 2.9.28 (AYUDA DEL CAMPO MATRÍCULA OCULTA: BOTONES DEL SELLO A LA VISTA)\n"
              + SEP + "\n"
              + cuerpo28)
    out = NUEVO + hist28 + resto
    out = out.replace("pdfpro-fuentes-v2.9.28.zip", "pdfpro-fuentes-v2.9.29.zip")
    out = re.sub(r"PDFPro 2\.9\.28 · © 2026", "PDFPro 2.9.29 · © 2026", out)
    with io.open(ruta, "w", encoding="utf-8") as f:
        f.write(out)
    print(ruta, "→ v2.9.29 OK,", len(out.split(chr(10))), "líneas")
