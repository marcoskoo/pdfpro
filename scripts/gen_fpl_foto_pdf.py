#!/usr/bin/env python3
"""Fixtures FOTO (PDF de SOLO IMAGEN, sin capa de texto) para el E2E con el
OCR real de Tesseract — la oficina recibe los FPL FOTOGRAFIADOS (estilo
WhatsApp), la app los carga y el OCR lee casilla por casilla.

  tmp_e2e_fpl_foto_fap001.pdf (v2.9.24) — el caso real reportado: «cargué el
    FPL FAP001, matrícula FAP329, en el casillero solo se observa FAP329».
    El OCR lee «F A P 0 0 1 I S» + «REG FAP 329» sin barra en el 18; la
    etiqueta del casillero 7 no sirve de ancla (entre ella y las casillas
    están «FLIGHT RULES»/«REGLAS DE VUELO»). El campo debe salir
    «FAP001 - FAP329» (vuelo del JEFE DE ESTADO + matrícula del REG).

  tmp_e2e_fpl_foto_formacion.pdf (v2.9.25) — VUELO EN FORMACIÓN «GUÍA + 1»:
    casillero 7 con el callsign («AVISPA» y su «+ 1»), casillero 9 con el
    NÚMERO de aeronaves (02) y casillero 18 con las MATRÍCULAS DE TODAS
    («REG/FAP123 FAP124»). El campo debe salir «FAP123 FAP124» — TODAS las
    matrículas, como pide la oficina; y como el OCR de las fotos tiene
    límites, el campo admite 100 caracteres para el ingreso manual."""
from PIL import Image, ImageDraw, ImageFont

W, H = 2480, 3508  # A4 @ 300 dpi
FUENTE = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FUENTE_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def f(ruta, tam):
    return ImageFont.truetype(ruta, tam)


def dibuja_fap001(d):
    """El FAP001 real — réplica EXACTA del fixture v2.9.24 (no tocar)."""

    def texto(x, y, s, font, fill="black"):
        d.text((x, y), s, font=font, fill=fill)

    def casillas(x, y, chars, caja=110, paso=130, tam=72, font=None):
        font = font or f(FUENTE_B, tam)
        for i, ch in enumerate(chars):
            cx = x + i * paso
            d.rectangle([cx, y, cx + caja, y + caja], outline="black", width=3)
            bb = d.textbbox((0, 0), ch, font=font)
            texto(cx + (caja - (bb[2] - bb[0])) / 2 - bb[0],
                  y + (caja - (bb[3] - bb[1])) / 2 - bb[1], ch, font)

    texto(W / 2 - 330, 120, "PLAN DE VUELO", f(FUENTE_B, 64))
    texto(W / 2 + 90, 130, "FLIGHT PLAN", f(FUENTE_B, 52))
    d.line([150, 230, W - 150, 230], fill="black", width=4)
    texto(150, 270, "3. TIPO DE MENSAJE / MESSAGE TYPE", f(FUENTE, 34))
    d.rectangle([150, 330, 260, 430], outline="black", width=3)
    texto(170, 350, "X", f(FUENTE_B, 52))
    texto(290, 350, "(FPL)", f(FUENTE, 40))
    texto(150, 490, "7. IDENTIFICACION DE AERONAVE", f(FUENTE, 34))
    texto(150, 530, "AIRCRAFT IDENT", f(FUENTE, 30))
    texto(1250, 490, "8. REGLAS DE VUELO", f(FUENTE, 34))
    texto(1250, 530, "FLIGHT RULES", f(FUENTE, 30))
    texto(1700, 490, "TIPO DE VUELO", f(FUENTE, 34))
    texto(1700, 530, "TYPE OF FLIGHT", f(FUENTE, 30))
    casillas(150, 590, "FAP001")
    casillas(1250, 590, "I")
    casillas(1700, 590, "S")
    texto(150, 790, "9. NUMERO / NUMBER", f(FUENTE, 34))
    casillas(150, 850, "106")
    texto(150, 1050, "13. AERODROMO DE SALIDA / DEPARTURE AERODROME", f(FUENTE, 34))
    casillas(150, 1110, "SPJC")
    texto(900, 1130, "HORA/TIME", f(FUENTE, 30))
    casillas(1250, 1110, "0730")
    texto(150, 1400, "18. OTROS DATOS / OTHER INFORMATION", f(FUENTE, 34))
    d.rectangle([150, 1460, W - 150, 1580], outline="black", width=3)
    texto(180, 1495, "REG FAP 329 DOF/261113 RMK/VUELO PRESIDENCIAL", f(FUENTE_B, 44))
    texto(150, 1650, "19. AUTONOMIA / ENDURANCE", f(FUENTE, 34))
    casillas(150, 1710, "E0225")
    texto(900, 1730, "PERSONAS A BORDO", f(FUENTE, 30))
    casillas(1600, 1710, "P44")
    texto(150, H - 120, "FAP 001 13-11.pdf (foto)", f(FUENTE, 28))


