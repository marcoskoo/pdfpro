#!/usr/bin/env python3
"""Genera un .docx de prueba estilo FPL (párrafos + tabla) para el e2e de sellos v2.9.8."""
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

st = doc.styles['Normal']
st.font.name = 'Calibri'
st.font.size = Pt(10)

h = doc.add_paragraph()
h.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = h.add_run('PLAN DE VUELO')
r.bold = True
r.font.size = Pt(13)
h2 = doc.add_paragraph()
h2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = h2.add_run('FLIGHT PLAN')
r2.bold = True
r2.font.size = Pt(11)

doc.add_paragraph('FPL (Ficha de plan de vuelo) — documento de prueba para verificar la incrustación de sellos al guardar .docx (v2.9.8).')
doc.add_paragraph('Instructions: coloca el sello de recepción y un sello personal sobre este documento, guarda y verifica que ambos queden incrustados como imágenes en el archivo .docx resultante.')

doc.add_paragraph('CAMPO 7: Indicativos de aeronave y modalidad')
tbl = doc.add_table(rows=8, cols=2)
tbl.style = 'Table Grid'
rows = [
    ('Aeronave / Aircraft', 'CM468'),
    ('Tipo de aeronave / Type', 'B738'),
    ('Aeródromo de salida / Dep', 'SPJC'),
    ('EET (tiempo estimado total)', '0245'),
    ('Velocidad / Speed', 'N0450'),
    ('Nivel / Level', 'F350'),
    ('Aeródromo de destino / Dest', 'SPZO'),
    ('Observaciones / Remarks', 'RMK/ TEST FLIGHT CORPAC AIS ARO'),
]
for i, (k, v) in enumerate(rows):
    tbl.rows[i].cells[0].text = k
    tbl.rows[i].cells[1].text = v

doc.add_paragraph('Firma del responsable — AIS/ARO CORPAC S.A.')
doc.add_paragraph('Zona de sello (coloca aquí el sello de recepción):')
doc.add_paragraph('Fin del documento de prueba.')

out = '/home/z/my-project/scripts/e2e298/FPL-prueba.docx'
doc.save(out)
print('OK', out)
