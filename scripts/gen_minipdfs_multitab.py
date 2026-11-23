#!/usr/bin/env python3
"""PDFs mínimos para el e2e multi-pestaña de la hora de recepción.
Genera /tmp/www/fpl_a1..a5.pdf y fpl_b1..b3.pdf y el symlink
/tmp/www/pdfpro → web/ (servidor de pruebas en :3000)."""
import os

def make_pdf(path, text):
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
        b'/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    ]
    content = b'BT /F1 24 Tf 72 720 Td (' + text.encode() + b') Tj ET'
    objs.append(b'<< /Length ' + str(len(content)).encode() + b' >>\nstream\n' + content + b'\nendstream')
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    out = b'%PDF-1.4\n'
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += str(i).encode() + b' 0 obj\n' + o + b'\nendobj\n'
    xref = len(out)
    out += b'xref\n0 ' + str(len(objs) + 1).encode() + b'\n0000000000 65535 f \n'
    for off in offsets:
        out += ('%010d 00000 n \n' % off).encode()
    out += (b'trailer\n<< /Size ' + str(len(objs) + 1).encode() +
            b' /Root 1 0 R >>\nstartxref\n' + str(xref).encode() + b'\n%%EOF')
    with open(path, 'wb') as f:
        f.write(out)

os.makedirs('/tmp/www', exist_ok=True)
try:
    os.symlink('/home/z/my-project/web', '/tmp/www/pdfpro')
except FileExistsError:
    pass
for n in ['fpl_a1', 'fpl_a2', 'fpl_a3', 'fpl_a4', 'fpl_a5', 'fpl_b1', 'fpl_b2', 'fpl_b3',
          'fpl_c1', 'fpl_c2', 'fpl_c3', 'fpl_c4', 'fpl_c5']:
    make_pdf('/tmp/www/%s.pdf' % n, 'PRUEBA %s' % n.upper())
print('OK: 8 PDFs en /tmp/www + symlink pdfpro->web')