def dibuja_formacion(d):
    """VUELO EN FORMACIÓN (v2.9.25, ejemplo de la oficina): casillero 7
    «AVISPA + 1» (el callsign en casillas y el «+ 1» que lo sigue, como lo
    escribe el piloto), casillero 9 «02» y casillero 18 con TODAS las
    matrículas de la formación («REG/FAP123 FAP124»)."""

    def texto(x, y, s, font, fill="black"):
        d.text((x, y), s, font=font, fill=fill)

    def casillas(x, y, chars, caja=110, paso=130, tam=72, font=None):
        font = font or f(FUENTE_B, tam)
        for i, ch in enumerate(chars):
            cx = x + i * paso
            d.rectangle([cx, y, cx + caja, y + caja], outline="black", width=3)
            bb = d.textbbox((0, 0), ch, font=font)
            texto(cx + (caja - (bb[2] - bb[0])) / 2 - bb[0],
                  y + (caja - (bb[3] - bb[1])) / 2 - bb[1], ch, font)

    texto(W / 2 - 330, 120, "PLAN DE VUELO", f(FUENTE_B, 64))
    texto(W / 2 + 90, 130, "FLIGHT PLAN", f(FUENTE_B, 52))
    d.line([150, 230, W - 150, 230], fill="black", width=4)
    texto(150, 270, "3. TIPO DE MENSAJE / MESSAGE TYPE", f(FUENTE, 34))
    d.rectangle([150, 330, 260, 430], outline="black", width=3)
    texto(170, 350, "X", f(FUENTE_B, 52))
    texto(290, 350, "(FPL)", f(FUENTE, 40))
    # ── casillero 7: el CALLSIGN de la formación y su «+ 1» ──
    texto(150, 490, "7. IDENTIFICACION DE AERONAVE", f(FUENTE, 34))
    texto(150, 530, "AIRCRAFT IDENT", f(FUENTE, 30))
    texto(1250, 490, "8. REGLAS DE VUELO", f(FUENTE, 34))
    texto(1250, 530, "FLIGHT RULES", f(FUENTE, 30))
    texto(1700, 490, "TIPO DE VUELO", f(FUENTE, 34))
    texto(1700, 530, "TYPE OF FLIGHT", f(FUENTE, 30))
    casillas(150, 590, "AVISPA")
    texto(810, 600, "+ 1", f(FUENTE_B, 72))          # la guía y la aeronave que la sigue
    casillas(1250, 590, "I")
    casillas(1700, 590, "S")
    # ── casillero 9: el NÚMERO de aeronaves de la formación ──
    texto(150, 790, "9. NUMERO / NUMBER", f(FUENTE, 34))
    casillas(150, 850, "02")
    texto(480, 880, "TIPO DE AERONAVE / TYPE OF AIRCRAFT", f(FUENTE, 30))
    texto(480, 930, "B738/M", f(FUENTE_B, 44))
    # ── casillero 13 ──
    texto(150, 1050, "13. AERODROMO DE SALIDA / DEPARTURE AERODROME", f(FUENTE, 34))
    casillas(150, 1110, "SPHI")
    texto(900, 1130, "HORA/TIME", f(FUENTE, 30))
    casillas(1250, 1110, "0730")
    # ── casillero 18: las MATRÍCULAS DE TODAS las aeronaves ──
    texto(150, 1400, "18. OTROS DATOS / OTHER INFORMATION", f(FUENTE, 34))
    d.rectangle([150, 1460, W - 150, 1580], outline="black", width=3)
    texto(180, 1495, "REG/FAP123 FAP124 DOF/261115 RMK/VUELO EN FORMACION", f(FUENTE_B, 44))
    texto(150, 1650, "19. AUTONOMIA / ENDURANCE", f(FUENTE, 34))
    casillas(150, 1710, "E0230")
    texto(900, 1730, "PERSONAS A BORDO", f(FUENTE, 30))
    casillas(1600, 1710, "P08")
    texto(150, H - 120, "AVISPA + 1 - vuelo en formacion.pdf (foto)", f(FUENTE, 28))


img = Image.new("RGB", (W, H), "white")
dibuja_fap001(ImageDraw.Draw(img))
img.save("/home/z/my-project/public/tmp_e2e_fpl_foto_fap001.pdf",
         "PDF", resolution=150.0)  # página grande → render scale:2 = caracteres nítidos para el OCR
img.save("/home/z/my-project/scripts/foto_fap001_preview.png")
print("PDF de imagen generado: tmp_e2e_fpl_foto_fap001.pdf (sin capa de texto)")

img2 = Image.new("RGB", (W, H), "white")
dibuja_formacion(ImageDraw.Draw(img2))
img2.save("/home/z/my-project/public/tmp_e2e_fpl_foto_formacion.pdf",
          "PDF", resolution=150.0)
img2.save("/home/z/my-project/scripts/foto_formacion_preview.png")
print("PDF de imagen generado: tmp_e2e_fpl_foto_formacion.pdf (sin capa de texto)")
