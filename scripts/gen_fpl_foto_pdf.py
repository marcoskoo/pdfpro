#!/usr/bin/env python3
"""Fixture FOTO del FPL FAP001 (v2.9.24): PDF de SOLO IMAGEN que replica el
caso real reportado — la oficina recibe el formulario FOTOGRAFIADO (estilo
WhatsApp), la app lo carga, no hay capa de texto y el OCR de Tesseract lee
casilla por casilla: «F A P 0 0 1 I S» + «REG FAP 329» sin barra en el 18.
La etiqueta del casillero 7 no sirve de ancla (entre ella y las casillas
están «FLIGHT RULES»/«REGLAS DE VUELO»). Con v2.9.24 el campo debe salir
«FAP001 - FAP329» (vuelo del JEFE DE ESTADO + matrícula del REG)."""
from PIL import Image, ImageDraw, ImageFont

W, H = 2480, 3508  # A4 @ 300 dpi
FUENTE = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FUENTE_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)


def f(ruta, tam):
    return ImageFont.truetype(ruta, tam)


def texto(x, y, s, font, fill="black"):
    d.text((x, y), s, font=font, fill=fill)


def casillas(x, y, chars, caja=110, paso=130, tam=72, font=None):
    """Una casilla recuadrada por carácter, como el formulario impreso."""
    font = font or f(FUENTE_B, tam)
    for i, ch in enumerate(chars):
        cx = x + i * paso
        d.rectangle([cx, y, cx + caja, y + caja], outline="black", width=3)
        bb = d.textbbox((0, 0), ch, font=font)
        texto(cx + (caja - (bb[2] - bb[0])) / 2 - bb[0],
              y + (caja - (bb[3] - bb[1])) / 2 - bb[1], ch, font)


# ── cabecera ──
texto(W / 2 - 330, 120, "PLAN DE VUELO", f(FUENTE_B, 64))
texto(W / 2 + 90, 130, "FLIGHT PLAN", f(FUENTE_B, 52))
d.line([150, 230, W - 150, 230], fill="black", width=4)

# ── casillero 3: tipo de mensaje ──
texto(150, 270, "3. TIPO DE MENSAJE / MESSAGE TYPE", f(FUENTE, 34))
d.rectangle([150, 330, 260, 430], outline="black", width=3)
texto(170, 350, "X", f(FUENTE_B, 52))
texto(290, 350, "(FPL)", f(FUENTE, 40))

# ── fila del casillero 7 (etiquetas ENCIMA de las casillas, como el impreso) ──
texto(150, 490, "7. IDENTIFICACION DE AERONAVE", f(FUENTE, 34))
texto(150, 530, "AIRCRAFT IDENT", f(FUENTE, 30))
texto(1250, 490, "8. REGLAS DE VUELO", f(FUENTE, 34))
texto(1250, 530, "FLIGHT RULES", f(FUENTE, 30))
texto(1700, 490, "TIPO DE VUELO", f(FUENTE, 34))
texto(1700, 530, "TYPE OF FLIGHT", f(FUENTE, 30))
# casillas del 7: F A P 0 0 1 — y las de 8/9 en la MISMA fila visual
casillas(150, 590, "FAP001")
casillas(1250, 590, "I")
casillas(1700, 590, "S")

# ── casillero 9 ──
texto(150, 790, "9. NUMERO / NUMBER", f(FUENTE, 34))
casillas(150, 850, "106")

# ── casillero 13 ──
texto(150, 1050, "13. AERODROMO DE SALIDA / DEPARTURE AERODROME", f(FUENTE, 34))
casillas(150, 1110, "SPJC")
texto(900, 1130, "HORA/TIME", f(FUENTE, 30))
casillas(1250, 1110, "0730")

# ── casillero 18: REG SIN BARRA (la falla del piloto del caso real) ──
texto(150, 1400, "18. OTROS DATOS / OTHER INFORMATION", f(FUENTE, 34))
d.rectangle([150, 1460, W - 150, 1580], outline="black", width=3)
texto(180, 1495, "REG FAP 329 DOF/261113 RMK/VUELO PRESIDENCIAL", f(FUENTE_B, 44))

# ── casillero 19 ──
texto(150, 1650, "19. AUTONOMIA / ENDURANCE", f(FUENTE, 34))
casillas(150, 1710, "E0225")
texto(900, 1730, "PERSONAS A BORDO", f(FUENTE, 30))
casillas(1600, 1710, "P44")

# pie con el nombre del archivo del caso real
texto(150, H - 120, "FAP 001 13-11.pdf (foto)", f(FUENTE, 28))

img.save("/home/z/my-project/public/tmp_e2e_fpl_foto_fap001.pdf",
         "PDF", resolution=150.0)  # página grande → render scale:2 = caracteres nítidos para el OCR
img.save("/home/z/my-project/scripts/foto_fap001_preview.png")
print("PDF de imagen generado: tmp_e2e_fpl_foto_fap001.pdf (sin capa de texto)")
