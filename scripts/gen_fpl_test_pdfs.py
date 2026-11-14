#!/usr/bin/env python3
"""Genera los PDF de prueba para el E2E del escáner FPL (v2.9.15).
Salidas en /home/z/my-project/public/ para que el dev server los sirva:
  - tmp_e2e_fpl_telex.pdf   → mensaje télex: callsign en campo 7 + REG/OB1630 en el 18
  - tmp_e2e_fpl_form.pdf    → formulario impreso: etiqueta casillero 7 con OB-2147
  - tmp_e2e_oficio.pdf      → documento administrativo SIN matrícula (control negativo)
"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os

BASE = "/home/z/my-project/public"

def pdf_telex(path):
    c = canvas.Canvas(path, pagesize=A4)
    y = 800
    c.setFont("Courier-Bold", 11)
    for ln in [
        "CORPAC S.A. - AIS/ARO SPHI - CHICLAYO",
        "MENSAJE RECIBIDO POR DEP",
        "",
        "FPL",
        "(FPL-FAP211-IS",
        "-B738/M-SDFGLRTU",
        "-SPHI0730 -N0450F180 DCT SQU DCT",
        "-SPJC0230 SPJC",
        "-18/REG/OB1630 SEL/ABCD DOF/261114 0/JETA1",
        "-E/0230 P/TBN R/VE U/E)",
    ]:
        c.drawString(50, y, ln)
        y -= 16
    c.save()

def pdf_form(path):
    c = canvas.Canvas(path, pagesize=A4)
    y = 800
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "PLAN DE VUELO PRESENTADO (FPL)"); y -= 30
    c.setFont("Helvetica", 10)
    for ln in [
        "7. IDENTIFICACIÓN DE AERONAVE: OB-2147",
        "8. REGLAS DE VUELO: I   9. TIPO DE VUELO: S",
        "10. EQUIPO: SDFGLRTU",
        "13. AERÓDROMO DE SALIDA: SPHI  HORA: 0730",
        "16. AERÓDROMO DE DESTINO: SPJC  EET: 0230",
        "18. OTRA INFORMACIÓN: DOF/261114 SEL/ABCD",
    ]:
        c.drawString(50, y, ln)
        y -= 20
    c.save()

def pdf_oficio(path):
    c = canvas.Canvas(path, pagesize=A4)
    c.setFont("Helvetica", 11)
    y = 800
    for ln in [
        "OFICIO MULTIPLE N. 214-2026-CORPAC",
        "Asunto: Cuadro de programacion de personal del turno",
        "Se adjunta el cuadro de guardias de la semana para su conocimiento.",
        "Atentamente,",
        "Jefatura AIS/ARO",
    ]:
        c.drawString(50, y, ln)
        y -= 22
    c.save()

def pdf_sin_matricula(path):
    """FPL de formulario con el casillero 7 SIN valor (ni REG/ en el 18):
    v2.9.17 → aviso «FPL sin matrícula reconocida» y campo vacío."""
    c = canvas.Canvas(path, pagesize=A4)
    y = 800
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "PLAN DE VUELO (FORMULARIO DE LA OPERADORA)"); y -= 30
    c.setFont("Helvetica", 10)
    for ln in [
        "3. TIPO DE MENSAJE: FPL",
        "7. IDENTIFICACION DE AERONAVE:",
        "8. REGLAS DE VUELO: I    9. TIPO DE VUELO: S",
        "13. AERODROMO DE SALIDA: SPJC  HORA: 1120",
        "15. VELOCIDAD: N0440  NIVEL: F380  RUTA: DCT SQU UL780",
        "16. AERÓDROMO DE DESTINO: MPDA  EET: 0235",
        "18. OTROS DATOS: DOF/261114 PBN/A1B1C1D1L1O1S2T1",
        "19. AUTONOMIA: E/0436  PERSONAS A BORDO: P/191",
    ]:
        c.drawString(50, y, ln)
        y -= 20
    c.save()


# ══ v2.9.21 — RÉPLICA FIEL DE LA PLANTILLA REAL (ATC CM468 / FlightPlan
# SPHI-SPST): formulario bilingüe con UNA CASILLA POR CARÁCTER, dibujado con
# las coordenadas EXACTAS del PDF real y en el MISMO ORDEN REVUELTO del
# content stream (dígitos del identificador primero, luego las casillas del
# 8, luego las letras). El escáner debe reconstruir la fila por geometría. ══

def _plantilla(c, casillero7, casillero8, reg18):
    """casillero7 = dict {letra: x} en la fila y=678.2 (y=676.9 dígitos);
    casillero8 = [(letra,x)]; reg18 = texto del 18 (con o sin REG/)."""
    c.setFont("Helvetica-Bold", 9)
    c.drawString(262.1, 810.3, "PLAN DE VUELO")
    c.setFont("Helvetica", 7.6)
    c.drawString(276.4, 799.7, "Flight Plan")
    c.drawString(34.3, 784.0, "Priority")
    c.drawString(62.5, 776.1, "FF")
    c.drawString(164.8, 716.6, "IDENTIFICACION EXACTA DEL (DE LOS) DESTINATÁRIO (S) Y/O REMITENTE")
    c.drawString(210.5, 707.1, "Specific Identification of Addresse(s) and/or Originator")
    # ── fila del casillero 7 (y≈698) ──
    c.drawString(33.4, 697.9, "3.")
    c.drawString(59.1, 698.0, "TIPO DE MENSAGE")
    c.drawString(148.7, 698.1, "7.")
    c.drawString(164.2, 698.0, "IDENTIFICACION DE AERONAVE")
    c.drawString(292.0, 698.4, "8.")
    c.drawString(297.8, 698.1, "REGLAS DE VUELO")
    c.drawString(368.3, 698.0, "TIPO DE VUELO")
    # ── subtítulos ingleses (y≈688.5) — «Flight Rules» es la trampa del bug ──
    c.drawString(74.5, 688.5, "Message Type")
    c.drawString(191.8, 688.5, "Aircraft Identification")
    c.drawString(310.9, 688.5, "Flight Rules")
    c.drawString(368.3, 688.5, "Type of Flight")
    # ── ORDEN REVUELTO como el original: casillero 3, dígitos del 7, casillas
    #    del 8 y AL FINAL las letras del 7 ──
    c.setFont("Helvetica", 7.6)
    c.drawString(62.5, 678.2, "FPL")
    c.setFont("Helvetica-Bold", 10)
    digitos = [(x, ch) for ch, x in casillero7.items() if ch.isdigit()]
    letras7 = [(x, ch) for ch, x in casillero7.items() if not ch.isdigit()]
    for x, ch in digitos:                       # 1.º los dígitos (y=676.9)
        c.drawString(x, 676.9, ch)
    for ch, x in casillero8:                    # 2.º el casillero 8 (más a la derecha)
        c.drawString(x, 678.2, ch)
    for x, ch in letras7:                       # 3.º las letras del 7 (y=678.2)
        c.drawString(x, 678.2, ch)
    # ── sección 9 ──
    c.setFont("Helvetica", 7.6)
    c.drawString(33.4, 668.6, "9.")
    c.drawString(61.0, 668.7, "NÚMERO")
    c.drawString(122.4, 668.7, "TIPO DE AERONAVE")
    c.drawString(205.8, 669.7, "CAT. DE ESTELA TURBULENTA")
    c.drawString(320.3, 669.5, "10.")
    c.drawString(326.9, 668.7, "EQUIPO")
    c.drawString(224.1, 666.7, "1")
    c.drawString(236.6, 666.7, "0")
    c.drawString(247.0, 666.7, "6")
    c.drawString(134.2, 660.9, "Type of Aircraft")
    # ── sección 13 ──
    c.drawString(50.0, 620.0, "HORA 13. AERODROMO DE SALIDA")
    c.drawString(190.0, 620.0, "Time Departure Aerodrome")
    for i, ch in enumerate("SPHI0730"):
        c.setFont("Helvetica-Bold", 10)
        c.drawString(150.0 + i * 14.0, 598.0, ch)
    # ── sección 16 ──
    c.setFont("Helvetica", 7.6)
    c.drawString(50.0, 560.0, "16. AERÓDROMO DE DESTINO")
    c.drawString(150.0, 560.0, "Detination Aerodrome")
    for i, ch in enumerate("SPST0055"):
        c.setFont("Helvetica-Bold", 10)
        c.drawString(150.0 + i * 14.0, 538.0, ch)
    # ── sección 18 ──
    c.setFont("Helvetica", 7.6)
    c.drawString(50.0, 500.0, "18. OTROS DATOS")
    c.drawString(150.0, 500.0, "Other Informations")
    c.setFont("Helvetica", 8)
    c.drawString(50.0, 488.0, reg18)
    # ── sección 19 ──
    c.setFont("Helvetica", 7.6)
    c.drawString(50.0, 450.0, "19. AUTONOMIA Endurance")
    c.drawString(50.0, 438.0, "PILOTO AL MANDO / Pilot in Command")
    c.setFont("Helvetica", 8)
    c.drawString(50.0, 426.0, "KOO PAZ MARCOS ROBERTO")
    c.save()


def pdf_sphi_spst(path):
    """GA real «FlightPlan SPHI-SPST.pdf»: OB1630 en el casillero 7 (una
    casilla por carácter), SIN REG/ en el 18 (Doc 4444: no hace falta).
    v2.9.21 → debe salir OB1630 del casillero 7, no «FLIGHT»/«FLIGT»."""
    c = canvas.Canvas(path, pagesize=A4)
    _plantilla(c,
               casillero7={"O": 153.1, "B": 169.8, "1": 187.3, "6": 218.8, "3": 232.7, "0": 249.5},
               casillero8=[("V", 316.4), ("G", 393.9)],
               reg18="DOF/261114 EET/0055 RMK/VUELO DE TRASLADO DE AERONAVE")
    # nombre de archivo del caso real
    c.setFont("Helvetica", 6)
    c.drawString(50, 30, "FlightPlan SPHI-SPST.pdf")


def pdf_form_casillas(path):
    """Aerolínea estilo CM468: callsign CMP468 en las casillas del 7 (orden
    interno revuelto) + REG/HP1520 en el 18 → matrícula HP1520, vuelo CMP468."""
    c = canvas.Canvas(path, pagesize=A4)
    _plantilla(c,
               casillero7={"C": 153.1, "M": 169.8, "P": 187.3, "4": 218.8, "6": 232.7, "8": 249.5},
               casillero8=[("I", 316.4), ("S", 393.9)],
               reg18="PBN/A1B1C1D1L1O1S2T1 NAV/RNP2 DOF/261111 REG/HP1520 SEL/MPJR OPR/CMP PER/C RMK/TCAS")



for name, fn in [
    ("tmp_e2e_fpl_telex.pdf", pdf_telex),
    ("tmp_e2e_fpl_form.pdf", pdf_form),
    ("tmp_e2e_oficio.pdf", pdf_oficio),
    ("tmp_e2e_fpl_sin_matricula.pdf", pdf_sin_matricula),
    ("tmp_e2e_fpl_sphi_spst.pdf", pdf_sphi_spst),
    ("tmp_e2e_fpl_form_casillas.pdf", pdf_form_casillas),
]:
    p = os.path.join(BASE, name)
    fn(p)
    print(name, os.path.getsize(p), "bytes")
print("OK")
