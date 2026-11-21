#!/usr/bin/env python3
"""Genera test_cb.docx: formulario con checkbox incrustados (w:sdt w14:checkbox)
   para reproducir el bug de guardado de la app (wordSaveDocx).
   Estructura:
     P1  texto plano (dos runs, distinto formato)
     P2  «Vuelo militar [☒] SI [☐] NO» — checkbox INLINE a mitad de frase
     TBL celda A: párrafo SOLO checkbox · celda B: «Observado: [☐]»
     BLQ sdt de BLOQUE envolviendo un párrafo (robustez)
     P5  «Fin del documento»
"""
import zipfile, os

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

def sdt(checked, sid):
    """Content control checkbox estándar de Word (Developer > Check Box)."""
    glyph = '\u2612' if checked else '\u2610'   # ☒ / ☐
    val = '2612' if checked else '2610'
    ck = '1' if checked else '0'
    return (
        '<w:sdt><w:sdtPr><w:id w:val="%d"/>'
        '<w14:checkbox xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">'
        '<w14:checked w14:val="%s"/><w14:checkedVal w14:val="2612"/>'
        '<w14:uncheckedVal w14:val="2610"/></w14:checkbox></w:sdtPr>'
        '<w:sdtContent>'
        '<w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/></w:rPr>'
        '<w:t>%s</w:t></w:r>'
        '</w:sdtContent></w:sdt>' % (sid, ck, glyph)
    )

def sdt_text(sid, inner):
    """Control de contenido de TEXTO (Developer > control de texto enriquecido)."""
    return ('<w:sdt><w:sdtPr><w:id w:val="%d"/><w:alias w:val="operador"/></w:sdtPr>'
            '<w:sdtContent>%s</w:sdtContent></w:sdt>' % (sid, inner))

def run(t, b=False):
    rpr = '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/></w:rPr>' if b else \
          '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>'
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, t)

def p(inner):
    return '<w:p><w:pPr><w:spacing w:after="160"/></w:pPr>%s</w:p>' % inner

document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    '<w:document ' + W + ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">'
    '<w:body>'
    + p(run('INFORME DE VUELO ', b=True) + run('123 — control de checkbox'))
    + p(run('Vuelo militar ') + sdt(True, 1001) + run(' SI ') + sdt(False, 1002) + run(' NO'))
    + p(run('OPERADOR: ') + sdt_text(3001, run('KOO PAZ, ') + run('MARCOS', True)) + run(' — FIRMA'))
    + '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
      '<w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/>'
      '<w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/>'
      '</w:tblBorders></w:tblPr><w:tr>'
      '<w:tc><w:tcPr/><w:p>' + sdt(True, 1003) + '</w:p></w:tc>'
      '<w:tc><w:tcPr/><w:p>' + run('Observado: ') + sdt(False, 1004) + '</w:p></w:tc>'
      '</w:tr></w:tbl>'
    + '<w:sdt><w:sdtPr><w:id w:val="2001"/><w:alias w:val="bloque"/></w:sdtPr>'
      '<w:sdtContent>' + p(run('Parrafo dentro de bloque sdt')) + '</w:sdtContent></w:sdt>'
    + p(run('Fin del documento'))
    + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
    '</w:body></w:document>'
)

content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '</Types>'
)

rels_root = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    '</Relationships>'
)

styles = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    '<w:styles ' + W + '>'
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>'
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    '</w:styles>'
)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_cb.docx')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels_root)
    z.writestr('word/document.xml', document)
    z.writestr('word/styles.xml', styles)
print('OK', out)
