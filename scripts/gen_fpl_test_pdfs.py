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
        "16. AERODROMO DE DESTINO: MPDA  EET: 0235",
        "18. OTROS DATOS: DOF/261114 PBN/A1B1C1D1L1O1S2T1",
        "19. AUTONOMIA: E/0436  PERSONAS A BORDO: P/191",
    ]:
        c.drawString(50, y, ln)
        y -= 20
    c.save()

for name, fn in [
    ("tmp_e2e_fpl_telex.pdf", pdf_telex),
    ("tmp_e2e_fpl_form.pdf", pdf_form),
    ("tmp_e2e_oficio.pdf", pdf_oficio),
    ("tmp_e2e_fpl_sin_matricula.pdf", pdf_sin_matricula),
]:
    p = os.path.join(BASE, name)
    fn(p)
    print(name, os.path.getsize(p), "bytes")
print("OK")
